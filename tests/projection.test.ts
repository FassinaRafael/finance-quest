import { describe, it, expect } from 'vitest';
import {
  calculateCategoryProjection,
  calculateMonthEndProjection,
} from '@/lib/insights/projection';
import type { Category, Budget, Transaction } from '@/types/database';

describe('projection-engine (Month-End & Burn Rate Predictor)', () => {
  it('should calculate accurate month-end projection for healthy spending pace', () => {
    const result = calculateCategoryProjection({
      categoryId: 'cat-food',
      categoryName: 'Alimentação',
      categoryIcon: '🍔',
      categoryColor: '#F59E0B',
      isFixed: false,
      currentSpent: 200, // Day 10 of 30 => R$ 20/day
      budgetLimit: 900, // R$ 30/day limit
      currentDayOfMonth: 10,
      totalDaysInMonth: 30,
    });

    expect(result.dailyBurnRate).toBe(20);
    expect(result.projectedMonthEnd).toBe(600);
    expect(result.projectedOverspendAmount).toBe(0);
    expect(result.status).toBe('SAFE');
    expect(result.daysUntilDepleted).toBe(35); // (900-200)/20 = 35 days
  });

  it('should detect danger status and predict exact depletion day when burn rate is high', () => {
    const result = calculateCategoryProjection({
      categoryId: 'cat-leisure',
      categoryName: 'Lazer',
      categoryIcon: '🎮',
      categoryColor: '#EC4899',
      isFixed: false,
      currentSpent: 400, // Day 10 of 30 => R$ 40/day
      budgetLimit: 600, // R$ 20/day limit => Projected R$ 1200
      currentDayOfMonth: 10,
      totalDaysInMonth: 30,
    });

    expect(result.dailyBurnRate).toBe(40);
    expect(result.projectedMonthEnd).toBe(1200);
    expect(result.projectedOverspendAmount).toBe(600);
    expect(result.status).toBe('DANGER');
    // Remaining budget = 200 => 200 / 40 = 5 days until depletion
    expect(result.daysUntilDepleted).toBe(5);
    expect(result.depletionDayOfMonth).toBe(15); // Day 10 + 5 days = Day 15
  });

  it('should handle already exceeded budget gracefully without negative days or NaN', () => {
    const result = calculateCategoryProjection({
      categoryId: 'cat-shopping',
      categoryName: 'Compras',
      categoryIcon: '🛍️',
      categoryColor: '#8B5CF6',
      isFixed: false,
      currentSpent: 750,
      budgetLimit: 500, // Already exceeded on day 5
      currentDayOfMonth: 5,
      totalDaysInMonth: 30,
    });

    expect(result.status).toBe('EXCEEDED');
    expect(result.daysUntilDepleted).toBe(0);
    expect(result.projectedOverspendAmount).toBe(250);
    expect(result.depletionDayOfMonth).toBe(5);
    expect(Number.isNaN(result.projectedMonthEnd)).toBe(false);
  });

  it('should handle unbudgeted category (zero budget limit) without NaN or crash', () => {
    const result = calculateCategoryProjection({
      categoryId: 'cat-other',
      categoryName: 'Outros',
      categoryIcon: '📦',
      categoryColor: '#64748B',
      isFixed: false,
      currentSpent: 120,
      budgetLimit: 0, // No budget defined
      currentDayOfMonth: 10,
      totalDaysInMonth: 30,
    });

    expect(result.status).toBe('UNBUDGETED');
    expect(result.daysUntilDepleted).toBeNull();
    expect(result.depletionDayOfMonth).toBeNull();
    expect(result.dailyBurnRate).toBe(12);
    expect(result.projectedMonthEnd).toBe(360);
  });

  it('should handle zero spending on day 1 safely', () => {
    const result = calculateCategoryProjection({
      categoryId: 'cat-health',
      categoryName: 'Saúde',
      categoryIcon: '💊',
      categoryColor: '#10B981',
      isFixed: false,
      currentSpent: 0,
      budgetLimit: 400,
      currentDayOfMonth: 1,
      totalDaysInMonth: 31,
    });

    expect(result.status).toBe('SAFE');
    expect(result.dailyBurnRate).toBe(0);
    expect(result.projectedMonthEnd).toBe(0);
    expect(result.daysUntilDepleted).toBeNull();
  });

  it('should aggregate overall monthly projection and identify at-risk categories', () => {
    const mockCategories: Category[] = [
      {
        id: 'cat-1',
        name: 'Alimentação',
        icon: '🍔',
        color: '#F59E0B',
        type: 'EXPENSE',
        isFixedCost: false,
        isUnclassifiedFallback: false,
        aliases: [],
        createdAt: '2026-08-01',
      },
      {
        id: 'cat-2',
        name: 'Lazer',
        icon: '🎮',
        color: '#EC4899',
        type: 'EXPENSE',
        isFixedCost: false,
        isUnclassifiedFallback: false,
        aliases: [],
        createdAt: '2026-08-01',
      },
    ];

    const mockBudgets: Budget[] = [
      {
        id: 'b-1',
        userId: 'usr-1',
        categoryId: 'cat-1',
        amountLimit: 600,
        month: 8,
        year: 2026,
        createdAt: '2026-08-01',
      },
      {
        id: 'b-2',
        userId: 'usr-1',
        categoryId: 'cat-2',
        amountLimit: 200,
        month: 8,
        year: 2026,
        createdAt: '2026-08-01',
      },
    ];

    const mockTransactions: Transaction[] = [
      {
        id: 't-1',
        userId: 'usr-1',
        categoryId: 'cat-1',
        amount: 150,
        type: 'EXPENSE',
        isFixed: false,
        source: 'APP',
        transactionDate: '2026-08-05',
        createdAt: '2026-08-05T12:00:00Z',
      },
      {
        id: 't-2',
        userId: 'usr-1',
        categoryId: 'cat-2',
        amount: 250, // Exceeded 200 limit
        type: 'EXPENSE',
        isFixed: false,
        source: 'APP',
        transactionDate: '2026-08-08',
        createdAt: '2026-08-08T12:00:00Z',
      },
    ];

    const summary = calculateMonthEndProjection({
      transactions: mockTransactions,
      categories: mockCategories,
      budgets: mockBudgets,
      currentDayOfMonth: 10,
      totalDaysInMonth: 30,
      targetMonth: 8,
      targetYear: 2026,
      overallVariableBudgetLimit: 1000,
    });

    expect(summary.totalVariableSpent).toBe(400);
    expect(summary.categories.length).toBe(2);
    expect(summary.atRiskCategories.length).toBe(1);
    expect(summary.atRiskCategories[0].categoryId).toBe('cat-2');
    expect(summary.atRiskCategories[0].status).toBe('EXCEEDED');
  });
});
