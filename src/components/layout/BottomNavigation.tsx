'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, PlusCircle, History, Bot, Target } from 'lucide-react';

export type TabType = 'DASHBOARD' | 'QUICK_LOG' | 'BUDGETS' | 'HISTORY' | 'TELEGRAM' | 'ACHIEVEMENTS';

interface BottomNavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  className?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onChangeTab,
  className = '',
}) => {
  const tabs = [
    { id: 'DASHBOARD', label: 'Início', icon: LayoutDashboard },
    { id: 'BUDGETS', label: 'Metas', icon: Target },
    { id: 'QUICK_LOG', label: 'Registrar', icon: PlusCircle, isMain: true },
    { id: 'HISTORY', label: 'Histórico', icon: History },
    { id: 'TELEGRAM', label: 'Bot', icon: Bot },
  ];

  return (
    <nav
      className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-md px-3 py-2 rounded-3xl bg-slate-950/90 border border-slate-800/80 backdrop-blur-2xl shadow-2xl shadow-black/80 flex items-center justify-around ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.isMain) {
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id as TabType)}
              className="relative -top-4 flex flex-col items-center justify-center p-3.5 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 text-slate-950 shadow-lg shadow-indigo-500/40 border-2 border-slate-900 active:scale-90 transition-transform"
              title="Registrar Novo Gasto"
            >
              <Icon className="w-6 h-6 text-white stroke-[2.5]" />
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id as TabType)}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-2xl transition-colors relative ${
              isActive ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">{tab.label}</span>
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-400"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
