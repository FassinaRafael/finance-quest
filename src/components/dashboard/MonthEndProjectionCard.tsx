'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { repository } from '@/lib/storage/repository';
import { pushBudgetsToSupabase } from '@/lib/supabase/sync';
import { formatCurrency } from '@/lib/utils/date-utils';
import type { MonthProjectionSummary, CategoryProjection, ProjectionStatus } from '@/types/insights';
import type { Budget } from '@/types/database';

interface MonthEndProjectionCardProps {
  projection: MonthProjectionSummary;
  userId?: string;
  budgets?: Budget[];
  className?: string;
}

export const MonthEndProjectionCard: React.FC<MonthEndProjectionCardProps> = ({
  projection,
  userId = 'usr-default',
  budgets = [],
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Quick Category Budget Modal State
  const [editingCategory, setEditingCategory] = useState<CategoryProjection | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

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
          <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black flex items-center gap-1 shrink-0">
            <AlertCircle className="w-2.5 h-2.5" />
            Esgotado
          </span>
        );
      case 'DANGER':
        return (
          <span className="px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[9px] font-black flex items-center gap-1 animate-pulse shrink-0">
            <AlertTriangle className="w-2.5 h-2.5" />
            {daysUntilDepleted !== null ? `${daysUntilDepleted}d` : 'Risco'}
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-semibold flex items-center gap-1 shrink-0">
            <Clock className="w-2.5 h-2.5" />
            {daysUntilDepleted !== null ? `${daysUntilDepleted}d` : 'Alerta'}
          </span>
        );
      case 'SAFE':
        return (
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-2.5 h-2.5" />
            OK
          </span>
        );
      default:
        return null;
    }
  };

  // Open Quick Edit Modal
  const handleOpenBudgetModal = (cat: CategoryProjection) => {
    setEditingCategory(cat);
    setBudgetInput(cat.budgetLimit > 0 ? cat.budgetLimit.toString() : '');
    setIsSavedFeedback(false);
  };

  // Save Category Budget Limit
  const handleSaveCategoryBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const newLimit = Math.max(0, parseFloat(budgetInput) || 0);
    const currentBudgets = repository.getBudgets();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const existingIndex = currentBudgets.findIndex((b) => b.categoryId === editingCategory.categoryId);

    let updatedBudgets: Budget[];
    if (existingIndex >= 0) {
      if (newLimit === 0) {
        // Remove specific budget limit
        updatedBudgets = currentBudgets.filter((_, i) => i !== existingIndex);
      } else {
        updatedBudgets = currentBudgets.map((b, i) =>
          i === existingIndex ? { ...b, amountLimit: Number(newLimit.toFixed(2)) } : b
        );
      }
    } else if (newLimit > 0) {
      // Add new category budget limit
      const newBudget: Budget = {
        id: crypto.randomUUID(),
        userId,
        categoryId: editingCategory.categoryId,
        amountLimit: Number(newLimit.toFixed(2)),
        month: currentMonth,
        year: currentYear,
        createdAt: new Date().toISOString(),
      };
      updatedBudgets = [...currentBudgets, newBudget];
    } else {
      updatedBudgets = currentBudgets;
    }

    repository.saveBudgets(updatedBudgets);
    pushBudgetsToSupabase(userId, updatedBudgets);

    setIsSavedFeedback(true);
    setTimeout(() => {
      setIsSavedFeedback(false);
      setEditingCategory(null);
    }, 600);
  };

  // Sort categories: at risk first, then by spent descending
  const sortedCategories = [...categories].sort((a, b) => {
    const priority = { EXCEEDED: 4, DANGER: 3, WARNING: 2, SAFE: 1, UNBUDGETED: 0 };
    const diff = (priority[b.status] || 0) - (priority[a.status] || 0);
    if (diff !== 0) return diff;
    return b.currentSpent - a.currentSpent;
  });

  const displayedCategories = isExpanded ? sortedCategories : sortedCategories.slice(0, 3);

  return (
    <div className={`p-4 sm:p-5 rounded-3xl bg-slate-900/85 border border-slate-800 backdrop-blur-xl shadow-xl space-y-3.5 ${className}`}>
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
      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Ritmo Atual</span>
          <span className="text-xs sm:text-sm font-black text-slate-100">{formatCurrency(dailyBurnRate)}/dia</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Projeção Final</span>
          <span className={`text-xs sm:text-sm font-black ${
            projectedOverspendAmount > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {formatCurrency(projectedMonthEnd)}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Teto Variável</span>
          <span className="text-xs sm:text-sm font-bold text-slate-300">{formatCurrency(totalVariableBudget)}</span>
        </div>
      </div>

      {/* Alert Banner if at risk */}
      {projectedOverspendAmount > 0 && (
        <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div className="leading-snug">
            <span className="font-bold block text-[11px]">Risco de Estouro Geral: +{formatCurrency(projectedOverspendAmount)}</span>
            <span className="text-[10px] text-rose-300/90">{projection.statusMessage}</span>
          </div>
        </div>
      )}

      {/* Categories Breakdown Header & Toggle */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Categorias ({sortedCategories.length})
          </span>
          {sortedCategories.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-indigo-500/10 active:scale-95"
            >
              <span>{isExpanded ? 'Recolher (Top 3)' : `Ver todas (${sortedCategories.length})`}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Compact Grid Layout for Categories */}
        <div className={`grid gap-1.5 ${
          isExpanded
            ? 'grid-cols-1 sm:grid-cols-2 max-h-72 overflow-y-auto pr-1'
            : 'grid-cols-1'
        }`}>
          {displayedCategories.map((cat) => {
            const percent = cat.budgetLimit > 0
              ? Math.min(100, Math.round((cat.currentSpent / cat.budgetLimit) * 100))
              : 0;

            const hasBudget = cat.budgetLimit > 0;

            return (
              <div
                key={cat.categoryId}
                className="group relative p-2 px-2.5 rounded-xl bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800/60 hover:border-slate-700 transition-all flex items-center justify-between gap-2 overflow-hidden"
              >
                {/* Left: Category Icon & Name */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-sm shrink-0">{cat.categoryIcon}</span>
                  <span className="text-xs font-bold text-slate-200 truncate" title={cat.categoryName}>
                    {cat.categoryName}
                  </span>
                </div>

                {/* Right: Amounts & Budget Trigger Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenBudgetModal(cat)}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-slate-900/90 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 transition-colors"
                    title="Clique para definir ou alterar o teto"
                  >
                    <span>{formatCurrency(cat.currentSpent)}</span>
                    <span className="text-slate-600">/</span>
                    {hasBudget ? (
                      <strong className="text-slate-100 font-bold">{formatCurrency(cat.budgetLimit)}</strong>
                    ) : (
                      <span className="text-indigo-400 font-semibold flex items-center gap-0.5">
                        <Plus className="w-2.5 h-2.5" />
                        Teto
                      </span>
                    )}
                    <Edit3 className="w-2.5 h-2.5 text-slate-500 ml-0.5 group-hover:text-indigo-400 opacity-60" />
                  </button>

                  {hasBudget && getStatusBadge(cat.status, cat.daysUntilDepleted)}
                </div>

                {/* Micro Progress Bar on bottom border */}
                {hasBudget && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900">
                    <div
                      className={`h-full transition-all ${
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

      {/* Quick Budget Limit Edit Modal */}
      <AnimatePresence>
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-xs p-5 rounded-3xl bg-slate-900 border border-indigo-500/40 shadow-2xl space-y-3.5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{editingCategory.categoryIcon}</span>
                  <div>
                    <h3 className="text-xs font-black text-white">
                      Teto: {editingCategory.categoryName}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Gasto no mês: {formatCurrency(editingCategory.currentSpent)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingCategory(null)}
                  className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleSaveCategoryBudget} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Meta Mensal Máxima (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    autoFocus
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    placeholder="Ex: 400.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[9px] text-slate-500 mt-1">
                    Digite 0 ou clique em &quot;Sem Teto&quot; para remover o limite.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetInput('0');
                    }}
                    className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                  >
                    Sem Teto
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition-transform active:scale-95 shadow-md shadow-indigo-600/25"
                  >
                    {isSavedFeedback ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Salvo!</span>
                      </>
                    ) : (
                      <span>Salvar Teto</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
