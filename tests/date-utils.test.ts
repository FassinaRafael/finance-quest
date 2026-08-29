import { describe, it, expect } from 'vitest';
import {
  getLocalDateString,
  getDaysDifference,
  parseYearMonth,
  getDaysInMonth,
} from '@/lib/utils/date-utils';

describe('date-utils (Timezone & Calendar)', () => {
  it('should correctly format date in America/Sao_Paulo timezone even at late UTC hours', () => {
    // 2026-08-28T01:30:00Z is 2026-08-27 at 22:30 in Brazil (UTC-3)
    const lateNightBrt = new Date('2026-08-28T01:30:00Z');
    const localDateStr = getLocalDateString(lateNightBrt, 'America/Sao_Paulo');

    expect(localDateStr).toBe('2026-08-27');
  });

  it('should calculate calendar day difference correctly', () => {
    expect(getDaysDifference('2026-08-28', '2026-08-27')).toBe(1);
    expect(getDaysDifference('2026-08-27', '2026-08-27')).toBe(0);
    expect(getDaysDifference('2026-09-01', '2026-08-31')).toBe(1);
    expect(getDaysDifference('2026-08-30', '2026-08-27')).toBe(3);
  });

  it('should correctly parse year, month, and day', () => {
    const parsed = parseYearMonth('2026-08-27');
    expect(parsed).toEqual({ year: 2026, month: 8, day: 27 });
  });

  it('should return correct number of days in months', () => {
    expect(getDaysInMonth(2026, 2)).toBe(28); // Feb 2026 non-leap
    expect(getDaysInMonth(2024, 2)).toBe(29); // Feb 2024 leap
    expect(getDaysInMonth(2026, 8)).toBe(31); // August
  });
});
