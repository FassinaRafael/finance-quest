'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { MascotMood } from '@/types/gamification';

interface MascotFinnyProps {
  mood: MascotMood;
  hp: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MascotFinny: React.FC<MascotFinnyProps> = ({
  mood,
  hp,
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-44 h-44',
  };

  // Color pallete based on mood
  const moodConfig = {
    ZEN: {
      primaryColor: '#10B981', // Emerald
      secondaryColor: '#34D399',
      bellyColor: '#A7F3D0',
      auraColor: 'rgba(16, 185, 129, 0.35)',
      moodLabel: 'Zen & Próspero',
      moodEmoji: '😎',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    NEUTRAL: {
      primaryColor: '#3B82F6', // Blue
      secondaryColor: '#60A5FA',
      bellyColor: '#BFDBFE',
      auraColor: 'rgba(59, 130, 246, 0.35)',
      moodLabel: 'Atento & Focado',
      moodEmoji: '🧐',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    },
    WARNING: {
      primaryColor: '#F59E0B', // Amber
      secondaryColor: '#FBBF24',
      bellyColor: '#FDE68A',
      auraColor: 'rgba(245, 158, 11, 0.35)',
      moodLabel: 'Em Alerta',
      moodEmoji: '😅',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    PANIC: {
      primaryColor: '#EF4444', // Red
      secondaryColor: '#F87171',
      bellyColor: '#FECACA',
      auraColor: 'rgba(239, 68, 68, 0.45)',
      moodLabel: 'K.O. / Socorro!',
      moodEmoji: '😵',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    },
  };

  const config = moodConfig[mood];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Glow Aura */}
      <motion.div
        animate={{
          scale: mood === 'PANIC' ? [1, 1.15, 1] : [1, 1.06, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          repeat: Infinity,
          duration: mood === 'PANIC' ? 0.8 : 3,
          ease: 'easeInOut',
        }}
        className="relative flex items-center justify-center"
      >
        <div
          className="absolute inset-0 rounded-full blur-2xl filter"
          style={{ background: config.auraColor }}
        />

        {/* SVG Mascot Character */}
        <motion.div
          animate={
            mood === 'PANIC'
              ? { y: [0, -6, 0, 4, 0], rotate: [-2, 2, -2] }
              : mood === 'ZEN'
              ? { y: [0, -8, 0] }
              : { y: [0, -4, 0] }
          }
          transition={{
            repeat: Infinity,
            duration: mood === 'PANIC' ? 0.6 : 3.5,
            ease: 'easeInOut',
          }}
          className={`${sizeMap[size]} relative z-10 cursor-pointer drop-shadow-xl`}
        >
          <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Mascot Body */}
            <motion.ellipse
              cx="80"
              cy="85"
              rx="55"
              ry="50"
              fill={config.primaryColor}
              animate={{
                ry: mood === 'PANIC' ? [50, 48, 50] : [50, 53, 50],
              }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            />

            {/* Belly */}
            <ellipse cx="80" cy="95" rx="35" ry="30" fill={config.bellyColor} opacity="0.9" />

            {/* Coins / Pocket Emblem */}
            <circle cx="80" cy="95" r="14" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
            <text
              x="80"
              y="100"
              textAnchor="middle"
              fill="#78350F"
              fontSize="12"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              $
            </text>

            {/* Ears / Antennas */}
            <motion.path
              d="M 45 42 Q 35 15 52 28"
              stroke={config.primaryColor}
              strokeWidth="10"
              strokeLinecap="round"
              animate={{ rotate: mood === 'PANIC' ? [-8, 8, -8] : [-3, 3, -3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ originX: '45px', originY: '42px' }}
            />
            <motion.path
              d="M 115 42 Q 125 15 108 28"
              stroke={config.primaryColor}
              strokeWidth="10"
              strokeLinecap="round"
              animate={{ rotate: mood === 'PANIC' ? [8, -8, 8] : [3, -3, 3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ originX: '115px', originY: '42px' }}
            />

            {/* Eyes & Expressions based on Mood */}
            {mood === 'ZEN' && (
              <>
                {/* Sunglasses */}
                <rect x="45" y="60" width="30" height="18" rx="6" fill="#1E293B" />
                <rect x="85" y="60" width="30" height="18" rx="6" fill="#1E293B" />
                <line x1="75" y1="68" x2="85" y2="68" stroke="#1E293B" strokeWidth="4" />
                {/* Sun reflections */}
                <line x1="49" y1="64" x2="57" y2="74" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                <line x1="89" y1="64" x2="97" y2="74" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
                {/* Smug Smile */}
                <path d="M 68 85 Q 80 94 92 85" stroke="#064E3B" strokeWidth="3.5" strokeLinecap="round" />
                {/* Sparkle */}
                <motion.polygon
                  points="130,45 133,52 140,55 133,58 130,65 127,58 120,55 127,52"
                  fill="#FDE047"
                  animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              </>
            )}

            {mood === 'NEUTRAL' && (
              <>
                {/* Cute Open Eyes */}
                <ellipse cx="60" cy="68" rx="7" ry="9" fill="#0F172A" />
                <ellipse cx="100" cy="68" rx="7" ry="9" fill="#0F172A" />
                <circle cx="58" cy="65" r="3" fill="#FFFFFF" />
                <circle cx="98" cy="65" r="3" fill="#FFFFFF" />
                {/* Soft Smile */}
                <path d="M 70 84 Q 80 91 90 84" stroke="#1E3A8A" strokeWidth="3" strokeLinecap="round" fill="none" />
                {/* Cheeks */}
                <circle cx="48" cy="76" r="6" fill="#F472B6" opacity="0.4" />
                <circle cx="112" cy="76" r="6" fill="#F472B6" opacity="0.4" />
              </>
            )}

            {mood === 'WARNING' && (
              <>
                {/* Concerned Eyes */}
                <ellipse cx="60" cy="68" rx="8" ry="7" fill="#0F172A" />
                <ellipse cx="100" cy="68" rx="8" ry="7" fill="#0F172A" />
                <circle cx="58" cy="66" r="2.5" fill="#FFFFFF" />
                <circle cx="98" cy="66" r="2.5" fill="#FFFFFF" />
                {/* Wavy Mouth */}
                <path d="M 68 85 Q 75 80 82 85 Q 89 89 94 84" stroke="#78350F" strokeWidth="3" strokeLinecap="round" fill="none" />
                {/* Sweat Droplet */}
                <motion.path
                  d="M 125 55 C 125 50 118 60 118 65 C 118 69 122 72 125 72 C 128 72 132 69 132 65 C 132 60 125 50 125 55 Z"
                  fill="#60A5FA"
                  animate={{ y: [0, 8, 0], opacity: [0.8, 1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                />
              </>
            )}

            {mood === 'PANIC' && (
              <>
                {/* Spiral / Dizzy Eyes */}
                <path d="M 52 68 Q 60 60 68 68 Q 60 76 52 68" stroke="#7F1D1D" strokeWidth="3" fill="none" />
                <line x1="53" y1="62" x2="67" y2="74" stroke="#7F1D1D" strokeWidth="3" strokeLinecap="round" />
                <line x1="67" y1="62" x2="53" y2="74" stroke="#7F1D1D" strokeWidth="3" strokeLinecap="round" />

                <line x1="93" y1="62" x2="107" y2="74" stroke="#7F1D1D" strokeWidth="3" strokeLinecap="round" />
                <line x1="107" y1="62" x2="93" y2="74" stroke="#7F1D1D" strokeWidth="3" strokeLinecap="round" />

                {/* Open Screaming Mouth */}
                <ellipse cx="80" cy="86" rx="9" ry="12" fill="#7F1D1D" />
                {/* Band-Aid */}
                <rect x="35" y="78" width="18" height="8" rx="2" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" transform="rotate(-20 35 78)" />
                {/* Alert Warning Symbol */}
                <motion.polygon
                  points="80,18 90,36 70,36"
                  fill="#EF4444"
                  stroke="#991B1B"
                  strokeWidth="1.5"
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                />
                <text x="80" y="33" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">!</text>
              </>
            )}
          </svg>
        </motion.div>
      </motion.div>

      {/* Mood Badge */}
      <div
        className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 shadow-sm ${config.badgeBg}`}
      >
        <span>{config.moodEmoji}</span>
        <span>Finny: {config.moodLabel} ({hp}% HP)</span>
      </div>
    </div>
  );
};
