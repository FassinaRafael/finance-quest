'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, X, Check, Landmark, Tag } from 'lucide-react';
import { repository } from '@/lib/storage/repository';
import {
  pushProfileToSupabase,
  pushBudgetsToSupabase,
  pushCategoryToSupabase,
  deleteCategoryFromSupabase,
} from '@/lib/supabase/sync';
import { formatCurrency } from '@/lib/utils/date-utils';
import type { Category, Profile, Budget, TransactionType } from '@/types/database';

interface CategoryBudgetManagerProps {
  profile: Profile;
  categories: Category[];
  budgets: Budget[];
  className?: string;
}

const EMOJI_PALETTE = [
  '🍔', '🚗', '🏠', '🎮', '💊', '🛍️', '💰', '🏋️', '✈️', '📚',
  '🐾', '☕', '🎬', '💡', '🎵', '🍕', '🍻', '💈', '🎁', '📦'
];

const COLOR_PALETTE = [
  '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981',
  '#06B6D4', '#EF4444', '#64748B', '#F97316', '#14B8A6'
];

export const CategoryBudgetManager: React.FC<CategoryBudgetManagerProps> = ({
  profile,
  categories,
  budgets,
  className = '',
}) => {
  // Budget values
  const varBudget = budgets.find((b) => !b.categoryId)?.amountLimit || 2200;
  const [incomeInput, setIncomeInput] = useState(profile.monthlyIncome.toString());
  const [varBudgetInput, setVarBudgetInput] = useState(varBudget.toString());
  const [isSavedBudget, setIsSavedBudget] = useState(false);

  // Keep inputs in sync when props update from Supabase sync
  useEffect(() => {
    setIncomeInput(profile.monthlyIncome.toString());
  }, [profile.monthlyIncome]);

  useEffect(() => {
    setVarBudgetInput(varBudget.toString());
  }, [varBudget]);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('🍔');
  const [catColor, setCatColor] = useState('#3B82F6');
  const [catType, setCatType] = useState<TransactionType>('EXPENSE');
  const [catIsFixed, setCatIsFixed] = useState(false);
  const [catAliases, setCatAliases] = useState('');

  const handleSaveBudgets = (e: React.FormEvent) => {
    e.preventDefault();
    const income = Math.max(0, parseFloat(incomeInput) || 0);
    const limit = Math.max(0, parseFloat(varBudgetInput) || 0);

    const updatedProfile: Profile = {
      ...profile,
      monthlyIncome: Number(income.toFixed(2)),
    };
    repository.saveProfile(updatedProfile);
    pushProfileToSupabase(updatedProfile);

    const updatedBudgets = budgets.map((b) =>
      !b.categoryId ? { ...b, amountLimit: Number(limit.toFixed(2)) } : b
    );
    repository.saveBudgets(updatedBudgets);
    pushBudgetsToSupabase(profile.id, updatedBudgets);

    setIsSavedBudget(true);
    setTimeout(() => setIsSavedBudget(false), 2500);
  };

  const handleOpenAddCategory = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatIcon('🍔');
    setCatColor('#3B82F6');
    setCatType('EXPENSE');
    setCatIsFixed(false);
    setCatAliases('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
    setCatType(cat.type);
    setCatIsFixed(cat.isFixedCost);
    setCatAliases(cat.aliases?.join(', ') || '');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedName = catName.trim().slice(0, 40);
    if (!sanitizedName) return;

    const stopWords = new Set(['de', 'no', 'na', 'em', 'para', 'o', 'a', 'os', 'as', 'um', 'uma', 'e']);
    const aliases = catAliases
      .split(',')
      .map((a) => a.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter((a) => a.length >= 2 && !stopWords.has(a))
      .slice(0, 20);

    if (editingCategoryId) {
      const updates = {
        name: sanitizedName,
        icon: catIcon,
        color: catColor,
        type: catType,
        isFixedCost: catIsFixed,
        aliases,
      };
      repository.updateCategory(editingCategoryId, updates);
      const existing = categories.find((c) => c.id === editingCategoryId);
      if (existing) {
        pushCategoryToSupabase({ ...existing, ...updates }, profile.id);
      }
    } else {
      const newCat = repository.addCategory({
        userId: profile.id,
        name: sanitizedName,
        icon: catIcon,
        color: catColor,
        type: catType,
        isFixedCost: catIsFixed,
        isUnclassifiedFallback: false,
        aliases,
      });
      pushCategoryToSupabase(newCat, profile.id);
    }

    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Deseja realmente excluir esta categoria? As transações associadas serão movidas para a categoria Geral/Outros.')) {
      repository.deleteCategory(id);
      deleteCategoryFromSupabase(id);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Monthly Budget Configuration Card */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Planejamento & Metas Mensais
            </h3>
            <p className="text-xs text-slate-400">Configure sua renda e limites de gastos</p>
          </div>
        </div>

        <form onSubmit={handleSaveBudgets} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Renda Mensal Declarada (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Teto de Gastos Variáveis (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={varBudgetInput}
                onChange={(e) => setVarBudgetInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Meta diária sugerida: <strong>{formatCurrency((parseFloat(varBudgetInput) || 0) / 30)}/dia</strong>
            </span>

            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-indigo-600/20"
            >
              {isSavedBudget ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Salvo!</span>
                </>
              ) : (
                <span>Atualizar Metas</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Categories Management Card */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Categorias ({categories.length})
              </h3>
              <p className="text-xs text-slate-400">Personalize ícones, cores e palavras-chave</p>
            </div>
          </div>

          <button
            onClick={handleOpenAddCategory}
            className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 transition-transform active:scale-95 shadow-md shadow-purple-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Categoria</span>
          </button>
        </div>

        {/* Categories Grid List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 group hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border"
                  style={{
                    backgroundColor: `${cat.color}20`,
                    borderColor: `${cat.color}40`,
                  }}
                >
                  <span>{cat.icon}</span>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{cat.name}</span>
                    {cat.isFixedCost && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-semibold">
                        Fixo
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {cat.aliases?.length ? `Aliases: ${cat.aliases.slice(0, 3).join(', ')}` : 'Sem aliases'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditCategory(cat)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Editar"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {!cat.isUnclassifiedFallback && (
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Modal: Add / Edit Category */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md p-5 rounded-3xl bg-slate-900 border border-purple-500/40 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-black text-white">
                  {editingCategoryId ? 'Editar Categoria' : 'Criar Nova Categoria'}
                </h3>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome da Categoria
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Ex: Academia & Suplementos"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Emoji Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ícone / Emoji
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                    {EMOJI_PALETTE.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCatIcon(emoji)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform ${
                          catIcon === emoji
                            ? 'bg-purple-600 text-white scale-110 shadow-sm'
                            : 'hover:bg-slate-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cor Visual
                  </label>
                  <div className="flex gap-2">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCatColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          catColor === color ? 'scale-125 ring-2 ring-white' : 'opacity-80'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCatIsFixed(!catIsFixed)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      catIsFixed
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>{catIsFixed ? '🔒 Custo Fixo' : '🌊 Custo Variável'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatType(catType === 'EXPENSE' ? 'INCOME' : 'EXPENSE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      catType === 'INCOME'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-rose-500/20 border-rose-500 text-rose-300'
                    }`}
                  >
                    <span>{catType === 'EXPENSE' ? '💸 Despesa' : '💰 Receita'}</span>
                  </button>
                </div>

                {/* Aliases for Telegram Bot */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Palavras-Chave para o Bot (separadas por vírgula)
                  </label>
                  <textarea
                    rows={2}
                    value={catAliases}
                    onChange={(e) => setCatAliases(e.target.value)}
                    placeholder="smartfit, whey, creatina, academia"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-transform active:scale-95 shadow-lg shadow-purple-600/25"
                >
                  Salvar Categoria
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
