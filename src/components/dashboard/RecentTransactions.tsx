'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Bot, Mic, Smartphone, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/date-utils';
import type { Transaction, Category } from '@/types/database';

interface RecentTransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  onDeleteTransaction: (id: string) => void;
  className?: string;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  categories,
  onDeleteTransaction,
  className = '',
}) => {
  const [filter, setFilter] = useState<'ALL' | 'VARIABLE' | 'FIXED' | 'INCOME'>('ALL');

  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'VARIABLE') return t.type === 'EXPENSE' && !t.isFixed;
    if (filter === 'FIXED') return t.type === 'EXPENSE' && t.isFixed;
    if (filter === 'INCOME') return t.type === 'INCOME';
    return true;
  });

  const getSourceIcon = (source: Transaction['source']) => {
    if (source === 'TELEGRAM')
      return (
        <span title="Via Telegram">
          <Bot className="w-3.5 h-3.5 text-sky-400" />
        </span>
      );
    if (source === 'VOICE')
      return (
        <span title="Via Comando de Voz">
          <Mic className="w-3.5 h-3.5 text-indigo-400" />
        </span>
      );
    return (
      <span title="Via App">
        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
      </span>
    );
  };

  return (
    <div className={`p-4 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl ${className}`}>
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Linha do Tempo
          </h3>
          <p className="text-xs text-slate-400">Transações e registros recentes</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 self-start">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'VARIABLE', label: 'Variáveis' },
            { id: 'FIXED', label: 'Fixos' },
            { id: 'INCOME', label: 'Entradas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        <AnimatePresence>
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nenhuma transação encontrada neste filtro.
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const category = categories.find((c) => c.id === tx.categoryId);
              const isExpense = tx.type === 'EXPENSE';

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/50 hover:bg-slate-800/40 border border-slate-800/60 transition-colors group"
                >
                  {/* Left: Icon & Description */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                      style={{
                        backgroundColor: `${category?.color || '#64748B'}18`,
                        borderColor: `${category?.color || '#64748B'}40`,
                      }}
                    >
                      <span>{category?.icon || '📦'}</span>
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 line-clamp-1">
                          {tx.description}
                        </span>
                        {tx.isFixed && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-semibold border border-purple-500/30">
                            Fixo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{tx.transactionDate}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {getSourceIcon(tx.source)}
                          <span>{category?.name || 'Geral'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div
                        className={`text-sm font-black flex items-center justify-end gap-0.5 ${
                          isExpense ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isExpense ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                        <span>{formatCurrency(tx.amount)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
