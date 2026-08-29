import type {
  HPCalculationParams,
  HPCalculationResult,
  MascotMood,
  LevelInfo,
} from '@/types/gamification';

/**
 * Calculates current Health Points (HP), Mood, and Burn Rate.
 * Includes dynamic smoothing buffer for days 1-5 to prevent early month K.O. false alarms.
 */
export function calculateHealthPoints(params: HPCalculationParams): HPCalculationResult {
  const {
    variableBudgetLimit,
    totalVariableSpent,
    currentDayOfMonth,
    totalDaysInMonth,
  } = params;

  // Safe defaults
  const safeBudget = Math.max(1, variableBudgetLimit);
  const safeDaysInMonth = Math.max(1, totalDaysInMonth);
  const safeCurrentDay = Math.min(safeDaysInMonth, Math.max(1, currentDayOfMonth));

  const expectedDailyBudget = safeBudget / safeDaysInMonth;
  const actualDailyAverage = totalVariableSpent / safeCurrentDay;

  // Grace Period buffer for first 5 days
  const isInGracePeriod = safeCurrentDay <= 5;
  let graceFactor = 1.0;
  let effectiveDay = safeCurrentDay;

  if (isInGracePeriod) {
    // Smoothed effective day for denominator: day 1 acts like day 13.5, day 5 acts like day 7.5
    const smoothingBonus = (6 - safeCurrentDay) * 2.5;
    effectiveDay = safeCurrentDay + smoothingBonus;
    graceFactor = effectiveDay / safeCurrentDay;
  }

  const expectedSpendingSoFar = expectedDailyBudget * effectiveDay;
  const burnRateRatio = totalVariableSpent / Math.max(1, expectedSpendingSoFar);

  let hp = 100;
  let statusMessage = 'Finanças em perfeito equilíbrio! Finny está relaxado.';

  if (isInGracePeriod && totalVariableSpent <= safeBudget * 0.25) {
    // Within early month safe buffer
    hp = 100;
    statusMessage = 'Início de mês protegido! Ritmo saudável de gastos variáveis.';
  } else if (burnRateRatio <= 1.0) {
    // Under or on budget
    hp = 100;
    statusMessage = 'Você está abaixo do teto orçamentário diário. Finny agradece!';
  } else {
    // Over budget burn rate: scale penalty
    const excess = (burnRateRatio - 1.0) * 100;
    // Drain curve with dampening
    const penalty = excess * (isInGracePeriod ? 0.45 : 0.75);
    hp = Math.max(0, Math.min(100, Math.round(100 - penalty)));

    if (hp >= 80) {
      statusMessage = 'Leve aceleração nos gastos, mas ainda sob controle.';
    } else if (hp >= 50) {
      statusMessage = 'Atenção ao ritmo: gastos variáveis acima do esperado para o período.';
    } else if (hp >= 20) {
      statusMessage = 'Alerta! O orçamento variável está sendo consumido muito rápido.';
    } else {
      statusMessage = 'Crítico! Finny está em K.O. Reduza os gastos variáveis para recuperar HP.';
    }
  }

  const mood = getMascotMood(hp);

  return {
    hp,
    mood,
    burnRateRatio: Number(burnRateRatio.toFixed(2)),
    expectedDailyBudget: Number(expectedDailyBudget.toFixed(2)),
    actualDailyAverage: Number(actualDailyAverage.toFixed(2)),
    isInGracePeriod,
    graceFactor: Number(graceFactor.toFixed(2)),
    statusMessage,
  };
}

/**
 * Determines mascot mood based on HP score.
 */
export function getMascotMood(hp: number): MascotMood {
  if (hp >= 80) return 'ZEN';
  if (hp >= 50) return 'NEUTRAL';
  if (hp >= 20) return 'WARNING';
  return 'PANIC';
}

/**
 * Calculates level details from total accumulated XP.
 * Formula: Level N requires N * 100 XP.
 */
export function getLevelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let remainingXp = Math.max(0, totalXp);
  let xpForNextLevel = 100;

  const titles = [
    'Iniciante Poupador',
    'Aprendiz de Disciplina',
    'Escudeiro Financeiro',
    'Guardião do Orçamento',
    'Mestre da Economia',
    'Lorde dos Investimentos',
    'Oráculo da Riqueza',
  ];

  while (remainingXp >= xpForNextLevel) {
    remainingXp -= xpForNextLevel;
    level += 1;
    xpForNextLevel = level * 100;
  }

  const titleIndex = Math.min(level - 1, titles.length - 1);
  const progressPercentage = Math.min(100, Math.round((remainingXp / xpForNextLevel) * 100));

  return {
    level,
    title: titles[titleIndex],
    currentLevelXp: remainingXp,
    nextLevelXp: xpForNextLevel,
    progressPercentage,
  };
}
