import { describe, it, expect } from 'vitest';
import {
  calculateHealthPoints,
  getMascotMood,
  getLevelInfo,
} from '@/lib/gamification/hp-engine';

describe('hp-engine (Gamification & HP Calculation)', () => {
  it('should protect early month spending (Day 1-5 grace buffer)', () => {
    // Budget: 2000, Day 1, Spent: 150 (grocery on day 1)
    const result = calculateHealthPoints({
      monthlyIncome: 5000,
      variableBudgetLimit: 2000,
      totalFixedSpent: 1800, // Fixed bills paid on day 1
      totalVariableSpent: 150,
      currentDayOfMonth: 1,
      totalDaysInMonth: 30,
      currentHp: 100,
    });

    expect(result.isInGracePeriod).toBe(true);
    expect(result.hp).toBe(100);
    expect(result.mood).toBe('ZEN');
  });

  it('should not drain HP when variable spending is under expected daily pace', () => {
    // Budget: 3000, Day 15 (halfway), Spent: 1200 (expected is 1500)
    const result = calculateHealthPoints({
      monthlyIncome: 6000,
      variableBudgetLimit: 3000,
      totalFixedSpent: 2000,
      totalVariableSpent: 1200,
      currentDayOfMonth: 15,
      totalDaysInMonth: 30,
      currentHp: 100,
    });

    expect(result.hp).toBe(100);
    expect(result.mood).toBe('ZEN');
    expect(result.burnRateRatio).toBeLessThanOrEqual(1.0);
  });

  it('should drain HP proportionally when variable spending accelerates', () => {
    // Budget: 2000, Day 10, Spent: 1600 (expected is ~666) -> burn rate ~2.4x
    const result = calculateHealthPoints({
      monthlyIncome: 5000,
      variableBudgetLimit: 2000,
      totalFixedSpent: 1500,
      totalVariableSpent: 1600,
      currentDayOfMonth: 10,
      totalDaysInMonth: 30,
      currentHp: 100,
    });

    expect(result.hp).toBeLessThan(80);
    expect(['WARNING', 'PANIC']).toContain(result.mood);
  });

  it('should properly map HP thresholds to Mascot moods', () => {
    expect(getMascotMood(100)).toBe('ZEN');
    expect(getMascotMood(85)).toBe('ZEN');
    expect(getMascotMood(75)).toBe('NEUTRAL');
    expect(getMascotMood(50)).toBe('NEUTRAL');
    expect(getMascotMood(40)).toBe('WARNING');
    expect(getMascotMood(20)).toBe('WARNING');
    expect(getMascotMood(15)).toBe('PANIC');
    expect(getMascotMood(0)).toBe('PANIC');
  });

  it('should calculate Level progression based on XP', () => {
    const level1 = getLevelInfo(0);
    expect(level1.level).toBe(1);
    expect(level1.progressPercentage).toBe(0);

    const level1Half = getLevelInfo(50);
    expect(level1Half.level).toBe(1);
    expect(level1Half.progressPercentage).toBe(50);

    const level2 = getLevelInfo(100); // 100 XP unlocks level 2
    expect(level2.level).toBe(2);

    const level3 = getLevelInfo(300); // 100 (L1) + 200 (L2) = 300 XP
    expect(level3.level).toBe(3);
  });
});
