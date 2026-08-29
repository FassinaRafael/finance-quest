'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ShieldCheck, Flame, AlertCircle } from 'lucide-react';
import type { HPCalculationResult } from '@/types/gamification';

interface HealthBarProps {
  hpResult: HPCalculationResult;
  className?: string;
}

export const HealthBar: React.FC<HealthBarProps> = ({ hpResult, className = '' }) => {
  const { hp, burnRateRatio, isInGracePeriod, statusMessage } = hpResult;

  // Determine bar color gradient
  const getGradient = (currentHp: number) => {
    if (currentHp >= 80) return 'from-emerald-500 via-teal-400 to-green-400';
    if (currentHp >= 50) return 'from-blue-500 via-indigo-500 to-cyan-400';
    if (currentHp >= 20) return 'from-amber-500 via-yellow-500 to-orange-400';
    return 'from-rose-600 via-red-500 to-pink-500';
  };

  const getGlowColor = (currentHp: number) => {
    if (currentHp >= 80) return 'rgba(16, 185, 129, 0.4)';
    if (currentHp >= 50) return 'rgba(59, 130, 246, 0.4)';
    if (currentHp >= 20) return 'rgba(245, 158, 11, 0.4)';
    return 'rgba(239, 68, 68, 0.5)';
  };

  return (
    <div className={`p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: hp < 20 ? 0.6 : 2 }}
            className="text-rose-400"
          >
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
          </motion.div>
          <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            HP Financeiro
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isInGracePeriod && (
            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Buffer Início de Mês
            </span>
          )}

          <span className="text-lg font-black text-white">
            {hp}<span className="text-xs font-normal text-slate-400">/100</span>
          </span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(4, hp)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${getGradient(hp)} shadow-lg`}
          style={{
            boxShadow: `0 0 12px ${getGlowColor(hp)}`,
          }}
        />
      </div>

      {/* Footer Info */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          {burnRateRatio > 1.0 ? (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>
            Ritmo: <strong className="text-slate-200">{burnRateRatio}x</strong> do ideal
          </span>
        </div>

        <p className="text-[11px] text-slate-400 truncate max-w-[220px]" title={statusMessage}>
          {statusMessage}
        </p>
      </div>
    </div>
  );
};
