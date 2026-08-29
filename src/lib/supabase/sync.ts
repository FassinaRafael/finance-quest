'use client';

import { supabase } from '@/lib/supabase/client';
import { repository } from '@/lib/storage/repository';
import type {
  Profile,
  Category,
  Transaction,
  GamificationState,
  Budget,
} from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ensureValidUUID(id?: string | null): string {
  if (id && UUID_REGEX.test(id)) {
    return id;
  }
  return crypto.randomUUID();
}

/**
 * Maps a Supabase `profiles` row to our local Profile interface.
 */
function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    displayName: String(row.display_name ?? 'Viajante Financeiro'),
    telegramChatId: row.telegram_chat_id ? Number(row.telegram_chat_id) : null,
    currency: String(row.currency ?? 'BRL'),
    timezone: String(row.timezone ?? 'America/Sao_Paulo'),
    monthlyIncome: Number(row.monthly_income ?? 5000),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

/**
 * Maps a Supabase `categories` row to our local Category interface.
 */
function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    name: String(row.name),
    icon: String(row.icon ?? '📦'),
    color: String(row.color ?? '#64748B'),
    type: (row.type as 'EXPENSE' | 'INCOME') ?? 'EXPENSE',
    isFixedCost: Boolean(row.is_fixed_cost),
    isUnclassifiedFallback: Boolean(row.is_unclassified_fallback),
    aliases: Array.isArray(row.aliases) ? (row.aliases as string[]) : [],
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

/**
 * Maps a Supabase `transactions` row to our local Transaction interface.
 */
function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? ''),
    categoryId: String(row.category_id ?? 'cat-other'),
    amount: Number(row.amount ?? 0),
    type: (row.type as 'EXPENSE' | 'INCOME') ?? 'EXPENSE',
    description: row.description ? String(row.description) : null,
    isFixed: Boolean(row.is_fixed),
    source: (row.source as 'APP' | 'TELEGRAM' | 'VOICE') ?? 'APP',
    transactionDate: String(row.transaction_date ?? new Date().toISOString().slice(0, 10)),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

/**
 * Maps a Supabase `budgets` row to our local Budget interface.
 */
function mapBudget(row: Record<string, unknown>): Budget {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? ''),
    categoryId: row.category_id ? String(row.category_id) : null,
    amountLimit: Number(row.amount_limit ?? 2200),
    month: Number(row.month ?? new Date().getMonth() + 1),
    year: Number(row.year ?? new Date().getFullYear()),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

/**
 * Maps a Supabase `gamification_state` row to our local GamificationState interface.
 */
function mapGamification(row: Record<string, unknown>): GamificationState {
  return {
    userId: String(row.user_id ?? ''),
    currentHp: Number(row.current_hp ?? 100),
    totalXp: Number(row.total_xp ?? 0),
    currentLevel: Number(row.current_level ?? 1),
    currentStreak: Number(row.current_streak ?? 0),
    maxStreak: Number(row.max_streak ?? 0),
    lastActivityDate: row.last_activity_date ? String(row.last_activity_date) : null,
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

let realtimeChannel: RealtimeChannel | null = null;
let isSyncing = false;

/**
 * Fetches all data from Supabase for the authenticated user and writes it to localStorage.
 * RLS ensures queries only return the logged-in user's data.
 */
export async function syncFromSupabase(userId: string): Promise<boolean> {
  if (isSyncing) return false;
  isSyncing = true;

  try {
    // 1. Fetch profile (RLS filters by auth.uid())
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileRow) {
      repository.saveProfile(mapProfile(profileRow));
    }

    // 2. Fetch categories (system + user-specific, RLS handles it)
    const { data: categoryRows } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (categoryRows && categoryRows.length > 0) {
      repository.saveCategories(categoryRows.map(mapCategory));
    }

    // 3. Fetch transactions (most recent first)
    const { data: txRows } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (txRows) {
      repository.saveTransactions(txRows.map(mapTransaction));
    }

    // 4. Fetch gamification state
    const { data: gameRow } = await supabase
      .from('gamification_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (gameRow) {
      repository.saveGamificationState(mapGamification(gameRow));
    }

    // 5. Fetch budgets
    const { data: budgetRows } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId);

    if (budgetRows && budgetRows.length > 0) {
      repository.saveBudgets(budgetRows.map(mapBudget));
    }

    isSyncing = false;
    return true;
  } catch (err) {
    console.warn('Supabase sync failed (offline mode):', err);
    isSyncing = false;
    return false;
  }
}

