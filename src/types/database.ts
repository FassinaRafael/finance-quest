export type TransactionType = 'EXPENSE' | 'INCOME';
export type TransactionSource = 'APP' | 'TELEGRAM' | 'VOICE';

export interface Profile {
  id: string;
  displayName: string;
  telegramChatId?: number | null;
  currency: string;
  timezone: string;
  monthlyIncome: number;
  workHoursPerDay?: number; // e.g. 6 hours/day
  createdAt: string;
}

export interface Category {
  id: string;
  userId?: string | null;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  isFixedCost: boolean;
  isUnclassifiedFallback: boolean;
  aliases: string[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  description?: string | null;
  isFixed: boolean;
  source: TransactionSource;
  transactionDate: string; // YYYY-MM-DD in user's timezone
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId?: string | null; // null = overall variable budget
  amountLimit: number;
  month: number; // 1-12
  year: number;
  createdAt: string;
}

export interface GamificationState {
  userId: string;
  currentHp: number; // 0-100
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  maxStreak: number;
  lastActivityDate?: string | null; // YYYY-MM-DD
  updatedAt: string;
}

export interface Achievement {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

export type WishlistStatus = 'WAITING' | 'APPROVED' | 'CANCELLED' | 'BOUGHT';

export interface WishlistItem {
  id: string;
  userId: string;
  title: string;
  price: number;
  categoryId?: string | null;
  reason?: string | null;
  createdAt: string;
  coolingOffDays: number; // Default 30 days
  status: WishlistStatus;
}
