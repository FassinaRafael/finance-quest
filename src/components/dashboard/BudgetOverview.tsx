'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Landmark, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/date-utils';
import type { Budget, Profile } from '@/types/database';

interface BudgetOverviewProps {
  profile: Profile;
  budgets: Budget[];
  totalFixedSpent: number;
  totalVariableSpent: number;
  daysRemainingInMonth: number;
  className?: string;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({
  profile,
  budgets,
  totalFixedSpent,
  totalVariableSpent,
  daysRemainingInMonth,
  className = '',
}) => {
  const variableBudget = budgets.find((b) => !b.categoryId)?.amountLimit || 2200;
  const variableProgress = Math.min(100, Math.round((totalVariableSpent / variableBudget) * 100));
  const remainingVariable = Math.max(0, variableBudget - totalVariableSpent);
  const dailyAllowance = daysRemainingInMonth > 0 ? remainingVariable / daysRemainingInMonth : 0;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3.5 ${className}`}>
      {/* Variable Budget Card (Gamified daily burn focus) */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                Orçamento Variável (Dia a Dia)
              </h3>
              <p className="text-[11px] text-slate-400">Alimentação, lazer, transporte</p>
            </div>
          </div>

          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            {variableProgress}% Usado
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 my-2">
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${variableProgress}%` }}
              className={`h-full rounded-full ${
                variableProgress > 90
                  ? 'bg-gradient-to-r from-rose-500 to-red-600'
                  : variableProgress > 70
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : 'bg-gradient-to-r from-indigo-500 to-teal-400'
              }`}
            />
          </div>

          <div className="flex justify-between text-xs font-semibold text-slate-400">
            <span>Gasto: <strong className="text-slate-200">{formatCurrency(totalVariableSpent)}</strong></span>
            <span>Teto: <strong className="text-slate-200">{formatCurrency(variableBudget)}</strong></span>
          </div>
        </div>

        {/* Daily Allowance Highlight */}
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Restante: {daysRemainingInMonth} dias</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400">Meta diária recomendada: </span>
            <strong className="text-emerald-400 font-bold">{formatCurrency(dailyAllowance)}/dia</strong>
          </div>
        </div>
      </div>

      {/* Fixed Bills Card (Separated from daily burn rate) */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                Custos Fixos & Recorrentes
              </h3>
              <p className="text-[11px] text-slate-400">Aluguel, contas, assinaturas</p>
            </div>
          </div>

          <span className="text-xs font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
            Planejado
          </span>
        </div>

        <div className="flex items-baseline justify-between py-2">
          <div>
            <span className="text-xs text-slate-400">Total Pago no Mês:</span>
            <div className="text-2xl font-black text-white">
              {formatCurrency(totalFixedSpent)}
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400">Renda Declarada:</span>
            <div className="text-base font-bold text-slate-300">
              {formatCurrency(profile.monthlyIncome)}
            </div>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Isolado do HP diário</span>
          <span className="text-purple-300">
            Saldo livre previsto: <strong>{formatCurrency(profile.monthlyIncome - totalFixedSpent - variableBudget)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
