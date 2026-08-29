import type { ParsedExpense } from '@/types/telegram';
import type { HPCalculationResult } from '@/types/gamification';
import { formatCurrency } from '@/lib/utils/date-utils';

/**
 * Escapes reserved Markdown v1 / entities characters for Telegram Bot API.
 * Prevents HTTP 400 Bad Request when users include special characters in descriptions.
 */
export function escapeTelegramMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

/**
 * Formats a celebratory and informative Telegram markdown response after recording a transaction.
 */
export function formatTelegramSuccessMessage(params: {
  expense: ParsedExpense;
  hpResult: HPCalculationResult;
  streak: number;
  xpEarned: number;
}): string {
  const { expense, hpResult, streak, xpEarned } = params;

  const moodEmojis: Record<string, string> = {
    ZEN: '🟢 Finny está Zen e orgulhoso! (100% HP)',
    NEUTRAL: '🟡 Finny está atento ao orçamento.',
    WARNING: '🟠 Finny está em alerta! Reduza os gastos variáveis.',
    PANIC: '🔴 SOCORRO! Finny está em K.O.!',
  };

  const hpBarFill = Math.max(0, Math.min(10, Math.round(hpResult.hp / 10)));
  const hpBar = '🟩'.repeat(hpBarFill) + '⬛'.repeat(10 - hpBarFill);

  const fixedTag = expense.isFixed ? ' *(Gasto Fixo)*' : ' *(Gasto Variável)*';
  const safeCategoryName = escapeTelegramMarkdown(expense.matchedCategoryName || 'Geral');
  const safeDescription = escapeTelegramMarkdown(expense.description || '');

  return `
✨ *Registro Confirmado no Finance Quest!*

💸 *Valor:* ${formatCurrency(expense.amount)}
🏷️ *Categoria:* ${expense.matchedCategoryIcon || '📦'} ${safeCategoryName}${fixedTag}
📝 *Descrição:* ${safeDescription}

━━━━━━━━━━━━━━━━━━━━
❤️ *HP Financeiro:* ${hpResult.hp}/100
[${hpBar}]
${moodEmojis[hpResult.mood] || ''}

🔥 *Streak:* ${streak} dias consecutivos
⭐ *XP Ganho:* +${xpEarned} XP
━━━━━━━━━━━━━━━━━━━━
`.trim();
}

/**
 * Dispatches a message to Telegram Bot API with error handling and fallback parsing.
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      // Fallback without parse_mode if entity formatting error occurs
      const retryResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.replace(/[*_`\\[\]()]/g, ''),
        }),
      });
      return retryResponse.ok;
    }

    return response.ok;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}
