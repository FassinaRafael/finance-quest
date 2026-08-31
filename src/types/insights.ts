export type ProjectionStatus = 'SAFE' | 'WARNING' | 'DANGER' | 'EXCEEDED' | 'UNBUDGETED';

export interface CategoryProjection {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  isFixed: boolean;
  currentSpent: number;
  budgetLimit: number;
  dailyBurnRate: number;
  projectedMonthEnd: number;
  projectedOverspendAmount: number;
  daysUntilDepleted: number | null;
  depletionDayOfMonth: number | null;
  status: ProjectionStatus;
  statusMessage: string;
}

export interface MonthProjectionSummary {
  totalVariableSpent: number;
  totalVariableBudget: number;
  dailyBurnRate: number;
  projectedMonthEnd: number;
  projectedOverspendAmount: number;
  daysUntilDepleted: number | null;
  depletionDayOfMonth: number | null;
  status: ProjectionStatus;
  statusMessage: string;
  categories: CategoryProjection[];
  atRiskCategories: CategoryProjection[];
}

export interface MonthlyCategoryTotal {
  monthDate: string; // YYYY-MM-01
  monthLabel: string; // 'Ago 2026'
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalAmount: number;
  count: number;
}
