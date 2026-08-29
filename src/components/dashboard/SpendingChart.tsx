'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { PieChart as PieIcon, BarChart3, TrendingDown } from 'lucide-react';
import { formatCurrency, parseYearMonth } from '@/lib/utils/date-utils';
import type { Transaction, Category, Budget } from '@/types/database';

interface SpendingChartProps {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  className?: string;
}

export const SpendingChart: React.FC<SpendingChartProps> = ({
  transactions,
  categories,
  budgets,
  className = '',
}) => {
  const [activeChart, setActiveChart] = useState<'CATEGORIES' | 'DAILY'>('CATEGORIES');

  // Filter current month expenses
  const currentMonthExpenses = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    return transactions.filter((t) => {
      if (t.type !== 'EXPENSE') return false;
      const parts = parseYearMonth(t.transactionDate);
      return parts.year === currentYear && parts.month === currentMonth;
    });
  }, [transactions]);

  // 1. Aggregate spending by category
  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string; icon: string }>();

    currentMonthExpenses.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const catName = cat?.name || 'Outros';
      const catColor = cat?.color || '#64748B';
      const catIcon = cat?.icon || '📦';

      const existing = map.get(catName) || { name: catName, value: 0, color: catColor, icon: catIcon };
      existing.value = Number((existing.value + tx.amount).toFixed(2));
      map.set(catName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses, categories]);

  // 2. Aggregate spending by day
  const dailyData = useMemo(() => {
    const dayMap = new Map<number, { day: number; variable: number; fixed: number }>();

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      dayMap.set(i, { day: i, variable: 0, fixed: 0 });
    }

    currentMonthExpenses.forEach((tx) => {
      const parts = parseYearMonth(tx.transactionDate);
      if (parts.month === currentMonth && parts.year === currentYear) {
        const item = dayMap.get(parts.day);
        if (item) {
          if (tx.isFixed) {
            item.fixed = Number((item.fixed + tx.amount).toFixed(2));
          } else {
            item.variable = Number((item.variable + tx.amount).toFixed(2));
          }
        }
      }
    });

    return Array.from(dayMap.values()).slice(0, Math.max(today.getDate() + 2, 15));
  }, [currentMonthExpenses]);

  const varBudget = budgets.find((b) => !b.categoryId)?.amountLimit || 2200;
  const dailyBenchmark = Number((varBudget / 30).toFixed(2));

  return (
    <div className={`p-4 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl ${className}`}>
      {/* Header & Chart Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-indigo-400" />
            Análise Visual de Gastos
          </h3>
          <p className="text-xs text-slate-400">Distribuição por categoria e ritmo diário</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 self-start">
          <button
            onClick={() => setActiveChart('CATEGORIES')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeChart === 'CATEGORIES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Categorias</span>
          </button>

          <button
            onClick={() => setActiveChart('DAILY')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeChart === 'DAILY'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Ritmo Diário</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      {categoryData.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Nenhum gasto registrado neste mês para visualização gráfica.
        </div>
      ) : activeChart === 'CATEGORIES' ? (
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-1/2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value || 0)), 'Total']}
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown List */}
          <div className="w-full md:w-1/2 space-y-2 max-h-56 overflow-y-auto pr-1">
            {categoryData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/40 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="font-semibold text-slate-200">{item.name}</span>
                </div>
                <span className="font-bold text-white">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value || 0)),
                  name === 'variable' ? 'Gasto Variável' : 'Gasto Fixo',
                ]}
                labelFormatter={(label) => `Dia ${label}`}
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#334155',
                  borderRadius: '16px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine
                y={dailyBenchmark}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: `Meta: ${formatCurrency(dailyBenchmark)}/dia`,
                  fill: '#10b981',
                  fontSize: 10,
                  position: 'top',
                }}
              />
              <Bar dataKey="variable" fill="#6366f1" radius={[6, 6, 0, 0]} name="variable" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
