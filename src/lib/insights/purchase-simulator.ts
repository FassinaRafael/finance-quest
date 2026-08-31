import { calculateHealthPoints } from '@/lib/gamification/hp-engine';
import type { HPCalculationResult } from '@/types/gamification';

export interface WorkCostResult {
  hourlyRate: number;
  hoursNeeded: number;
  daysNeeded: number;
  workCostMessage: string;
}

export type PurchaseVerdict = 'SAFE' | 'WARNING' | 'DANGER';

export interface PurchaseSimulationResult {
  price: number;
  workCost: WorkCostResult;
  currentHpResult: HPCalculationResult;
  simulatedHpResult: HPCalculationResult;
  hpDrop: number;
  verdict: PurchaseVerdict;
  verdictMessage: string;
  recommendedSavingWeeks: number;
  suggestedWeeklySaving: number;
}

export interface CoolingOffProgress {
  elapsedDays: number;
  remainingDays: number;
  percentage: number;
  isReady: boolean;
}

/**
 * Calculates how many hours and days of work a purchase represents based on monthly income.
 * Assumes a standard 160 hours / month (20 working days x 8h/day).
 */
export function calculateWorkCost(price: number, monthlyIncome: number): WorkCostResult {
  const safeIncome = Math.max(0, monthlyIncome);
  const safePrice = Math.max(0, price);

  if (safeIncome <= 0) {
    return {
      hourlyRate: 0,
      hoursNeeded: 0,
      daysNeeded: 0,
      workCostMessage: 'Renda não informada',
    };
  }

  const hourlyRate = safeIncome / 160;
  const hoursNeeded = Number((safePrice / hourlyRate).toFixed(1));
  const daysNeeded = Number((hoursNeeded / 8).toFixed(1));

  let workCostMessage = `${hoursNeeded}h de trabalho`;
  if (daysNeeded >= 1) {
    workCostMessage = `${daysNeeded} dias (${hoursNeeded}h) de trabalho`;
  }

  return {
    hourlyRate: Number(hourlyRate.toFixed(2)),
    hoursNeeded,
    daysNeeded,
    workCostMessage,
  };
}

/**
 * Simulates the immediate HP impact and mood change of a potential purchase.
 */
export function simulatePurchaseImpact(params: {
  price: number;
  monthlyIncome: number;
  variableBudgetLimit: number;
  totalFixedSpent: number;
  totalVariableSpent: number;
  currentDayOfMonth: number;
  totalDaysInMonth: number;
  currentHp: number;
}): PurchaseSimulationResult {
  const {
    price,
    monthlyIncome,
    variableBudgetLimit,
    totalFixedSpent,
    totalVariableSpent,
    currentDayOfMonth,
    totalDaysInMonth,
    currentHp,
  } = params;

  const safePrice = Math.max(0, price);
  const workCost = calculateWorkCost(safePrice, monthlyIncome);

  // Baseline HP state
  const currentHpResult = calculateHealthPoints({
    monthlyIncome,
    variableBudgetLimit,
    totalFixedSpent,
    totalVariableSpent,
    currentDayOfMonth,
    totalDaysInMonth,
    currentHp,
  });

  // Simulated HP state with the new purchase added
  const simulatedHpResult = calculateHealthPoints({
    monthlyIncome,
    variableBudgetLimit,
    totalFixedSpent,
    totalVariableSpent: totalVariableSpent + safePrice,
    currentDayOfMonth,
    totalDaysInMonth,
    currentHp,
  });

  const hpDrop = Math.max(0, currentHpResult.hp - simulatedHpResult.hp);

  // Determine Verdict
  let verdict: PurchaseVerdict = 'SAFE';
  let verdictMessage = 'Compra segura! Cabe confortavelmente no seu orçamento deste mês.';

  if (simulatedHpResult.hp <= 40 || simulatedHpResult.mood === 'PANIC') {
    verdict = 'DANGER';
    verdictMessage = 'Alerta Vermelho! Essa compra vai esgotar seu orçamento e deixar o Finny em estado de K.O.!';
  } else if (hpDrop > 15 || simulatedHpResult.hp < 80 || simulatedHpResult.mood === 'WARNING') {
    verdict = 'WARNING';
    verdictMessage = 'Cuidado! Essa compra vai consumir uma fatia pesada do seu ritmo e colocar o Finny em alerta.';
  }

  // Recommended Savings Strategy (saving ~15% of monthly variable budget per week)
  const safeVarBudget = Math.max(500, variableBudgetLimit);
  const suggestedWeeklySaving = Number(Math.min(safePrice, safeVarBudget * 0.15).toFixed(2));
  const recommendedSavingWeeks = suggestedWeeklySaving > 0
    ? Math.max(1, Math.ceil(safePrice / suggestedWeeklySaving))
    : 4;

  return {
    price: safePrice,
    workCost,
    currentHpResult,
    simulatedHpResult,
    hpDrop,
    verdict,
    verdictMessage,
    recommendedSavingWeeks,
    suggestedWeeklySaving,
  };
}

/**
 * Calculates cooling-off progress for a 30-day wishlist item.
 */
export function calculateCoolingOffProgress(createdAtIso: string, coolingOffDays: number = 30): CoolingOffProgress {
  const createdDate = new Date(createdAtIso).getTime();
  const now = Date.now();

  const msPerDay = 1000 * 60 * 60 * 24;
  const elapsedDays = Math.max(0, Math.floor((now - createdDate) / msPerDay));
  const remainingDays = Math.max(0, coolingOffDays - elapsedDays);
  const percentage = Math.min(100, Math.round((elapsedDays / coolingOffDays) * 100));
  const isReady = remainingDays === 0;

  return {
    elapsedDays,
    remainingDays,
    percentage,
    isReady,
  };
}
