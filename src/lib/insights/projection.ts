import type {
  CategoryProjection,
  MonthProjectionSummary,
  ProjectionStatus,
} from '@/types/insights';
import type { Category, Budget, Transaction } from '@/types/database';
import { parseYearMonth } from '@/lib/utils/date-utils';

export interface CalculateProjectionParams {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  isFixed: boolean;
  currentSpent: number;
  budgetLimit: number;
  currentDayOfMonth: number;
  totalDaysInMonth: number;
}

/**
 * Calculates deterministic month-end projection for a specific category.
 * Fully guarded against zero-divisions, negative days, and NaN.
 */
export function calculateCategoryProjection(params: CalculateProjectionParams): CategoryProjection {
  const {
    categoryId,
    categoryName,
    categoryIcon,
    categoryColor,
    isFixed,
    currentSpent,
    budgetLimit,
    currentDayOfMonth,
    totalDaysInMonth,
  } = params;

  const safeTotalDays = Math.max(1, totalDaysInMonth);
  const safeCurrentDay = Math.max(1, Math.min(safeTotalDays, currentDayOfMonth));
  const safeSpent = Math.max(0, Number(currentSpent.toFixed(2)));

  // Edge case 1: No budget set or zero budget
  if (budgetLimit <= 0) {
    const dailyBurnRate = Number((safeSpent / safeCurrentDay).toFixed(2));
    const projectedMonthEnd = Number((dailyBurnRate * safeTotalDays).toFixed(2));

    return {
      categoryId,
      categoryName,
      categoryIcon,
      categoryColor,
      isFixed,
      currentSpent: safeSpent,
      budgetLimit: 0,
      dailyBurnRate,
      projectedMonthEnd,
      projectedOverspendAmount: 0,
      daysUntilDepleted: null,
      depletionDayOfMonth: null,
      status: 'UNBUDGETED',
      statusMessage: 'Sem teto orçamentário configurado.',
    };
  }

  const safeBudget = Number(budgetLimit.toFixed(2));

  // Edge case 2: Already exceeded
  if (safeSpent >= safeBudget) {
    const dailyBurnRate = Number((safeSpent / safeCurrentDay).toFixed(2));
    const projectedMonthEnd = Number((dailyBurnRate * safeTotalDays).toFixed(2));
    const overspend = Number((safeSpent - safeBudget).toFixed(2));

    return {
      categoryId,
      categoryName,
      categoryIcon,
      categoryColor,
      isFixed,
      currentSpent: safeSpent,
      budgetLimit: safeBudget,
      dailyBurnRate,
      projectedMonthEnd,
      projectedOverspendAmount: overspend,
      daysUntilDepleted: 0,
      depletionDayOfMonth: safeCurrentDay,
      status: 'EXCEEDED',
      statusMessage: `Orçamento esgotado! Excedeu em R$ ${overspend.toFixed(2)}.`,
    };
  }

  // Edge case 3: Zero spent so far
  if (safeSpent === 0) {
    return {
      categoryId,
      categoryName,
      categoryIcon,
      categoryColor,
      isFixed,
      currentSpent: 0,
      budgetLimit: safeBudget,
      dailyBurnRate: 0,
      projectedMonthEnd: 0,
      projectedOverspendAmount: 0,
      daysUntilDepleted: null,
      depletionDayOfMonth: null,
      status: 'SAFE',
      statusMessage: 'Nenhum gasto registrado este mês.',
    };
  }

  // General case: Active spending with defined budget
  const dailyBurnRate = Number((safeSpent / safeCurrentDay).toFixed(2));
  const projectedMonthEnd = Number((dailyBurnRate * safeTotalDays).toFixed(2));
  const remainingBudget = Math.max(0, safeBudget - safeSpent);

  const daysUntilDepleted = dailyBurnRate > 0
    ? Math.max(0, Math.floor(remainingBudget / dailyBurnRate))
    : null;

  const depletionDayOfMonth = daysUntilDepleted !== null
    ? Math.min(safeTotalDays, safeCurrentDay + daysUntilDepleted)
    : null;

  let status: ProjectionStatus = 'SAFE';
  let statusMessage = 'Ritmo dentro do limite previsto.';
  let projectedOverspendAmount = 0;

  if (projectedMonthEnd > safeBudget * 1.15) {
    status = 'DANGER';
    projectedOverspendAmount = Number((projectedMonthEnd - safeBudget).toFixed(2));
    statusMessage = daysUntilDepleted !== null
      ? `Atenção: Ritmo acelerado! Orçamento esgota em ${daysUntilDepleted} dias (dia ${depletionDayOfMonth}).`
      : `Atenção: Projeção ultrapassará o teto em R$ ${projectedOverspendAmount.toFixed(2)}.`;
  } else if (projectedMonthEnd > safeBudget) {
    status = 'WARNING';
    projectedOverspendAmount = Number((projectedMonthEnd - safeBudget).toFixed(2));
    statusMessage = daysUntilDepleted !== null
      ? `Alerta: No ritmo atual, o orçamento esgota no dia ${depletionDayOfMonth}.`
      : `Alerta: Projeção de leve estouro (+R$ ${projectedOverspendAmount.toFixed(2)}).`;
  }

  return {
    categoryId,
    categoryName,
    categoryIcon,
    categoryColor,
    isFixed,
    currentSpent: safeSpent,
    budgetLimit: safeBudget,
    dailyBurnRate,
    projectedMonthEnd,
    projectedOverspendAmount,
    daysUntilDepleted,
    depletionDayOfMonth,
    status,
    statusMessage,
  };
}

