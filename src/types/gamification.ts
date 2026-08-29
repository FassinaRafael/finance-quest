export type MascotMood = 'ZEN' | 'NEUTRAL' | 'WARNING' | 'PANIC';

export interface HPCalculationParams {
  monthlyIncome: number;
  variableBudgetLimit: number;
  totalFixedSpent: number;
  totalVariableSpent: number;
  currentDayOfMonth: number;
  totalDaysInMonth: number;
  currentHp: number;
}

export interface HPCalculationResult {
  hp: number; // 0 to 100
  mood: MascotMood;
  burnRateRatio: number; // actual spent / expected spent
  expectedDailyBudget: number;
  actualDailyAverage: number;
  isInGracePeriod: boolean;
  graceFactor: number;
  statusMessage: string;
}

export interface StreakUpdateResult {
  currentStreak: number;
  maxStreak: number;
  streakIncremented: boolean;
  streakReset: boolean;
  xpEarned: number;
  message: string;
}

export interface LevelInfo {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercentage: number;
}
