import type { StreakUpdateResult } from '@/types/gamification';
import { getDaysDifference } from '@/lib/utils/date-utils';

/**
 * Calculates updated streak counter and awarded XP based on user activity date.
 */
export function updateStreak(
  currentStreak: number,
  maxStreak: number,
  lastActivityDate: string | null | undefined,
  currentDate: string
): StreakUpdateResult {
  if (!lastActivityDate) {
    // First time logging
    return {
      currentStreak: 1,
      maxStreak: Math.max(1, maxStreak),
      streakIncremented: true,
      streakReset: false,
      xpEarned: 25,
      message: '🔥 Primeiro dia ativo! O hábito começou.',
    };
  }

  const diff = getDaysDifference(currentDate, lastActivityDate);

  if (diff === 0) {
    // Already active today (guarantee at least 1 day of focus)
    const effectiveStreak = Math.max(1, currentStreak);
    const effectiveMax = Math.max(maxStreak, effectiveStreak);
    return {
      currentStreak: effectiveStreak,
      maxStreak: effectiveMax,
      streakIncremented: currentStreak === 0,
      streakReset: false,
      xpEarned: 5,
      message: '⚡ Mais um registro hoje! +5 XP.',
    };
  }

  if (diff === 1) {
    // Exactly yesterday: Streak continues!
    const effectiveBase = Math.max(1, currentStreak);
    const newStreak = effectiveBase + 1;
    const newMax = Math.max(maxStreak, newStreak);
    const bonusXp = 15 + Math.min(30, newStreak * 2);

    return {
      currentStreak: newStreak,
      maxStreak: newMax,
      streakIncremented: true,
      streakReset: false,
      xpEarned: bonusXp,
      message: `🔥 Streak mantido! ${newStreak} dias consecutivos (+${bonusXp} XP)!`,
    };
  }

  // More than 1 day difference: Streak broken, starts new cycle
  return {
    currentStreak: 1,
    maxStreak: Math.max(1, maxStreak),
    streakIncremented: false,
    streakReset: true,
    xpEarned: 10,
    message: '🔄 Streak reiniciado! Um novo ciclo começa agora.',
  };
}
