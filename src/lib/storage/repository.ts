'use client';

import type {
  Profile,
  Category,
  Transaction,
  Budget,
  GamificationState,
  Achievement,
  UserAchievement,
  WishlistItem,
  TransactionType,
  TransactionSource,
} from '@/types/database';
import { DEFAULT_CATEGORIES, DEFAULT_ACHIEVEMENTS } from './default-data';
import { calculateHealthPoints, getLevelInfo } from '@/lib/gamification/hp-engine';
import { updateStreak } from '@/lib/gamification/streak-service';
import {
  getLocalDateString,
  parseYearMonth,
  getDaysInMonth,
} from '@/lib/utils/date-utils';

const STORAGE_KEYS = {
  PROFILE: 'fq_profile',
  CATEGORIES: 'fq_categories',
  TRANSACTIONS: 'fq_transactions',
  BUDGETS: 'fq_budgets',
  GAMIFICATION: 'fq_gamification',
  USER_ACHIEVEMENTS: 'fq_user_achievements',
  WISHLIST: 'fq_wishlist',
};

const DEFAULT_PROFILE: Profile = {
  id: 'usr-default',
  displayName: 'Viajante Financeiro',
  currency: 'BRL',
  timezone: 'America/Sao_Paulo',
  monthlyIncome: 5000,
  createdAt: new Date().toISOString(),
};

const DEFAULT_GAMIFICATION: GamificationState = {
  userId: 'usr-default',
  currentHp: 100,
  totalXp: 50,
  currentLevel: 1,
  currentStreak: 1,
  maxStreak: 1,
  lastActivityDate: getLocalDateString(),
  updatedAt: new Date().toISOString(),
};

// Default initial sample budget
const DEFAULT_BUDGETS: Budget[] = [
  {
    id: 'bgt-var-default',
    userId: 'usr-default',
    categoryId: null, // Global variable budget limit
    amountLimit: 2200,
    month: parseYearMonth(getLocalDateString()).month,
    year: parseYearMonth(getLocalDateString()).year,
    createdAt: new Date().toISOString(),
  },
];

export class StorageRepository {
  private static instance: StorageRepository;
  private listeners: Array<() => void> = [];
  private memoryStore = new Map<string, string>();

  private constructor() {
    if (this.isBrowser()) {
      window.addEventListener('storage', (e) => {
        if (e.key && Object.values(STORAGE_KEYS).includes(e.key)) {
          this.notify();
        }
      });
    }
  }

