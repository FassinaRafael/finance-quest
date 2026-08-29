'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy } from 'lucide-react';

interface StreakFlameProps {
  currentStreak: number;
  maxStreak: number;
  className?: string;
}

export const StreakFlame: React.FC<StreakFlameProps> = ({
  currentStreak,
  maxStreak,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20 backdrop-blur-md ${className}`}>
      {/* Animated Flame Icon */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          rotate: [-3, 3, -3],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.8,
          ease: 'easeInOut',
        }}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-md shadow-orange-500/30"
      >
        <Flame className="w-5 h-5 text-white fill-white" />
      </motion.div>

      {/* Streak Details */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-black text-amber-400">
            {currentStreak} {currentStreak === 1 ? 'Dia' : 'Dias'}
          </span>
          <span className="text-xs font-semibold text-slate-300">de Foco</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Trophy className="w-3 h-3 text-amber-500/80" />
          <span>Recorde: {maxStreak} dias</span>
        </div>
      </div>
    </div>
  );
};
