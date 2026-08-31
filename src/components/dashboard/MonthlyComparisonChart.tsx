'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Layers, Calendar, Filter } from 'lucide-react';
import { formatCurrency, parseYearMonth } from '@/lib/utils/date-utils';
import type { Transaction, Category } from '@/types/database';

interface MonthlyComparisonChartProps {
  transactions: Transaction[];
  categories: Category[];
  className?: string;
}

export const MonthlyComparisonChart: React.FC<MonthlyComparisonChartProps> = ({
  transactions,
  categories,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'STACKED' | 'CATEGORY'>('STACKED');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(categories[0]?.id || 'all');

  // Compute the last 6 months buckets (from 5 months ago to current month)
  const last6Months = useMemo(() => {
    const now = new Date();
    const months: Array<{ year: number; month: number; key: string; label: string }> = [];

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const label = `${monthNames[month - 1]} ${String(year).slice(-2)}`;
      months.push({ year, month, key, label });
    }
    return months;
  }, []);

  // Aggregate monthly spending
  const monthlyData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'EXPENSE');

    return last6Months.map(({ year, month, key, label }) => {
      const monthTxs = expenses.filter((t) => {
        const p = parseYearMonth(t.transactionDate);
        return p.year === year && p.month === month;
      });

      const row: Record<string, unknown> = {
        key,
        label,
        total: 0,
      };

      let totalMonth = 0;

      categories.forEach((cat) => {
        const catAmount = monthTxs
          .filter((t) => t.categoryId === cat.id)
          .reduce((sum, t) => sum + t.amount, 0);

        row[cat.id] = Number(catAmount.toFixed(2));
        totalMonth += catAmount;
      });

      row.total = Number(totalMonth.toFixed(2));
      return row;
    });
  }, [transactions, categories, last6Months]);

  // Selected Category Trend Data
  const categoryTrendData = useMemo(() => {
    const targetCat = categories.find((c) => c.id === selectedCategoryId) || categories[0];
    const catId = targetCat?.id;

    return monthlyData.map((m) => ({
      label: m.label as string,
      key: m.key as string,
      amount: Number(m[catId] || 0),
    }));
  }, [monthlyData, selectedCategoryId, categories]);

  // Calculate Metrics: Current vs Previous month variation
  const metrics = useMemo(() => {
    if (monthlyData.length < 2) {
      return { totalAvg: 0, deltaPercent: 0, highestMonth: '' };
    }

    const currentMonthTotal = Number(monthlyData[monthlyData.length - 1]?.total || 0);
    const prevMonthTotal = Number(monthlyData[monthlyData.length - 2]?.total || 0);

    const nonZeroTotals = monthlyData.map((m) => Number(m.total || 0)).filter((v) => v > 0);
    const totalAvg = nonZeroTotals.length > 0
      ? nonZeroTotals.reduce((a, b) => a + b, 0) / nonZeroTotals.length
      : 0;

    let deltaPercent = 0;
    if (prevMonthTotal > 0) {
      deltaPercent = Number((((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100).toFixed(1));
    }

    let highestMonth = '';
    let maxVal = 0;
    monthlyData.forEach((m) => {
      if (Number(m.total) > maxVal) {
        maxVal = Number(m.total);
        highestMonth = String(m.label);
      }
    });

    return {
      totalAvg: Number(totalAvg.toFixed(2)),
      deltaPercent,
      highestMonth: highestMonth || 'N/A',
    };
  }, [monthlyData]);

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId) || categories[0];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* View Switcher & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setViewMode('STACKED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'STACKED'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todas as Categorias (6M)</span>
          </button>

          <button
            onClick={() => setViewMode('CATEGORY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'CATEGORY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Por Categoria</span>
          </button>
        </div>

        {viewMode === 'CATEGORY' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-center">
        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Média Mensal (6M)</span>
          <span className="text-xs sm:text-sm font-black text-slate-200">{formatCurrency(metrics.totalAvg)}</span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Vs Mês Passado</span>
          <span className={`text-xs sm:text-sm font-black flex items-center justify-center gap-0.5 ${
            metrics.deltaPercent > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {metrics.deltaPercent > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {metrics.deltaPercent > 0 ? `+${metrics.deltaPercent}%` : `${metrics.deltaPercent}%`}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Pico de Gastos</span>
          <span className="text-xs sm:text-sm font-black text-indigo-300">{metrics.highestMonth}</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full pt-2">
        {viewMode === 'STACKED' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `R$${val}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '16px',
                  fontSize: '12px',
                  color: '#fff',
                }}
                formatter={(value: unknown) => [formatCurrency(Number(value) || 0), '']}
              />
              {categories.map((cat) => (
                <Bar
                  key={cat.id}
                  dataKey={cat.id}
                  name={`${cat.icon} ${cat.name}`}
                  stackId="a"
                  fill={cat.color}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={categoryTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="catGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={selectedCategoryObj?.color || '#6366f1'} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={selectedCategoryObj?.color || '#6366f1'} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `R$${val}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '16px',
                  fontSize: '12px',
                  color: '#fff',
                }}
                formatter={(value: unknown) => [formatCurrency(Number(value) || 0), selectedCategoryObj?.name || 'Gasto']}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={selectedCategoryObj?.color || '#6366f1'}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#catGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
