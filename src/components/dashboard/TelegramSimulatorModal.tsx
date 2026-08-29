'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, X } from 'lucide-react';
import { parseExpenseText } from '@/lib/telegram/parser';
import { formatTelegramSuccessMessage } from '@/lib/telegram/client';
import { calculateHealthPoints } from '@/lib/gamification/hp-engine';
import { parseYearMonth, getDaysInMonth, getLocalDateString } from '@/lib/utils/date-utils';
import type { Category, Profile, GamificationState, Budget, Transaction } from '@/types/database';

interface TelegramSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  profile: Profile;
  gamification: GamificationState;
  budgets: Budget[];
  transactions: Transaction[];
  onSaveTransaction: (data: {
    amount: number;
    categoryId: string;
    description: string;
    isFixed: boolean;
    type: 'EXPENSE' | 'INCOME';
    source: 'TELEGRAM';
  }) => void;
}

interface ChatMessage {
  id: string;
  sender: 'USER' | 'BOT';
  text: string;
  timestamp: string;
}

export const TelegramSimulatorModal: React.FC<TelegramSimulatorModalProps> = ({
  isOpen,
  onClose,
  categories,
  profile,
  gamification,
  budgets,
  transactions,
  onSaveTransaction,
}) => {
  const counterRef = React.useRef(0);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'BOT',
      text: '🤖 *Olá! Eu sou o Bot do Finance Quest!*\nEnvie qualquer gasto por texto como:\n• `35 uber`\n• `R$ 12,50 cafezinho`\n• `150 internet fixo`\n• `3500 salario`',
      timestamp: 'Agora',
    },
  ]);

  if (!isOpen) return null;

  const quickPrompts = [
    '35 uber',
    'R$ 14,90 cafezinho',
    '150 internet fixo',
    '68 mercado',
    '3000 salario',
  ];

  const handleSendMessage = (textToSend?: string) => {
    const raw = textToSend || inputText;
    if (!raw.trim()) return;

    counterRef.current += 1;
    const userMsg: ChatMessage = {
      id: `msg-${counterRef.current}`,
      sender: 'USER',
      text: raw,
      timestamp: 'Agora',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Process via Parser
    const parsed = parseExpenseText(raw, categories);

    setTimeout(() => {
      if (!parsed) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'msg-err-' + Date.now(),
            sender: 'BOT',
            text: '⚠️ Não consegui identificar um valor numérico. Tente enviar algo como `35 almoço` ou `150 fixo`.',
            timestamp: 'Agora',
          },
        ]);
        return;
      }

      // Save to real repository state
      onSaveTransaction({
        amount: parsed.amount,
        categoryId: parsed.matchedCategoryId || categories[0].id,
        description: parsed.description || parsed.matchedCategoryName || 'Gasto Telegram',
        isFixed: parsed.isFixed,
        type: parsed.type,
        source: 'TELEGRAM',
      });

      // Calculate state for message response
      const today = getLocalDateString(new Date(), profile.timezone);
      const dateParts = parseYearMonth(today);
      const totalDays = getDaysInMonth(dateParts.year, dateParts.month);
      const varBudget = budgets.find((b) => !b.categoryId)?.amountLimit || 2200;

      const totalFixed = transactions
        .filter((t) => t.isFixed && t.type === 'EXPENSE')
        .reduce((s, t) => s + t.amount, 0) + (parsed.isFixed ? parsed.amount : 0);

      const totalVar = transactions
        .filter((t) => !t.isFixed && t.type === 'EXPENSE')
        .reduce((s, t) => s + t.amount, 0) + (!parsed.isFixed ? parsed.amount : 0);

      const hpResult = calculateHealthPoints({
        monthlyIncome: profile.monthlyIncome,
        variableBudgetLimit: varBudget,
        totalFixedSpent: totalFixed,
        totalVariableSpent: totalVar,
        currentDayOfMonth: dateParts.day,
        totalDaysInMonth: totalDays,
        currentHp: gamification.currentHp,
      });

      const responseMarkdown = formatTelegramSuccessMessage({
        expense: parsed,
        hpResult,
        streak: gamification.currentStreak + 1,
        xpEarned: 25,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-bot-' + Date.now(),
          sender: 'BOT',
          text: responseMarkdown,
          timestamp: 'Agora',
        },
      ]);
    }, 400);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-lg h-[620px] rounded-3xl bg-slate-950 border border-sky-500/40 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/30">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  Telegram Bot Simulator
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[11px] text-sky-400">@FinanceQuestBot • Webhook Ativo</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="flex items-center gap-1.5 p-2 bg-slate-900/50 border-b border-slate-800 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-1">
              Testar:
            </span>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-sky-300 border border-slate-700/60 whitespace-nowrap transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'USER' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-md ${
                    msg.sender === 'USER'
                      ? 'bg-sky-600 text-white rounded-br-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite um gasto (ex: 45 mercado ou 120 luz fixo)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold transition-all shadow-md shadow-sky-500/25"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
