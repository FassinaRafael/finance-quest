'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, User, Settings2 } from 'lucide-react';
import { StreakFlame } from '@/components/gamification/StreakFlame';
import { getLevelInfo } from '@/lib/gamification/hp-engine';
import type { GamificationState, Profile } from '@/types/database';

interface HeaderProps {
  profile: Profile;
  gamification: GamificationState;
  onOpenAchievements?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  gamification,
  onOpenAchievements,
  onOpenSettings,
}) => {
  const levelInfo = getLevelInfo(gamification.totalXp);

  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl shadow-lg">
      {/* User & Level Info */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 border border-indigo-400/40">
            <User className="w-6 h-6" />
          </div>
          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-amber-500 text-[10px] font-black text-slate-950 shadow-sm">
            Lv.{levelInfo.level}
          </span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-black text-white">{profile.displayName}</h1>
            <span className="text-[11px] font-semibold text-indigo-300">
              • {levelInfo.title}
            </span>
          </div>

          {/* XP Progress Bar */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-28 sm:w-36 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelInfo.progressPercentage}%` }}
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full"
              />
            </div>
            <span className="text-[10px] font-bold text-amber-400">
              {levelInfo.currentLevelXp}/{levelInfo.nextLevelXp} XP
            </span>
          </div>
        </div>
      </div>

      {/* Streak Flame & Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <StreakFlame
          currentStreak={gamification.currentStreak}
          maxStreak={gamification.maxStreak}
        />

        <div className="flex items-center gap-1.5">
          {onOpenAchievements && (
            <button
              onClick={onOpenAchievements}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-amber-400 transition-transform active:scale-95 shadow-sm"
              title="Ver Conquistas"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition-transform active:scale-95 shadow-sm"
              title="Backup & Configurações"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
