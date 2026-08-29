/**
 * Date and Timezone Utilities for Finance Quest
 * Ensures accurate day calculations for Brazil (America/Sao_Paulo) or user-defined timezones.
 */

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Returns current date formatted as YYYY-MM-DD in the specified timezone.
 */
export function getLocalDateString(date: Date = new Date(), timeZone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Output format is YYYY-MM-DD
}

/**
 * Extracts month (1-12) and year for a given local date string (YYYY-MM-DD).
 */
export function parseYearMonth(dateString: string): { year: number; month: number; day: number } {
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
    day: parseInt(dayStr, 10),
  };
}

/**
 * Returns total days in a given month and year.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates calendar day difference between two YYYY-MM-DD strings.
 */
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(`${dateStr1}T00:00:00Z`);
  const d2 = new Date(`${dateStr2}T00:00:00Z`);
  const diffMs = d1.getTime() - d2.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formats currency in BRL or specified currency.
 */
export function formatCurrency(amount: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
}
