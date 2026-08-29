'use client';

import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Plus, Trophy, Sparkles } from 'lucide-react';
import { repository } from '@/lib/storage/repository';
import { syncFromSupabase, subscribeToRealtime, pushTransactionToSupabase, pushGamificationToSupabase } from '@/lib/supabase/sync';
import { Header } from '@/components/dashboard/Header';
import { MascotFinny } from '@/components/gamification/MascotFinny';
import { HealthBar } from '@/components/gamification/HealthBar';
import { BudgetOverview } from '@/components/dashboard/BudgetOverview';
import { SpendingChart } from '@/components/dashboard/SpendingChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { NumpadSheet } from '@/components/quick-input/NumpadSheet';
import { CategoryBudgetManager } from '@/components/budgets/CategoryBudgetManager';
import { TelegramSimulatorModal } from '@/components/dashboard/TelegramSimulatorModal';
import { AchievementsDrawer } from '@/components/gamification/AchievementsDrawer';
import { AchievementModal } from '@/components/gamification/AchievementModal';
import { DataBackupModal } from '@/components/settings/DataBackupModal';
import { BottomNavigation, type TabType } from '@/components/layout/BottomNavigation';
import { calculateHealthPoints } from '@/lib/gamification/hp-engine';
import {
  getLocalDateString,
  parseYearMonth,
  getDaysInMonth,
} from '@/lib/utils/date-utils';
import type {
  Profile,
  Category,
  Transaction,
  Budget,
  GamificationState,
  Achievement,
  UserAchievement,
  TransactionType,
} from '@/types/database';

const emptySubscribe = () => () => {};