/**
 * Aggregates monthly transactions and produces a complete MonthProjectionSummary.
 */
export function calculateMonthEndProjection(params: {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  currentDayOfMonth: number;
  totalDaysInMonth: number;
  targetMonth: number;
  targetYear: number;
  overallVariableBudgetLimit: number;
}): MonthProjectionSummary {
  const {
    transactions,
    categories,
    budgets,
    currentDayOfMonth,
    totalDaysInMonth,
    targetMonth,
    targetYear,
    overallVariableBudgetLimit,
  } = params;

  const monthExpenses = transactions.filter((t) => {
    if (t.type !== 'EXPENSE') return false;
    const parts = parseYearMonth(t.transactionDate);
    return parts.year === targetYear && parts.month === targetMonth;
  });

  // Calculate per-category projections
  const categoryProjections: CategoryProjection[] = categories.map((cat) => {
    const catTxs = monthExpenses.filter((t) => t.categoryId === cat.id);
    const currentSpent = catTxs.reduce((sum, t) => sum + t.amount, 0);

    const budget = budgets.find(
      (b) => b.categoryId === cat.id && b.month === targetMonth && b.year === targetYear
    ) || budgets.find((b) => b.categoryId === cat.id);

    return calculateCategoryProjection({
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      categoryColor: cat.color,
      isFixed: cat.isFixedCost,
      currentSpent,
      budgetLimit: budget?.amountLimit || 0,
      currentDayOfMonth,
      totalDaysInMonth,
    });
  });

  // Calculate overall variable spending projection
  const totalVariableSpent = monthExpenses
    .filter((t) => !t.isFixed)
    .reduce((sum, t) => sum + t.amount, 0);

  const safeTotalDays = Math.max(1, totalDaysInMonth);
  const safeCurrentDay = Math.max(1, Math.min(safeTotalDays, currentDayOfMonth));
  const safeVariableBudget = Math.max(0, overallVariableBudgetLimit);

  const overallProjection = calculateCategoryProjection({
    categoryId: 'overall-variable',
    categoryName: 'Gastos Variáveis Globais',
    categoryIcon: '🌊',
    categoryColor: '#6366F1',
    isFixed: false,
    currentSpent: totalVariableSpent,
    budgetLimit: safeVariableBudget,
    currentDayOfMonth: safeCurrentDay,
    totalDaysInMonth: safeTotalDays,
  });

  const atRiskCategories = categoryProjections.filter(
    (c) => c.status === 'DANGER' || c.status === 'EXCEEDED' || c.status === 'WARNING'
  );

  return {
    totalVariableSpent: Number(totalVariableSpent.toFixed(2)),
    totalVariableBudget: safeVariableBudget,
    dailyBurnRate: overallProjection.dailyBurnRate,
    projectedMonthEnd: overallProjection.projectedMonthEnd,
    projectedOverspendAmount: overallProjection.projectedOverspendAmount,
    daysUntilDepleted: overallProjection.daysUntilDepleted,
    depletionDayOfMonth: overallProjection.depletionDayOfMonth,
    status: overallProjection.status,
    statusMessage: overallProjection.statusMessage,
    categories: categoryProjections,
    atRiskCategories,
  };
}
