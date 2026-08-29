'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Delete, Check, Repeat } from 'lucide-react';
import { CategorySelector } from './CategorySelector';
import { VoiceInputButton } from './VoiceInputButton';
import { parseExpenseText } from '@/lib/telegram/parser';
import type { Category, TransactionType } from '@/types/database';

interface NumpadSheetProps {
  categories: Category[];
  onSaveTransaction: (data: {
    amount: number;
    categoryId: string;
    description: string;
    isFixed: boolean;
    type: TransactionType;
    source: 'APP' | 'VOICE';
  }) => void;
  className?: string;
}

export const NumpadSheet: React.FC<NumpadSheetProps> = ({
  categories,
  onSaveTransaction,
  className = '',
}) => {
  const [rawAmount, setRawAmount] = useState<string>('0');
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  const [isFixed, setIsFixed] = useState<boolean>(categories[0]?.isFixedCost ?? false);
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [feedbackEffect, setFeedbackEffect] = useState(false);

  // Parse raw amount string to float
  const numericAmount = parseFloat(rawAmount.replace(',', '.')) || 0;

  // Handle keypad digit clicks
  const handleDigit = (digit: string) => {
    setRawAmount((prev) => {
      if (prev === '0' && digit !== ',') {
        return digit;
      }
      if (digit === ',') {
        if (prev.includes(',')) return prev;
        return prev + ',';
      }
      // Limit to 2 decimals
      if (prev.includes(',')) {
        const parts = prev.split(',');
        if (parts[1] && parts[1].length >= 2) return prev;
      }
      if (prev.length >= 7) return prev;
      return prev + digit;
    });
  };

  const handleBackspace = () => {
    setRawAmount((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleAddQuickAmount = (val: number) => {
    const current = parseFloat(rawAmount.replace(',', '.')) || 0;
    const updated = current + val;
    setRawAmount(updated.toFixed(2).replace('.', ','));
  };

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    // Strict inheritance rule: isFixed inherits category.isFixedCost by default
    setIsFixed(cat.isFixedCost);
    setType(cat.type);
    if (!description || description === selectedCategory.name) {
      setDescription(cat.name);
    }
  };

  const handleVoiceTranscription = (text: string) => {
    const parsed = parseExpenseText(text, categories);
    if (parsed) {
      setRawAmount(parsed.amount.toFixed(2).replace('.', ','));
      setIsFixed(parsed.isFixed);
      setType(parsed.type);
      if (parsed.matchedCategoryId) {
        const cat = categories.find((c) => c.id === parsed.matchedCategoryId);
        if (cat) setSelectedCategory(cat);
      }
      if (parsed.description) {
        setDescription(parsed.description);
      }
    }
  };

  const handleSave = () => {
    if (numericAmount <= 0) return;

    setFeedbackEffect(true);
    setTimeout(() => setFeedbackEffect(false), 500);

    onSaveTransaction({
      amount: numericAmount,
      categoryId: selectedCategory.id,
      description: description.trim() || selectedCategory.name,
      isFixed,
      type,
      source: 'APP',
    });

    // Reset input
    setRawAmount('0');
    setDescription('');
  };

  return (
    <div className={`flex flex-col max-w-md mx-auto p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-2xl ${className}`}>
      {/* Header: Amount Display & Voice button */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800">
          <span className="text-lg">{selectedCategory.icon}</span>
          <span className="text-xs font-bold text-slate-200">{selectedCategory.name}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Fixed / Variable Toggle */}
          <button
            type="button"
            onClick={() => setIsFixed(!isFixed)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              isFixed
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
            title="Gastos fixos são contas recorrentes (aluguel, net) e não penalizam o HP diário"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{isFixed ? 'Gasto Fixo' : 'Variável'}</span>
          </button>

          {/* Voice Mic Button */}
          <VoiceInputButton onTranscribedText={handleVoiceTranscription} />
        </div>
      </div>

      {/* Main Display Value */}
      <motion.div
        animate={feedbackEffect ? { scale: [1, 1.05, 1] } : {}}
        className="flex flex-col items-center justify-center py-4 px-2 my-1 rounded-2xl bg-gradient-to-b from-slate-950/90 to-slate-900/60 border border-slate-800/80"
      >
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          {type === 'EXPENSE' ? 'Novo Gasto' : 'Nova Entrada'}
        </span>
        <div className="flex items-baseline gap-1 text-white">
          <span className="text-2xl font-bold text-slate-400">R$</span>
          <span className="text-4xl sm:text-5xl font-black tracking-tight">{rawAmount}</span>
        </div>

        {/* Optional Description Input */}
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`Nota (ex: ${selectedCategory.name})`}
          className="mt-2 text-center text-xs text-slate-300 bg-transparent border-b border-slate-700/60 focus:border-indigo-500 focus:outline-none px-2 py-0.5 w-3/4 placeholder-slate-500"
        />
      </motion.div>

      {/* Quick Add Chips */}
      <div className="grid grid-cols-3 gap-2 my-2.5">
        {[5, 10, 50].map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => handleAddQuickAmount(val)}
            className="py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 text-xs font-semibold text-indigo-300 transition-colors"
          >
            +R$ {val}
          </button>
        ))}
      </div>

      {/* Category Grid */}
      <div className="my-2 max-h-36 overflow-y-auto pr-1">
        <CategorySelector
          categories={categories}
          selectedCategoryId={selectedCategory.id}
          onSelectCategory={handleCategorySelect}
        />
      </div>

      {/* Numeric Keypad Grid */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleDigit(key)}
            className="py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-indigo-600 border border-slate-700/50 text-xl font-bold text-slate-100 transition-all active:scale-95 shadow-sm"
          >
            {key}
          </button>
        ))}

        {/* Backspace Key */}
        <button
          type="button"
          onClick={handleBackspace}
          className="py-3 rounded-2xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-rose-600 border border-slate-700/50 flex items-center justify-center text-slate-300 transition-all active:scale-95 shadow-sm"
          title="Apagar"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      {/* Big Action Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={numericAmount <= 0}
        className={`w-full mt-3 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
          numericAmount > 0
            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/25'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
        }`}
      >
        <Check className="w-5 h-5 stroke-[3]" />
        <span>Salvar Registro Instantâneo</span>
      </button>
    </div>
  );
};