/**
 * Subscribes to Supabase Realtime for live transaction inserts for the authenticated user.
 */
export function subscribeToRealtime(userId: string): () => void {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel('finance-quest-live')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const newTx = mapTransaction(payload.new as Record<string, unknown>);
        const existing = repository.getTransactions();
        if (!existing.some((t) => t.id === newTx.id)) {
          existing.unshift(newTx);
          repository.saveTransactions(existing);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const deletedId = (payload.old as { id?: string })?.id;
        if (deletedId) {
          const existing = repository.getTransactions();
          const filtered = existing.filter((t) => t.id !== deletedId);
          repository.saveTransactions(filtered);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'gamification_state',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          repository.saveGamificationState(
            mapGamification(payload.new as Record<string, unknown>)
          );
        }
      }
    )
    .subscribe();

  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };
}

/**
 * Pushes a profile update to Supabase in the background.
 */
export async function pushProfileToSupabase(profile: Profile): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({
        display_name: profile.displayName,
        monthly_income: profile.monthlyIncome,
        currency: profile.currency,
        timezone: profile.timezone,
        telegram_chat_id: profile.telegramChatId,
      })
      .eq('id', profile.id);
  } catch (err) {
    console.warn('Failed to push profile to Supabase:', err);
  }
}

/**
 * Pushes a budget update or list of budgets to Supabase in the background.
 */
export async function pushBudgetsToSupabase(userId: string, budgets: Budget[]): Promise<void> {
  try {
    for (const b of budgets) {
      const budgetId = ensureValidUUID(b.id);
      await supabase.from('budgets').upsert({
        id: budgetId,
        user_id: userId,
        category_id: b.categoryId || null,
        amount_limit: b.amountLimit,
        month: b.month,
        year: b.year,
      });
    }
  } catch (err) {
    console.warn('Failed to push budgets to Supabase:', err);
  }
}

/**
 * Pushes a new or updated category to Supabase in the background.
 */
export async function pushCategoryToSupabase(category: Category, userId: string): Promise<void> {
  try {
    await supabase.from('categories').upsert({
      id: category.id,
      user_id: userId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      is_fixed_cost: category.isFixedCost,
      is_unclassified_fallback: category.isUnclassifiedFallback,
      aliases: category.aliases,
    });
  } catch (err) {
    console.warn('Failed to push category to Supabase:', err);
  }
}

/**
 * Deletes a category from Supabase in the background.
 */
export async function deleteCategoryFromSupabase(categoryId: string): Promise<void> {
  try {
    await supabase.from('categories').delete().eq('id', categoryId);
  } catch (err) {
    console.warn('Failed to delete category from Supabase:', err);
  }
}

/**
 * Deletes a transaction from Supabase in the background.
 */
export async function deleteTransactionFromSupabase(txId: string): Promise<void> {
  try {
    await supabase.from('transactions').delete().eq('id', txId);
  } catch (err) {
    console.warn('Failed to delete transaction from Supabase:', err);
  }
}

/**
 * Pushes a locally-created transaction to Supabase in the background.
 */
export async function pushTransactionToSupabase(tx: Transaction): Promise<void> {
  try {
    await supabase.from('transactions').insert({
      id: ensureValidUUID(tx.id),
      user_id: tx.userId,
      category_id: tx.categoryId,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      is_fixed: tx.isFixed,
      source: tx.source,
      transaction_date: tx.transactionDate,
    });
  } catch (err) {
    console.warn('Failed to push transaction to Supabase:', err);
  }
}

/**
 * Pushes updated gamification state to Supabase in the background.
 */
export async function pushGamificationToSupabase(state: GamificationState): Promise<void> {
  try {
    await supabase.from('gamification_state').upsert({
      user_id: state.userId,
      current_hp: state.currentHp,
      total_xp: state.totalXp,
      current_level: state.currentLevel,
      current_streak: state.currentStreak,
      max_streak: state.maxStreak,
      last_activity_date: state.lastActivityDate,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to push gamification to Supabase:', err);
  }
}
