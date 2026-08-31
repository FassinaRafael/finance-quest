'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, AlertTriangle, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/date-utils';
import type { MonthProjectionSummary, CategoryProjection, ProjectionStatus } from '@/types/insights';

interface MonthEndProjectionCardProps {
  projection: MonthProjectionSummary;
  className?: string;
}

export const MonthEndProjectionCard: React.FC<MonthEndProjectionCardProps> = ({
  projection,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    totalVariableSpent,
    totalVariableBudget,
    dailyBurnRate,
    projectedMonthEnd,
    projectedOverspendAmount,
    status,
    atRiskCategories,
    categories,
  } = projection;

  const getStatusBadge = (st: ProjectionStatus, daysUntilDepleted: number | null) => {
    switch (st) {
      case 'EXCEEDED':
        return (
          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Esgotado
          </span>
        );
      case 'DANGER':
        return (
          <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-black flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            {daysUntilDepleted !== null ? `Estoura em ${daysUntilDepleted}d` : 'Risco Alto'}
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {daysUntilDepleted !== null ? `Estoura em ${daysUntilDepleted}d` : 'Atenção'}
          </span>
        );
      case 'SAFE':
        return (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            No Ritmo
          </span>
        );
      default:
        return null;
    }
  };

  const budgetedCategories = categories.filter((c) => c.budgetLimit > 0 || c.currentSpent > 0);

  return (
    <div className={`p-4 sm:p-5 rounded-3xl bg-slate-900/85 border border-slate-800 backdrop-blur-xl shadow-xl space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-sm">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Projeção de Fim de Mês
              </h3>
              {atRiskCategories.length > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                  {atRiskCategories.length} em risco
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Estimativa baseada no seu ritmo diário real</p>
          </div>
        </div>

        {getStatusBadge(status, projection.daysUntilDepleted)}
      </div>

      {/* Global Burn Rate Metric Card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Ritmo Atual</span>
          <span className="text-sm font-black text-slate-100">{formatCurrency(dailyBurnRate)}/dia</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Projeção Final</span>
          <span className={`text-sm font-black ${
            projectedOverspendAmount > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {formatCurrency(projectedMonthEnd)}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Teto Variável</span>
          <span className="text-sm font-bold text-slate-300">{formatCurrency(totalVariableBudget)}</span>
        </div>
      </div>

      {/* Alert Banner if at risk */}
      {projectedOverspendAmount > 0 && (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold block">Risco de Estouro Geral: +{formatCurrency(projectedOverspendAmount)}</span>
            <span className="text-[11px] text-rose-300/90 leading-relaxed">
              {projection.statusMessage}
            </span>
          </div>
        </div>
      )}

      {/* Categories Breakdown List */}
      {budgetedCategories.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Projeção por Categoria
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <span>{isExpanded ? 'Recolher' : `Ver todas (${budgetedCategories.length})`}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="space-y-2">
            {(isExpanded ? budgetedCategories : budgetedCategories.slice(0, 3)).map((cat) => {
              const percent = cat.budgetLimit > 0
                ? Math.min(100, Math.round((cat.currentSpent / cat.budgetLimit) * 100))
                : 0;

              return (
                <div
                  key={cat.categoryId}
                  className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/60 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span>{cat.categoryIcon}</span>
                      <span className="font-bold text-slate-200">{cat.categoryName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-300 font-semibold">
                        {formatCurrency(cat.currentSpent)} / {cat.budgetLimit > 0 ? formatCurrency(cat.budgetLimit) : 'Sem teto'}
                      </span>
                      {getStatusBadge(cat.status, cat.daysUntilDepleted)}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {cat.budgetLimit > 0 && (
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          cat.status === 'EXCEEDED' || cat.status === 'DANGER'
                            ? 'bg-rose-500'
                            : cat.status === 'WARNING'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
