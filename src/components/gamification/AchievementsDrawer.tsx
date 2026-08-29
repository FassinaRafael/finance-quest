'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Lock, CheckCircle2, X } from 'lucide-react';
import type { Achievement, UserAchievement } from '@/types/database';

interface AchievementsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  totalXp: number;
}

export const AchievementsDrawer: React.FC<AchievementsDrawerProps> = ({
  isOpen,
  onClose,
  achievements,
  userAchievements,
  totalXp,
}) => {
  if (!isOpen) return null;

  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl bg-slate-950 border border-amber-500/30 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  Quadro de Conquistas
                  <span className="text-xs font-bold text-amber-400">
                    ({userAchievements.length}/{achievements.length})
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Total acumulado: {totalXp} XP</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Achievement List */}
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {achievements.map((ach) => {
              const isUnlocked = unlockedIds.has(ach.id);

              return (
                <div
                  key={ach.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isUnlocked
                      ? 'bg-slate-900/90 border-amber-500/30 shadow-md shadow-amber-500/5'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
                        isUnlocked
                          ? 'bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border-amber-500/40'
                          : 'bg-slate-900 border-slate-800 grayscale'
                      }`}
                    >
                      <span>{ach.icon}</span>
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">{ach.title}</span>
                        {isUnlocked && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                        {ach.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-black text-amber-400 shrink-0 pl-2">
                    {isUnlocked ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px]">
                        +{ach.xpReward} XP
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-500">
                        <Lock className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Bloqueado</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
