import { NextRequest, NextResponse } from 'next/server';
import { parseExpenseText } from '@/lib/telegram/parser';
import { formatTelegramSuccessMessage, sendTelegramMessage } from '@/lib/telegram/client';
import { transcribeAudioBuffer } from '@/lib/voice/transcriber';
import { DEFAULT_CATEGORIES } from '@/lib/storage/default-data';
import { calculateHealthPoints } from '@/lib/gamification/hp-engine';
import { updateStreak } from '@/lib/gamification/streak-service';
import { parseYearMonth, getDaysInMonth, getLocalDateString } from '@/lib/utils/date-utils';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { TelegramWebhookUpdate } from '@/types/telegram';
import type { Category } from '@/types/database';

/**
 * Resilient & Secure Next.js Route Handler for Telegram Bot Webhook.
 * Validates secret token and guarantees quick HTTP 200 response to prevent retry storms.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validate Webhook Secret Token (if configured in environment)
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expectedSecret && secretHeader !== expectedSecret) {
      console.warn('Unauthorized Telegram Webhook attempt: invalid secret token.');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const update = (await req.json()) as TelegramWebhookUpdate;
    const message = update?.message;

    if (!message || !message.chat) {
      return NextResponse.json({ ok: true, note: 'No message in update' });
    }

    const chatId = message.chat.id;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // 2. Validate Allowed Chat IDs (if configured to restrict access to owner)
    const allowedChatIdsStr = process.env.TELEGRAM_ALLOWED_CHAT_IDS;
    if (allowedChatIdsStr) {
      const allowedChatIds = allowedChatIdsStr.split(',').map((id) => parseInt(id.trim(), 10));
      if (!allowedChatIds.includes(chatId)) {
        console.warn(`Unauthorized chat attempt from chat ID: ${chatId}`);
        if (botToken) {
          await sendTelegramMessage(
            botToken,
            chatId,
            '🔒 Este bot é de uso pessoal e privado para o proprietário do Finance Quest.'
          );
        }
        return NextResponse.json({ ok: true, note: 'Unauthorized user chat' });
      }
    }

    let textToParse = message.text;

    // 3. Handle Voice Message if present
    if (message.voice && botToken) {
      try {
        const fileId = message.voice.file_id;
        const fileInfoRes = await fetch(
          `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
        );
        if (fileInfoRes.ok) {
          const fileInfo = (await fileInfoRes.json()) as { result?: { file_path?: string } };
          const filePath = fileInfo.result?.file_path;
          if (filePath) {
            const audioDownloadRes = await fetch(
              `https://api.telegram.org/file/bot${botToken}/${filePath}`
            );
            if (audioDownloadRes.ok) {
              const audioBuffer = Buffer.from(await audioDownloadRes.arrayBuffer());
              const transcript = await transcribeAudioBuffer(audioBuffer);
              if (transcript) {
                textToParse = transcript;
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to process Telegram voice:', err);
      }
    }

    if (!textToParse) {
      return NextResponse.json({ ok: true, note: 'No text or voice to parse' });
    }

    // 4. Fetch dynamic categories from Supabase (fallback to defaults)
    let categories: Category[] = DEFAULT_CATEGORIES;
    try {
      const { data: dbCategories } = await supabaseAdmin.from('categories').select('*');
      if (dbCategories && dbCategories.length > 0) {
        categories = dbCategories.map((c) => ({
          id: c.id,
          userId: c.user_id || null,
          name: c.name,
          icon: c.icon,
          color: c.color,
          type: (c.type as 'EXPENSE' | 'INCOME') || 'EXPENSE',
          isFixedCost: c.is_fixed_cost ?? false,
          isUnclassifiedFallback: c.is_unclassified_fallback ?? false,
          aliases: c.aliases || [],
          createdAt: c.created_at || new Date().toISOString(),
        }));
      }
    } catch {
      // Keep default categories if Supabase is offline
    }

    // 5. Parse expense using natural language engine
    const parsed = parseExpenseText(textToParse, categories);

    if (!parsed) {
      if (botToken) {
        await sendTelegramMessage(
          botToken,
          chatId,
          '⚠️ *Finance Quest:* Não consegui entender o valor. Envie algo como `35 almoço` ou `150 internet fixo`.'
        );
      }
      return NextResponse.json({ ok: true, parsed: null });
    }

    // 6. Identify Profile
    const today = getLocalDateString();
    const dateParts = parseYearMonth(today);
    const totalDays = getDaysInMonth(dateParts.year, dateParts.month);

    let userId: string | null = null;
    let monthlyIncome = 5000;
    let variableLimit = 2200;
    let currentHp = 100;
    let currentStreak = 0;
    let maxStreak = 0;
    let lastActivityDate: string | null = null;
    let totalXp = 0;

    try {
      // Query profile matching telegram_chat_id or fallback to first available profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .or(`telegram_chat_id.eq.${chatId},id.neq.00000000-0000-0000-0000-000000000000`)
        .limit(1)
        .maybeSingle();

      if (profile) {
        userId = profile.id;
        monthlyIncome = Number(profile.monthly_income) || monthlyIncome;

        // Fetch monthly budget if available
        const { data: budget } = await supabaseAdmin
          .from('budgets')
          .select('amount_limit')
          .is('category_id', null)
          .eq('user_id', profile.id)
          .maybeSingle();

        if (budget) {
          variableLimit = Number(budget.amount_limit) || variableLimit;
        }

        // Fetch current gamification state
        const { data: gameState } = await supabaseAdmin
          .from('gamification_state')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (gameState) {
          currentHp = gameState.current_hp ?? 100;
          currentStreak = gameState.current_streak ?? 0;
          totalXp = gameState.total_xp ?? 0;
          maxStreak = gameState.max_streak ?? 0;
          lastActivityDate = gameState.last_activity_date ?? null;
        }
      }
    } catch (err) {
      console.warn('Could not query Supabase profile:', err);
    }

    // 7. Persist transaction into Supabase if userId found
    if (userId) {
      try {
        await supabaseAdmin.from('transactions').insert({
          id: crypto.randomUUID(),
          user_id: userId,
          category_id: parsed.matchedCategoryId || 'cat-other',
          amount: parsed.amount,
          description: parsed.description,
          is_fixed: parsed.isFixed,
          type: parsed.type,
          source: 'TELEGRAM',
          transaction_date: today,
        });
      } catch (dbErr) {
        console.error('Failed to insert transaction to Supabase:', dbErr);
      }
    }

    // 8. Calculate updated gamification state & streaks
    const streakResult = updateStreak(currentStreak, maxStreak, lastActivityDate, today);

    const hpResult = calculateHealthPoints({
      monthlyIncome,
      variableBudgetLimit: variableLimit,
      totalFixedSpent: parsed.isFixed ? parsed.amount : 0,
      totalVariableSpent: !parsed.isFixed ? parsed.amount : 0,
      currentDayOfMonth: dateParts.day,
      totalDaysInMonth: totalDays,
      currentHp,
    });

    const xpEarned = 25 + streakResult.xpEarned;
    const nextXp = totalXp + xpEarned;

    // 9. Update gamification state in Supabase
    if (userId) {
      try {
        await supabaseAdmin.from('gamification_state').upsert({
          user_id: userId,
          current_hp: hpResult.hp,
          total_xp: nextXp,
          current_streak: streakResult.currentStreak,
          max_streak: streakResult.maxStreak,
          last_activity_date: today,
          updated_at: new Date().toISOString(),
        });
      } catch (gameErr) {
        console.warn('Could not update gamification_state in Supabase:', gameErr);
      }
    }

    // 10. Reply on Telegram
    if (botToken) {
      const replyMessage = formatTelegramSuccessMessage({
        expense: parsed,
        hpResult,
        streak: streakResult.currentStreak,
        xpEarned,
      });

      await sendTelegramMessage(botToken, chatId, replyMessage);
    }

    return NextResponse.json({
      ok: true,
      parsed,
      hpResult,
    });
  } catch (error) {
    console.error('Telegram webhook handler error:', error);
    return NextResponse.json({ ok: true, error: 'Internal handled' });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Finance Quest Telegram Webhook Endpoint',
    time: new Date().toISOString(),
  });
}
