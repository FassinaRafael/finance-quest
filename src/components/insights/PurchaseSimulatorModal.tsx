'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Briefcase,
  AlertTriangle,
  Sparkles,
  Heart,
  TrendingDown,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  X,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { MascotFinny } from '@/components/gamification/MascotFinny';
import {
  simulatePurchaseImpact,
  calculateCoolingOffProgress,
  type PurchaseVerdict,
} from '@/lib/insights/purchase-simulator';
import { repository } from '@/lib/storage/repository';
import {
  pushWishlistItemToSupabase,
  deleteWishlistItemFromSupabase,
  pushTransactionToSupabase,
} from '@/lib/supabase/sync';
import { formatCurrency, getLocalDateString } from '@/lib/utils/date-utils';
import type {
  Profile,
  Category,
  Budget,
  Transaction,
  GamificationState,
  WishlistItem,
} from '@/types/database';

interface PurchaseSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
  gamification: GamificationState;
  onSaveTransaction: (data: {
    amount: number;
    categoryId: string;
    description: string;
    isFixed: boolean;
    type: 'EXPENSE';
    source: 'APP';
  }) => void;
  className?: string;
}

export const PurchaseSimulatorModal: React.FC<PurchaseSimulatorModalProps> = ({
  isOpen,
  onClose,
  profile,
  categories,
  budgets,
  transactions,
  gamification,
  onSaveTransaction,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'SIMULATOR' | 'WISHLIST'>('SIMULATOR');

  // Simulator Inputs
  const [itemTitle, setItemTitle] = useState('');
  const [itemPriceInput, setItemPriceInput] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || 'cat-leisure');
  const [reasonInput, setReasonInput] = useState('');
  const [workHours, setWorkHours] = useState<number>(profile.workHoursPerDay ?? 6);

  // Local Wishlist State
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => repository.getWishlist());
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const priceNum = Math.max(0, parseFloat(itemPriceInput) || 0);

  // Month & Spending Context
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDayOfMonth = now.getDate();
  const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const monthExpenses = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'EXPENSE') return false;
      const [y, m] = t.transactionDate.split('-').map(Number);
      return y === currentYear && m === currentMonth;
    });
  }, [transactions, currentYear, currentMonth]);

  const totalFixedSpent = monthExpenses
    .filter((t) => t.isFixed)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalVariableSpent = monthExpenses
    .filter((t) => !t.isFixed)
    .reduce((sum, t) => sum + t.amount, 0);

  const varBudget = budgets.find((b) => !b.categoryId)?.amountLimit || 2200;

  // Run Real-time Simulation
  const simulation = useMemo(() => {
    return simulatePurchaseImpact({
      price: priceNum,
      monthlyIncome: profile.monthlyIncome,
      workHoursPerDay: workHours,
      variableBudgetLimit: varBudget,
      totalFixedSpent,
      totalVariableSpent,
      currentDayOfMonth,
      totalDaysInMonth,
      currentHp: gamification.currentHp,
    });
  }, [
    priceNum,
    profile.monthlyIncome,
    workHours,
    varBudget,
    totalFixedSpent,
    totalVariableSpent,
    currentDayOfMonth,
    totalDaysInMonth,
    gamification.currentHp,
  ]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Action: Add to 30-Day Wishlist Quarantine
  const handleAddToWishlist = () => {
    if (!itemTitle.trim() || priceNum <= 0) return;

    const newItem = repository.addWishlistItem({
      userId: profile.id,
      title: itemTitle.trim(),
      price: priceNum,
      categoryId: selectedCategoryId,
      reason: reasonInput.trim() || null,
      coolingOffDays: 30,
      status: 'WAITING',
    });

    pushWishlistItemToSupabase(newItem);
    setWishlist(repository.getWishlist());
    setItemTitle('');
    setItemPriceInput('');
    setReasonInput('');
    showToast('⏳ Item guardado na Quarentena de 30 Dias! Finny agradece o autocontrole!');
    setActiveTab('WISHLIST');
  };

  // Action: Direct Buy & Log
  const handleDirectBuy = () => {
    if (priceNum <= 0) return;

    onSaveTransaction({
      amount: priceNum,
      categoryId: selectedCategoryId,
      description: itemTitle.trim() || 'Compra Planejada',
      isFixed: false,
      type: 'EXPENSE',
      source: 'APP',
    });

    setItemTitle('');
    setItemPriceInput('');
    setReasonInput('');
    showToast('💸 Compra registrada no Finance Quest!');
    onClose();
  };

  // Action: Buy Wishlist Item after Quarantine
  const handleBuyWishlistItem = (item: WishlistItem) => {
    onSaveTransaction({
      amount: item.price,
      categoryId: item.categoryId || categories[0]?.id || 'cat-leisure',
      description: item.title,
      isFixed: false,
      type: 'EXPENSE',
      source: 'APP',
    });

    const updated = { ...item, status: 'BOUGHT' as const };
    repository.updateWishlistItem(item.id, { status: 'BOUGHT' });
    pushWishlistItemToSupabase(updated);
    setWishlist(repository.getWishlist());
    showToast(`🎉 Parabéns! Você comprou ${item.title} após a quarentena consciente!`);
  };

  // Action: Give up on Wishlist Item (Save Money & Earn XP!)
  const handleGiveUpWishlistItem = (item: WishlistItem) => {
    const updated = { ...item, status: 'CANCELLED' as const };
    repository.updateWishlistItem(item.id, { status: 'CANCELLED' });
    pushWishlistItemToSupabase(updated);

    // Award XP for wisdom & self-control
    const state = repository.getGamificationState();
    state.totalXp += 75;
    repository.saveGamificationState(state);

    setWishlist(repository.getWishlist());
    showToast(`🏆 Incrível! Você resistiu e economizou ${formatCurrency(item.price)}! (+75 XP de Sabedoria)`);
  };

  // Action: Delete from Wishlist
  const handleDeleteWishlistItem = (id: string) => {
    repository.deleteWishlistItem(id);
    deleteWishlistItemFromSupabase(id);
    setWishlist(repository.getWishlist());
  };

  if (!isOpen) return null;

  const activeWishlistItems = wishlist.filter((item) => item.status === 'WAITING' || item.status === 'APPROVED');
  const targetCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                <span>Escudo Anti-Impulso</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                  Finny Shield
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Simule compras e evite armadilhas financeiras</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('SIMULATOR')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'SIMULATOR'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Simulador &quot;Posso Comprar?&quot;</span>
          </button>

          <button
            onClick={() => setActiveTab('WISHLIST')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'WISHLIST'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Quarentena 30 Dias ({activeWishlistItems.length})</span>
          </button>
        </div>

        {/* Toast Feedback */}
        <AnimatePresence>
          {feedbackToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="m-3 p-2.5 rounded-2xl bg-indigo-600/90 text-white text-xs font-bold text-center shadow-lg border border-indigo-400/40"
            >
              {feedbackToast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 1: Simulator */}
        {activeTab === 'SIMULATOR' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Input Form */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    O que você quer comprar?
                  </label>
                  <input
                    type="text"
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    placeholder="Ex: Fone Bluetooth, Tênis, Jantar..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Valor do Item (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemPriceInput}
                    onChange={(e) => setItemPriceInput(e.target.value)}
                    placeholder="Ex: 350.00"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Jornada (h/dia)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={workHours}
                    onChange={(e) => setWorkHours(Math.max(1, Math.min(24, parseFloat(e.target.value) || 6)))}
                    placeholder="Ex: 6"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Simulation Results (Live Feedback) */}
            {priceNum > 0 ? (
              <div className="space-y-3">
                {/* Mascot Mood & Immediate Verdict */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 flex items-center gap-4">
                  <MascotFinny mood={simulation.simulatedHpResult.mood} hp={simulation.simulatedHpResult.hp} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        simulation.verdict === 'SAFE'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : simulation.verdict === 'WARNING'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}>
                        {simulation.verdict === 'SAFE' ? 'Compra Segura' : simulation.verdict === 'WARNING' ? 'Atenção ao Ritmo' : 'Risco Crítico'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-snug">
                      {simulation.verdictMessage}
                    </p>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Hours of Life Cost */}
                  <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Custo em Trabalho</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-sm font-black text-white block">
                        {simulation.workCost.workCostMessage}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        (R$ {simulation.workCost.hourlyRate}/hora ganha)
                      </span>
                    </div>
                  </div>

                  {/* HP Impact */}
                  <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      <span>Impacto no HP</span>
                    </div>
                    <div className="mt-1">
                      <div className="flex items-center gap-1.5 text-sm font-black">
                        <span className="text-slate-400">{simulation.currentHpResult.hp}%</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className={simulation.simulatedHpResult.hp < 60 ? 'text-rose-400' : 'text-amber-400'}>
                          {simulation.simulatedHpResult.hp}%
                        </span>
                        {simulation.hpDrop > 0 && (
                          <span className="text-[10px] text-rose-400 font-semibold">
                            (-{simulation.hpDrop} HP)
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Após lançar R$ {priceNum.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Healthy Savings Alternative Recommendation */}
                {simulation.verdict !== 'SAFE' && (
                  <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs flex items-start gap-2.5 text-indigo-200">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-indigo-100">Plano de Compra Inteligente do Finny:</span>
                      <span className="text-[11px] text-indigo-200/90 leading-relaxed">
                        Em vez de comprar no impulso hoje, guarde <strong>{formatCurrency(simulation.suggestedWeeklySaving)}/semana</strong> em {targetCategory.name}. Em <strong>{simulation.recommendedSavingWeeks} semanas</strong> você compra sem perder 1 único ponto de HP!
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={handleAddToWishlist}
                    className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-transform active:scale-95"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Guardar na Quarentena (30 Dias)</span>
                  </button>

                  <button
                    onClick={handleDirectBuy}
                    className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Comprar Agora</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                <ShieldCheck className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-semibold text-slate-400">
                  Digite o nome e o valor da compra acima para ver o impacto no Finny e em horas de trabalho.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Wishlist Quarantine */}
        {activeTab === 'WISHLIST' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {activeWishlistItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                <Clock className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-bold text-slate-300">Nenhum desejo em quarentena no momento.</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Sempre que tiver vontade de comprar algo por impulso, guarde aqui por 30 dias. Se a vontade persistir, compre consciente!
                </p>
              </div>
            ) : (
              activeWishlistItems.map((item) => {
                const progress = calculateCoolingOffProgress(item.createdAt, item.coolingOffDays);
                const cat = categories.find((c) => c.id === item.categoryId) || categories[0];

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat?.icon || '🛍️'}</span>
                        <div>
                          <h4 className="text-xs font-black text-white">{item.title}</h4>
                          <span className="text-[10px] text-slate-400">{cat?.name || 'Geral'}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-100 block">
                          {formatCurrency(item.price)}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* 30-Day Cooling-off Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 flex items-center gap-1 font-semibold">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          {progress.isReady ? (
                            <strong className="text-emerald-400">✨ Quarentena Completa (30 dias)!</strong>
                          ) : (
                            <span>Faltam {progress.remainingDays} dias</span>
                          )}
                        </span>
                        <span className="text-slate-500 font-bold">{progress.percentage}%</span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress.isReady ? 'bg-emerald-400' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Decision Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
                      <button
                        onClick={() => handleGiveUpWishlistItem(item)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                        title="Desistir da compra e ganhar XP de sabedoria"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Desisti (+75 XP)</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleBuyWishlistItem(item)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                            progress.isReady
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Comprar</span>
                        </button>

                        <button
                          onClick={() => handleDeleteWishlistItem(item.id)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remover da lista"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
