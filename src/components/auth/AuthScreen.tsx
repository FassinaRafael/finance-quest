'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

type AuthTab = 'LOGIN' | 'SIGNUP';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<AuthTab>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
    setSuccessMsg(null);
  }, []);

  const handleTabSwitch = (nextTab: AuthTab) => {
    setTab(nextTab);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (tab === 'SIGNUP') {
      if (!displayName.trim()) {
        setError('Informe seu nome de aventureiro.');
        setLoading(false);
        return;
      }
      const result = await signUp(email.trim(), password, displayName.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMsg('Conta criada! Verifique seu email para confirmar o cadastro.');
      }
    } else {
      const result = await signIn(email.trim(), password);
      if (result.error) {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo & Mascot */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30 border border-indigo-400/40"
          >
            <span className="text-4xl">🐉</span>
          </motion.div>
          <h1 className="text-2xl font-black text-white">Finance Quest</h1>
          <p className="text-sm text-slate-400 mt-1">
            Controle financeiro gamificado com o Finny!
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-800/80">
            <button
              type="button"
              onClick={() => handleTabSwitch('LOGIN')}
              className={`flex-1 py-3.5 text-xs font-black transition-all ${
                tab === 'LOGIN'
                  ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('SIGNUP')}
              className={`flex-1 py-3.5 text-xs font-black transition-all ${
                tab === 'SIGNUP'
                  ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <AnimatePresence mode="wait">
              {tab === 'SIGNUP' && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Nome do Aventureiro
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Seu nome de herói"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-700/60 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                      maxLength={50}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-700/60 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-12 py-3 rounded-2xl bg-slate-950/80 border border-slate-700/60 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-start gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex items-start gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs"
                >
                  <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${
                tab === 'LOGIN'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25'
              } ${loading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <span>{tab === 'LOGIN' ? 'Entrar na Aventura' : 'Começar Jornada'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Hint */}
        <p className="text-center text-[11px] text-slate-600 mt-6">
          Registre gastos pelo Telegram 🤖 e acompanhe pelo dashboard ✨
        </p>
      </motion.div>
    </div>
  );
};
