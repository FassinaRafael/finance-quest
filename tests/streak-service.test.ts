import { describe, it, expect } from 'vitest';
import { updateStreak } from '@/lib/gamification/streak-service';

describe('streak-service', () => {
  it('should initialize streak to 1 on first log', () => {
    const result = updateStreak(0, 0, null, '2026-08-27');
    expect(result.currentStreak).toBe(1);
    expect(result.maxStreak).toBe(1);
    expect(result.streakIncremented).toBe(true);
    expect(result.streakReset).toBe(false);
  });

  it('should increment streak if logged on consecutive days', () => {
    const result = updateStreak(3, 3, '2026-08-26', '2026-08-27');
    expect(result.currentStreak).toBe(4);
    expect(result.maxStreak).toBe(4);
    expect(result.streakIncremented).toBe(true);
  });

  it('should not increment streak twice on the same day', () => {
    const result = updateStreak(4, 4, '2026-08-27', '2026-08-27');
    expect(result.currentStreak).toBe(4);
    expect(result.streakIncremented).toBe(false);
    expect(result.streakReset).toBe(false);
  });

  it('should reset streak to 1 if user skips more than 1 day', () => {
    const result = updateStreak(5, 5, '2026-08-24', '2026-08-27'); // 3 days gap
    expect(result.currentStreak).toBe(1);
    expect(result.maxStreak).toBe(5); // Retains max streak record
    expect(result.streakReset).toBe(true);
  });
});
