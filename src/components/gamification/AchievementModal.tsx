'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Award, Sparkles, X } from 'lucide-react';
import type { Achievement } from '@/types/database';

interface AchievementModalProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export const AchievementModal: React.FC<AchievementModalProps> = ({
  achievement,
  onClose,
}) => {
  useEffect(() => {
    if (achievement) {
      // Fire vibrant confetti celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'],
      });
    }
  }, [achievement]);

  if (!achievement) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-sm p-6 overflow-hidden rounded-3xl bg-slate-900 border border-amber-500/40 shadow-2xl shadow-amber-500/20 text-center"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl -z-10" />

          {/* Icon Badge */}
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-4xl shadow-xl shadow-amber-500/30 border-2 border-yellow-200">
            <span>{achievement.icon}</span>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute -top-2 -right-2 text-yellow-300"
            >
              <Sparkles className="w-5 h-5 fill-yellow-300" />
            </motion.div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            Nova Conquista Desbloqueada!
          </div>

          <h3 className="text-xl font-black text-white mb-2">{achievement.title}</h3>
          <p className="text-sm text-slate-300 mb-5 leading-relaxed">
            {achievement.description}
          </p>

          <div className="p-3 mb-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-center gap-2">
            <span className="text-xs text-slate-400">Recompensa:</span>
            <span className="text-sm font-black text-amber-400">+{achievement.xpReward} XP</span>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm transition-transform active:scale-95 shadow-lg shadow-amber-500/25"
          >
            Incrível! Continuar
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