export default function Home() {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');
  const [profile, setProfile] = useState<Profile>(() => repository.getProfile());
  const [categories, setCategories] = useState<Category[]>(() => repository.getCategories());
  const [transactions, setTransactions] = useState<Transaction[]>(() => repository.getTransactions());
  const [budgets, setBudgets] = useState<Budget[]>(() => repository.getBudgets());
  const [gamification, setGamification] = useState<GamificationState>(() => repository.getGamificationState());
  const [achievements, setAchievements] = useState<Achievement[]>(() => repository.getAchievements());
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>(() => repository.getUserAchievements());

  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isAchievementsDrawerOpen, setIsAchievementsDrawerOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [xpToast, setXpToast] = useState<{ show: boolean; text: string }>({ show: false, text: '' });

  // Sync state on repository changes
  useEffect(() => {
    const syncState = () => {
      setProfile(repository.getProfile());
      setCategories(repository.getCategories());
      setTransactions(repository.getTransactions());
      setBudgets(repository.getBudgets());
      setGamification(repository.getGamificationState());
      setAchievements(repository.getAchievements());
      setUserAchievements(repository.getUserAchievements());
    };

    const unsubscribe = repository.subscribe(syncState);

    // Initial fetch from Supabase + subscribe to Realtime
    syncFromSupabase().then(() => syncState());
    const unsubscribeRealtime = subscribeToRealtime();

    return () => {
      unsubscribe();
      unsubscribeRealtime();
    };
  }, []);

  // Compute date details for current month
  const today = getLocalDateString(new Date(), profile.timezone);
  const dateParts = parseYearMonth(today);
  const totalDays = getDaysInMonth(dateParts.year, dateParts.month);
  const daysRemaining = Math.max(0, totalDays - dateParts.day);

  // Separate Fixed vs Variable expenses for current month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const parts = parseYearMonth(t.transactionDate);
      return parts.year === dateParts.year && parts.month === dateParts.month;
    });
  }, [transactions, dateParts.year, dateParts.month]);

  const totalFixedSpent = useMemo(() => {
    return Number(
      monthTransactions
        .filter((t) => t.type === 'EXPENSE' && t.isFixed)
        .reduce((sum, t) => sum + t.amount, 0)
        .toFixed(2)
    );
  }, [monthTransactions]);

  const totalVariableSpent = useMemo(() => {
    return Number(
      monthTransactions
        .filter((t) => t.type === 'EXPENSE' && !t.isFixed)
        .reduce((sum, t) => sum + t.amount, 0)
        .toFixed(2)
    );
  }, [monthTransactions]);

  const varBudget = budgets.find((b) => !b.categoryId)?.amountLimit || 2200;

  // Real-time HP result
  const hpResult = useMemo(() => {
    return calculateHealthPoints({
      monthlyIncome: profile.monthlyIncome,
      variableBudgetLimit: varBudget,
      totalFixedSpent,
      totalVariableSpent,
      currentDayOfMonth: dateParts.day,
      totalDaysInMonth: totalDays,
      currentHp: gamification.currentHp,
    });
  }, [
    profile.monthlyIncome,
    varBudget,
    totalFixedSpent,
    totalVariableSpent,
    dateParts.day,
    totalDays,
    gamification.currentHp,
  ]);

  const handleSaveTransaction = (data: {
    amount: number;
    categoryId: string;
    description: string;
    isFixed: boolean;
    type: TransactionType;
    source: 'APP' | 'VOICE' | 'TELEGRAM';
  }) => {
    const result = repository.addTransaction({
      amount: data.amount,
      categoryId: data.categoryId,
      description: data.description,
      isFixed: data.isFixed,
      type: data.type,
      source: data.source,
    });

    // Push to Supabase in the background (non-blocking)
    pushTransactionToSupabase(result.transaction);
    pushGamificationToSupabase(repository.getGamificationState());

    // Show celebratory XP toast
    setXpToast({
      show: true,
      text: `✨ Registro salvo! +${result.xpGained} XP obtidos`,
    });
    setTimeout(() => setXpToast({ show: false, text: '' }), 3500);

    // If new badge unlocked, trigger modal
    if (result.newAchievement) {
      setUnlockedAchievement(result.newAchievement);
    }

    // Return to dashboard if on quick log
    if (activeTab === 'QUICK_LOG') {
      setActiveTab('DASHBOARD');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    repository.deleteTransaction(id);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-24 px-3 sm:px-6 pt-4 max-w-2xl mx-auto w-full">
      {/* XP Toast Notification */}
      <AnimatePresence>
        {xpToast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-black shadow-2xl flex items-center gap-2 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{xpToast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <Header
        profile={profile}
        gamification={gamification}
        onOpenAchievements={() => setIsAchievementsDrawerOpen(true)}
        onOpenSettings={() => setIsBackupModalOpen(true)}
      />

      {/* View Switcher based on Tab */}
      <div className="mt-4">
        {activeTab === 'DASHBOARD' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Mascot Finny Hero Card */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-slate-800 backdrop-blur-2xl shadow-xl flex flex-col items-center">
              <MascotFinny mood={hpResult.mood} hp={hpResult.hp} size="lg" />

              <div className="w-full mt-4">
                <HealthBar hpResult={hpResult} />
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('QUICK_LOG')}
                className="p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-teal-500/20 hover:from-indigo-600/30 hover:to-teal-500/30 border border-indigo-500/30 flex items-center justify-center gap-2 text-indigo-300 font-bold text-xs transition-all active:scale-95 shadow-md"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Registrar Gasto Rápido</span>
              </button>

              <button
                onClick={() => setIsTelegramModalOpen(true)}
                className="p-3.5 rounded-2xl bg-gradient-to-tr from-sky-600/20 to-blue-500/20 hover:from-sky-600/30 hover:to-blue-500/30 border border-sky-500/30 flex items-center justify-center gap-2 text-sky-300 font-bold text-xs transition-all active:scale-95 shadow-md"
              >
                <Bot className="w-4 h-4 text-sky-400" />
                <span>Simular Bot Telegram</span>
              </button>
            </div>

            {/* Budget Breakdown (Fixed vs Variable) */}
            <BudgetOverview
              profile={profile}
              budgets={budgets}
              totalFixedSpent={totalFixedSpent}
              totalVariableSpent={totalVariableSpent}
              daysRemainingInMonth={daysRemaining}
            />

            {/* Interactive Visual Spending Chart */}
            <SpendingChart
              transactions={transactions}
              categories={categories}
              budgets={budgets}
            />

            {/* Timeline */}
            <RecentTransactions
              transactions={transactions}
              categories={categories}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </motion.div>
        )}

        {activeTab === 'QUICK_LOG' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <NumpadSheet
              categories={categories}
              onSaveTransaction={handleSaveTransaction}
            />
          </motion.div>
        )}

        {activeTab === 'BUDGETS' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <CategoryBudgetManager
              profile={profile}
              categories={categories}
              budgets={budgets}
            />

            <SpendingChart
              transactions={transactions}
              categories={categories}
              budgets={budgets}
            />
          </motion.div>
        )}

        {activeTab === 'HISTORY' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <RecentTransactions
              transactions={transactions}
              categories={categories}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </motion.div>
        )}

        {activeTab === 'TELEGRAM' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-slate-900/90 border border-sky-500/40 text-center space-y-4 shadow-xl"
          >
            <div className="w-16 h-16 rounded-3xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center mx-auto text-sky-400">
              <Bot className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-white">Bot do Telegram Integrado</h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Registre gastos do celular a qualquer momento enviando texto (ex: `35 almoço`) ou áudio de voz diretamente pelo Telegram!
            </p>
            <button
              onClick={() => setIsTelegramModalOpen(true)}
              className="py-3 px-6 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-transform active:scale-95 shadow-lg shadow-sky-500/25"
            >
              Abrir Simulador Interativo do Bot
            </button>
          </motion.div>
        )}

        {activeTab === 'ACHIEVEMENTS' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/40 text-center space-y-4 shadow-xl"
          >
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-white">Conquistas & Disciplina</h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Desbloqueie medalhas mantendo streaks de consistência, batendo metas orçamentárias e mantendo a saúde do Finny!
            </p>
            <button
              onClick={() => setIsAchievementsDrawerOpen(true)}
              className="py-3 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-transform active:scale-95 shadow-lg shadow-amber-500/25"
            >
              Ver Quadro Completo de Conquistas
            </button>
          </motion.div>
        )}
      </div>

      {/* Telegram Interactive Simulator Modal */}
      <TelegramSimulatorModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        categories={categories}
        profile={profile}
        gamification={gamification}
        budgets={budgets}
        transactions={transactions}
        onSaveTransaction={(data) => handleSaveTransaction({ ...data, source: 'TELEGRAM' })}
      />

      {/* Achievements Showcase Drawer */}
      <AchievementsDrawer
        isOpen={isAchievementsDrawerOpen}
        onClose={() => setIsAchievementsDrawerOpen(false)}
        achievements={achievements}
        userAchievements={userAchievements}
        totalXp={gamification.totalXp}
      />

      {/* Data Backup & Export Modal */}
      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      {/* New Achievement Celebration Modal */}
      <AchievementModal
        achievement={unlockedAchievement}
        onClose={() => setUnlockedAchievement(null)}
      />

      {/* Mobile-First Bottom Dock */}
      <BottomNavigation
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'TELEGRAM') setIsTelegramModalOpen(true);
        }}
      />
    </main>
  );
}
