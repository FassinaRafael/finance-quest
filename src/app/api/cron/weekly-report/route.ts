import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendTelegramMessage, formatWeeklyReportMessage, escapeTelegramMarkdown } from '@/lib/telegram/client';
import { calculateMonthEndProjection } from '@/lib/insights/projection';
import { DEFAULT_CATEGORIES } from '@/lib/storage/default-data';
import { formatCurrency, getDaysInMonth, parseYearMonth } from '@/lib/utils/date-utils';
import type { Category, Budget, Transaction } from '@/types/database';

/**
 * Scheduled Route Handler for Vercel Cron: Automated Weekly Finny Chronicle.
 * Runs every Sunday to summarize weekly performance and overspend forecasts.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verify Authorization (Vercel Cron Header)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized Cron trigger attempt.');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ ok: false, error: 'Missing TELEGRAM_BOT_TOKEN' }, { status: 500 });
    }

    // 2. Fetch all profiles with linked Telegram Chat ID
    const { data: profiles, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .not('telegram_chat_id', 'is', null);

    if (profileErr || !profiles || profiles.length === 0) {
      return NextResponse.json({ ok: true, message: 'No profiles with Telegram linked.' });
    }

    // 3. Fetch global categories
    let categories: Category[] = DEFAULT_CATEGORIES;
    const { data: dbCats } = await supabaseAdmin.from('categories').select('*');
    if (dbCats && dbCats.length > 0) {
      categories = dbCats.map((c) => ({
        id: c.id,
        userId: c.user_id || null,
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: c.type || 'EXPENSE',
        isFixedCost: Boolean(c.is_fixed_cost),
        isUnclassifiedFallback: Boolean(c.is_unclassified_fallback),
        aliases: c.aliases || [],
        createdAt: c.created_at || new Date().toISOString(),
      }));
    }

    // 4. Calculate Date Ranges (Current Week: Mon-Sun, Previous Week: Mon-Sun)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...

    // Last 7 days (current week ending today)
    const currentWeekEnd = new Date(now);
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - 6);

    // Prior 7 days (previous week)
    const prevWeekEnd = new Date(currentWeekStart);
    prevWeekEnd.setDate(currentWeekStart.getDate() - 1);
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekEnd.getDate() - 6);

    const formatDateIso = (d: Date) => d.toISOString().slice(0, 10);
    const formatDateBr = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    const currentStartIso = formatDateIso(currentWeekStart);
    const currentEndIso = formatDateIso(currentWeekEnd);
    const prevStartIso = formatDateIso(prevWeekStart);
    const prevEndIso = formatDateIso(prevWeekEnd);

    const currentPeriodLabel = `${formatDateBr(currentWeekStart)} a ${formatDateBr(currentWeekEnd)}`;

    const results: Array<{ userId: string; chatId: number; delivered: boolean }> = [];

    // 5. Process and dispatch weekly report per user
    for (const profile of profiles) {
      const chatId = Number(profile.telegram_chat_id);
      if (!chatId) continue;

      try {
        // A. Fetch Gamification State
        const { data: gameState } = await supabaseAdmin
          .from('gamification_state')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();

        const currentHp = gameState?.current_hp ?? 100;
        const currentStreak = gameState?.current_streak ?? 0;
        const totalXp = gameState?.total_xp ?? 0;

        // B. Fetch Current Week Transactions
        const { data: currentTxs } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('user_id', profile.id)
          .gte('transaction_date', currentStartIso)
          .lte('transaction_date', currentEndIso);

        const currentExpenses = (currentTxs || []).filter((t) => t.type === 'EXPENSE');
        const weeklyTotalSpent = currentExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);

        // C. Fetch Previous Week Transactions
        const { data: prevTxs } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('user_id', profile.id)
          .gte('transaction_date', prevStartIso)
          .lte('transaction_date', prevEndIso);

        const prevExpenses = (prevTxs || []).filter((t) => t.type === 'EXPENSE');
        const previousWeekTotalSpent = prevExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);

        // D. Top 3 Categories
        const catSpentMap = new Map<string, number>();
        currentExpenses.forEach((t) => {
          const catId = t.category_id || 'cat-other';
          catSpentMap.set(catId, (catSpentMap.get(catId) || 0) + Number(t.amount || 0));
        });

        const topCategories = Array.from(catSpentMap.entries())
          .map(([catId, amount]) => {
            const cat = categories.find((c) => c.id === catId);
            const percentage = weeklyTotalSpent > 0 ? (amount / weeklyTotalSpent) * 100 : 0;
            return {
              name: cat?.name || 'Geral',
              icon: cat?.icon || '📦',
              amount,
              percentage,
            };
          })
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3);

        // E. Month-End Projections & Alerts
        const dateParts = parseYearMonth(currentEndIso);
        const totalDays = getDaysInMonth(dateParts.year, dateParts.month);

        const { data: allMonthTxs } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('user_id', profile.id)
          .gte('transaction_date', `${dateParts.year}-${String(dateParts.month).padStart(2, '0')}-01`);

        const { data: budgets } = await supabaseAdmin
          .from('budgets')
          .select('*')
          .eq('user_id', profile.id);

        const varBudget = budgets?.find((b) => !b.category_id)?.amount_limit || 2200;

        const projectionSummary = calculateMonthEndProjection({
          transactions: (allMonthTxs || []).map((t) => ({
            id: t.id,
            userId: t.user_id,
            categoryId: t.category_id,
            amount: Number(t.amount),
            type: t.type,
            description: t.description,
            isFixed: Boolean(t.is_fixed),
            source: t.source || 'APP',
            transactionDate: t.transaction_date,
            createdAt: t.created_at,
          })),
          categories,
          budgets: (budgets || []).map((b) => ({
            id: b.id,
            userId: b.user_id,
            categoryId: b.category_id,
            amountLimit: Number(b.amount_limit),
            month: b.month,
            year: b.year,
            createdAt: b.created_at,
          })),
          currentDayOfMonth: dateParts.day,
          totalDaysInMonth: totalDays,
          targetMonth: dateParts.month,
          targetYear: dateParts.year,
          overallVariableBudgetLimit: Number(varBudget),
        });

        const atRiskAlerts: string[] = [];
        projectionSummary.atRiskCategories.forEach((cat) => {
          if (cat.status === 'EXCEEDED') {
            atRiskAlerts.push(`• 🚨 *${escapeTelegramMarkdown(cat.categoryName)}:* Orçamento já esgotado (${formatCurrency(cat.currentSpent)} / ${formatCurrency(cat.budgetLimit)})`);
          } else if (cat.status === 'DANGER' || cat.status === 'WARNING') {
            const dayMsg = cat.daysUntilDepleted !== null ? `estoura em *${cat.daysUntilDepleted} dias*` : 'risco de estouro';
            atRiskAlerts.push(`• ⚠️ *${escapeTelegramMarkdown(cat.categoryName)}:* ${dayMsg} (Projeção: ${formatCurrency(cat.projectedMonthEnd)})`);
          }
        });

        // F. Format & Send Report Message
        const message = formatWeeklyReportMessage({
          userName: profile.display_name || 'Aventureiro',
          startDate: formatDateBr(currentWeekStart),
          endDate: formatDateBr(currentWeekEnd),
          currentHp,
          hpVariation: currentHp >= 90 ? 0 : -5,
          currentStreak,
          weeklyXp: Math.min(250, currentExpenses.length * 25 + currentStreak * 10),
          weeklyTotalSpent,
          previousWeekTotalSpent,
          topCategories,
          atRiskAlerts,
        });

        const delivered = await sendTelegramMessage(botToken, chatId, message);
        results.push({ userId: profile.id, chatId, delivered });
      } catch (err) {
        console.error(`Failed to send weekly report to user ${profile.id}:`, err);
        results.push({ userId: profile.id, chatId, delivered: false });
      }
    }

    return NextResponse.json({
      ok: true,
      period: currentPeriodLabel,
      dispatchedCount: results.length,
      results,
    });
  } catch (error) {
    console.error('Weekly cron handler error:', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
