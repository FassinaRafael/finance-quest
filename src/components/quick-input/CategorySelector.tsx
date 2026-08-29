'use client';

import React from 'react';
import type { Category } from '@/types/database';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (category: Category) => void;
  className?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-4 gap-2.5 ${className}`}>
      {categories.map((cat) => {
        const isSelected = cat.id === selectedCategoryId;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95 text-center ${
              isSelected
                ? 'bg-slate-800 border-indigo-500 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500'
                : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-400'
            }`}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-1.5 transition-transform"
              style={{
                backgroundColor: isSelected ? `${cat.color}25` : 'rgba(30, 41, 59, 0.5)',
                border: isSelected ? `1.5px solid ${cat.color}` : '1px solid transparent',
              }}
            >
              <span>{cat.icon}</span>
            </div>

            <span
              className={`text-[11px] font-medium leading-tight line-clamp-1 ${
                isSelected ? 'text-white font-bold' : 'text-slate-300'
              }`}
            >
              {cat.name}
            </span>

            {cat.isFixedCost && (
              <span className="mt-0.5 text-[9px] font-semibold text-purple-400">
                Fixo
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