  public static getInstance(): StorageRepository {
    if (!StorageRepository.instance) {
      StorageRepository.instance = new StorageRepository();
    }
    return StorageRepository.instance;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private getItem(key: string): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem(key);
    }
    return this.memoryStore.get(key) || null;
  }

  private setItem(key: string, value: string): void {
    if (this.isBrowser()) {
      localStorage.setItem(key, value);
    } else {
      this.memoryStore.set(key, value);
    }
  }

  private removeItem(key: string): void {
    if (this.isBrowser()) {
      localStorage.removeItem(key);
    } else {
      this.memoryStore.delete(key);
    }
  }

  // Profile
  public getProfile(): Profile {
    const raw = this.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) {
      this.saveProfile(DEFAULT_PROFILE);
      return DEFAULT_PROFILE;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PROFILE;
    }
  }

  public saveProfile(profile: Profile): void {
    this.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    this.notify();
  }

  // Categories
  public getCategories(): Category[] {
    const raw = this.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      this.saveCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  public saveCategories(categories: Category[]): void {
    this.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    this.notify();
  }

  // Budgets
  public getBudgets(): Budget[] {
    const raw = this.getItem(STORAGE_KEYS.BUDGETS);
    if (!raw) {
      this.saveBudgets(DEFAULT_BUDGETS);
      return DEFAULT_BUDGETS;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_BUDGETS;
    } catch {
      return DEFAULT_BUDGETS;
    }
  }

  public saveBudgets(budgets: Budget[]): void {
    this.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    this.notify();
  }

  // Gamification State
  public getGamificationState(): GamificationState {
    const raw = this.getItem(STORAGE_KEYS.GAMIFICATION);
    if (!raw) {
      this.saveGamificationState(DEFAULT_GAMIFICATION);
      return DEFAULT_GAMIFICATION;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_GAMIFICATION;
    }
  }

  public saveGamificationState(state: GamificationState): void {
    this.setItem(STORAGE_KEYS.GAMIFICATION, JSON.stringify(state));
    this.notify();
  }

  // Achievements
  public getAchievements(): Achievement[] {
    return DEFAULT_ACHIEVEMENTS;
  }

  public getUserAchievements(): UserAchievement[] {
    const raw = this.getItem(STORAGE_KEYS.USER_ACHIEVEMENTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public unlockAchievement(slug: string): Achievement | null {
    const achievements = this.getAchievements();
    const target = achievements.find((a) => a.slug === slug);
    if (!target) return null;

    const userAchs = this.getUserAchievements();
    if (userAchs.some((ua) => ua.achievementId === target.id)) {
      return null; // Already unlocked
    }

    const newUnlock: UserAchievement = {
      userId: 'usr-default',
      achievementId: target.id,
      unlockedAt: new Date().toISOString(),
    };

    userAchs.push(newUnlock);
    this.setItem(STORAGE_KEYS.USER_ACHIEVEMENTS, JSON.stringify(userAchs));

    // Award XP
    const state = this.getGamificationState();
    state.totalXp += target.xpReward;
    const levelInfo = getLevelInfo(state.totalXp);
    state.currentLevel = levelInfo.level;
    this.saveGamificationState(state);

    this.notify();
    return target;
  }

  // Transactions
  public getTransactions(): Transaction[] {
    const raw = this.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveTransactions(txs: Transaction[]): void {
    this.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    this.notify();
  }

  /**
   * Adds a new transaction with precision rounding and sanitized inputs.
   */
  public addTransaction(input: {
    id?: string;
    amount: number;
    categoryId: string;
    type?: TransactionType;
    description?: string;
    isFixed?: boolean;
    source?: TransactionSource;
    transactionDate?: string;
  }): { transaction: Transaction; newAchievement: Achievement | null; xpGained: number } {
    const profile = this.getProfile();
    const categories = this.getCategories();
    const matchedCategory = categories.find((c) => c.id === input.categoryId) || categories[0];

    const todayLocal = getLocalDateString(new Date(), profile.timezone);
    const txDate = input.transactionDate || todayLocal;

    // Strict inheritance rule: transaction.isFixed inherits category.isFixedCost unless explicitly overridden
    const isFixed = input.isFixed !== undefined ? input.isFixed : matchedCategory.isFixedCost;

    // Sanitize amount and description
    const safeAmount = Number(Math.max(0.01, Math.abs(input.amount)).toFixed(2));
    const safeDescription = (input.description || matchedCategory.name).trim().slice(0, 100);

    const txId = input.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)));

    const transaction: Transaction = {
      id: txId,
      userId: profile.id,
      categoryId: matchedCategory.id,
      amount: safeAmount,
      type: input.type || matchedCategory.type || 'EXPENSE',
      description: safeDescription,
      isFixed,
      source: input.source || 'APP',
      transactionDate: txDate,
      createdAt: new Date().toISOString(),
    };

    const currentTxs = this.getTransactions();
    currentTxs.unshift(transaction);
    this.saveTransactions(currentTxs);

    // Update streak and gamification
    const state = this.getGamificationState();
    const streakResult = updateStreak(
      state.currentStreak,
      state.maxStreak,
      state.lastActivityDate,
      todayLocal
    );

    state.currentStreak = streakResult.currentStreak;
    state.maxStreak = streakResult.maxStreak;
    state.lastActivityDate = todayLocal;
    state.totalXp += streakResult.xpEarned;

    // Calculate updated HP with floating-point precision rounding
    const dateParts = parseYearMonth(todayLocal);
    const totalDays = getDaysInMonth(dateParts.year, dateParts.month);

    const monthTxs = currentTxs.filter((t) => {
      const parts = parseYearMonth(t.transactionDate);
      return parts.year === dateParts.year && parts.month === dateParts.month;
    });

    const totalFixedSpent = Number(
      monthTxs
        .filter((t) => t.type === 'EXPENSE' && t.isFixed)
        .reduce((sum, t) => sum + t.amount, 0)
        .toFixed(2)
    );

    const totalVariableSpent = Number(
      monthTxs
        .filter((t) => t.type === 'EXPENSE' && !t.isFixed)
        .reduce((sum, t) => sum + t.amount, 0)
        .toFixed(2)
    );

    const budgets = this.getBudgets();
    const varBudget = budgets.find((b) => !b.categoryId) || budgets[0];

    const hpResult = calculateHealthPoints({
      monthlyIncome: profile.monthlyIncome,
      variableBudgetLimit: varBudget?.amountLimit || 2200,
      totalFixedSpent,
      totalVariableSpent,
      currentDayOfMonth: dateParts.day,
      totalDaysInMonth: totalDays,
      currentHp: state.currentHp,
    });

    state.currentHp = hpResult.hp;
    const levelInfo = getLevelInfo(state.totalXp);
    state.currentLevel = levelInfo.level;
    this.saveGamificationState(state);

    // Check unlocks
    let newAchievement: Achievement | null = null;
    if (currentTxs.length === 1) {
      newAchievement = this.unlockAchievement('first_log');
    }
    if (state.currentStreak >= 3) {
      const ach = this.unlockAchievement('streak_3');
      if (ach) newAchievement = ach;
    }
    if (state.currentStreak >= 7) {
      const ach = this.unlockAchievement('streak_7');
      if (ach) newAchievement = ach;
    }
    if (input.source === 'TELEGRAM') {
      const ach = this.unlockAchievement('telegram_bot');
      if (ach) newAchievement = ach;
    }
    if (input.source === 'VOICE') {
      const ach = this.unlockAchievement('voice_command');
      if (ach) newAchievement = ach;
    }

    this.notify();
    return {
      transaction,
      newAchievement,
      xpGained: streakResult.xpEarned + (newAchievement ? newAchievement.xpReward : 0),
    };
  }

  public deleteTransaction(id: string): void {
    const txs = this.getTransactions().filter((t) => t.id !== id);
    this.saveTransactions(txs);
  }




  public addCategory(categoryData: Omit<Category, 'id' | 'createdAt'>): Category {
    const newCategory: Category = {
      id: 'cat-custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      ...categoryData,
      createdAt: new Date().toISOString(),
    };
    const categories = this.getCategories();
    categories.push(newCategory);
    this.saveCategories(categories);
    return newCategory;
  }

  public updateCategory(id: string, updates: Partial<Category>): void {
    const categories = this.getCategories().map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    this.saveCategories(categories);
  }

  public deleteCategory(id: string): boolean {
    const categories = this.getCategories();
    const target = categories.find((c) => c.id === id);
    if (!target || target.isUnclassifiedFallback) {
      return false; // Cannot delete fallback category
    }
    const filtered = categories.filter((c) => c.id !== id);
    this.saveCategories(filtered);

    // Reassign orphaned transactions to default fallback category
    const fallbackCat = categories.find((c) => c.isUnclassifiedFallback) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
    const txs = this.getTransactions().map((t) =>
      t.categoryId === id ? { ...t, categoryId: fallbackCat.id } : t
    );
    this.saveTransactions(txs);
    return true;
  }

  // Wishlist / Impulse Shield
  public getWishlist(): WishlistItem[] {
    const raw = this.getItem(STORAGE_KEYS.WISHLIST);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveWishlist(items: WishlistItem[]): void {
    this.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(items));
    this.notify();
  }

  public addWishlistItem(itemData: Omit<WishlistItem, 'id' | 'createdAt'>): WishlistItem {
    const newItem: WishlistItem = {
      id: crypto.randomUUID(),
      ...itemData,
      createdAt: new Date().toISOString(),
    };
    const items = this.getWishlist();
    items.unshift(newItem);
    this.saveWishlist(items);
    return newItem;
  }

  public updateWishlistItem(id: string, updates: Partial<WishlistItem>): void {
    const items = this.getWishlist().map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    this.saveWishlist(items);
  }

  public deleteWishlistItem(id: string): void {
    const items = this.getWishlist().filter((item) => item.id !== id);
    this.saveWishlist(items);
  }

  public exportAllData(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile: this.getProfile(),
      categories: this.getCategories(),
      transactions: this.getTransactions(),
      budgets: this.getBudgets(),
      gamification: this.getGamificationState(),
      userAchievements: this.getUserAchievements(),
    };
    return JSON.stringify(data, null, 2);
  }

  public exportTransactionsCsv(): string {
    const txs = this.getTransactions();
    const categories = this.getCategories();
    const headers = ['ID', 'Data', 'Tipo', 'Categoria', 'Descricao', 'Valor', 'Fixo', 'Origem'];

    const rows = txs.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      return [
        t.id,
        t.transactionDate,
        t.type,
        `"${(cat?.name || 'Geral').replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
        t.isFixed ? 'SIM' : 'NAO',
        t.source,
      ].join(';');
    });

    return [headers.join(';'), ...rows].join('\n');
  }

  public importAllData(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') return false;

      // 1. Sanitize Profile
      if (data.profile && typeof data.profile === 'object') {
        const p = data.profile;
        this.saveProfile({
          id: String(p.id || 'usr-default'),
          displayName: String(p.displayName || 'Viajante Financeiro').slice(0, 50),
          currency: String(p.currency || 'BRL'),
          timezone: String(p.timezone || 'America/Sao_Paulo'),
          monthlyIncome: Math.max(0, Number(Number(p.monthlyIncome || 0).toFixed(2))),
          createdAt: String(p.createdAt || new Date().toISOString()),
        });
      }

      // 2. Sanitize Categories
      if (Array.isArray(data.categories)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validCats = data.categories.filter((c: any) => c && typeof c.name === 'string' && c.id).map((c: any) => ({
          id: String(c.id),
          userId: c.userId ? String(c.userId) : null,
          name: String(c.name).slice(0, 40),
          icon: String(c.icon || '📦').slice(0, 4),
          color: String(c.color || '#3B82F6'),
          type: c.type === 'INCOME' ? ('INCOME' as TransactionType) : ('EXPENSE' as TransactionType),
          isFixedCost: Boolean(c.isFixedCost),
          isUnclassifiedFallback: Boolean(c.isUnclassifiedFallback),
          aliases: Array.isArray(c.aliases) ? c.aliases.map((a: unknown) => String(a).toLowerCase().slice(0, 30)) : [],
          createdAt: String(c.createdAt || new Date().toISOString()),
        }));
        if (validCats.length > 0) {
          this.saveCategories(validCats);
        }
      }

      // 3. Sanitize Transactions
      if (Array.isArray(data.transactions)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validTxs = data.transactions.filter((t: any) => t && typeof t.amount === 'number' && !isNaN(t.amount) && t.transactionDate).map((t: any) => ({
          id: String(t.id || 'tx-' + Math.random().toString(36).substring(2, 8)),
          userId: String(t.userId || 'usr-default'),
          categoryId: String(t.categoryId || 'cat-other'),
          amount: Math.abs(Number(t.amount.toFixed(2))),
          type: t.type === 'INCOME' ? ('INCOME' as TransactionType) : ('EXPENSE' as TransactionType),
          description: String(t.description || '').slice(0, 100),
          isFixed: Boolean(t.isFixed),
          source: ['APP', 'TELEGRAM', 'VOICE'].includes(t.source) ? (t.source as TransactionSource) : 'APP',
          transactionDate: String(t.transactionDate),
          createdAt: String(t.createdAt || new Date().toISOString()),
        }));
        this.saveTransactions(validTxs);
      }

      // 4. Sanitize Budgets
      if (Array.isArray(data.budgets)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validBudgets = data.budgets.filter((b: any) => b && typeof b.amountLimit === 'number').map((b: any) => ({
          id: String(b.id || 'bgt-' + Math.random().toString(36).substring(2, 6)),
          userId: String(b.userId || 'usr-default'),
          categoryId: b.categoryId ? String(b.categoryId) : null,
          amountLimit: Math.max(0, Number(Number(b.amountLimit).toFixed(2))),
          month: Math.max(1, Math.min(12, Number(b.month) || 1)),
          year: Number(b.year) || new Date().getFullYear(),
          createdAt: String(b.createdAt || new Date().toISOString()),
        }));
        if (validBudgets.length > 0) {
          this.saveBudgets(validBudgets);
        }
      }

      // 5. Sanitize Gamification
      if (data.gamification && typeof data.gamification === 'object') {
        const g = data.gamification;
        this.saveGamificationState({
          userId: String(g.userId || 'usr-default'),
          currentHp: Math.max(0, Math.min(100, Number(g.currentHp) || 100)),
          totalXp: Math.max(0, Number(g.totalXp) || 0),
          currentLevel: Math.max(1, Number(g.currentLevel) || 1),
          currentStreak: Math.max(0, Number(g.currentStreak) || 0),
          maxStreak: Math.max(0, Number(g.maxStreak) || 0),
          lastActivityDate: g.lastActivityDate ? String(g.lastActivityDate) : null,
          updatedAt: String(g.updatedAt || new Date().toISOString()),
        });
      }

      // 6. User Achievements
      if (Array.isArray(data.userAchievements)) {
        this.setItem(STORAGE_KEYS.USER_ACHIEVEMENTS, JSON.stringify(data.userAchievements));
      }

      this.notify();
      return true;
    } catch (err) {
      console.error('Failed to import data:', err);
      return false;
    }
  }

  public resetToDefaults(): void {
    this.removeItem(STORAGE_KEYS.PROFILE);
    this.removeItem(STORAGE_KEYS.CATEGORIES);
    this.removeItem(STORAGE_KEYS.TRANSACTIONS);
    this.removeItem(STORAGE_KEYS.BUDGETS);
    this.removeItem(STORAGE_KEYS.GAMIFICATION);
    this.removeItem(STORAGE_KEYS.USER_ACHIEVEMENTS);
    this.notify();
  }
}

export const repository = StorageRepository.getInstance();
