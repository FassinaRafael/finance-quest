'use client';

import { supabase } from '@/lib/supabase/client';
import { repository } from '@/lib/storage/repository';
import type {
  Profile,
  Category,
  Transaction,
  GamificationState,
} from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

const OWNER_USER_ID = '00000000-0000-0000-0000-000000000001';

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
    userId: String(row.user_id ?? OWNER_USER_ID),
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
 * Maps a Supabase `gamification_state` row to our local GamificationState interface.
 */
function mapGamification(row: Record<string, unknown>): GamificationState {
  return {
    userId: String(row.user_id ?? OWNER_USER_ID),
    currentHp: Number(row.current_hp ?? 100),
    totalXp: Number(row.total_xp ?? 50),
    currentLevel: Number(row.current_level ?? 1),
    currentStreak: Number(row.current_streak ?? 1),
    maxStreak: Number(row.max_streak ?? 1),
    lastActivityDate: row.last_activity_date ? String(row.last_activity_date) : null,
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

let realtimeChannel: RealtimeChannel | null = null;
let isSyncing = false;

/**
 * Fetches all data from Supabase and writes it to localStorage via repository.
 * Returns true if sync was successful, false if Supabase is unreachable.
 */
export async function syncFromSupabase(): Promise<boolean> {
  if (isSyncing) return false;
  isSyncing = true;

  try {
    // 1. Fetch profile
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', OWNER_USER_ID)
      .maybeSingle();

    if (profileRow) {
      repository.saveProfile(mapProfile(profileRow));
    }

    // 2. Fetch categories
    const { data: categoryRows } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (categoryRows && categoryRows.length > 0) {
      repository.saveCategories(categoryRows.map(mapCategory));
    }

    // 3. Fetch transactions (most recent first, limit 200)
    const { data: txRows } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', OWNER_USER_ID)
      .order('created_at', { ascending: false })
      .limit(200);

    if (txRows) {
      // Merge with existing local transactions (keep local ones not yet in Supabase)
      const existingTxs = repository.getTransactions();
      const remoteIds = new Set(txRows.map((r) => String(r.id)));
      const localOnly = existingTxs.filter((t) => !remoteIds.has(t.id) && t.source === 'APP');
      const merged = [...localOnly, ...txRows.map(mapTransaction)];
      // Sort by date descending
      merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      repository.saveTransactions(merged);
    }

    // 4. Fetch gamification state
    const { data: gameRow } = await supabase
      .from('gamification_state')
      .select('*')
      .eq('user_id', OWNER_USER_ID)
      .maybeSingle();

    if (gameRow) {
      repository.saveGamificationState(mapGamification(gameRow));
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
 * Subscribes to Supabase Realtime for live transaction inserts.
 * When a new transaction appears (e.g. from Telegram), it's merged into localStorage.
 */
export function subscribeToRealtime(): () => void {
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
        filter: `user_id=eq.${OWNER_USER_ID}`,
      },
      (payload) => {
        const newTx = mapTransaction(payload.new as Record<string, unknown>);
        const existing = repository.getTransactions();
        // Avoid duplicates
        if (!existing.some((t) => t.id === newTx.id)) {
          existing.unshift(newTx);
          repository.saveTransactions(existing);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'gamification_state',
        filter: `user_id=eq.${OWNER_USER_ID}`,
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
 * Pushes a locally-created transaction to Supabase in the background.
 * Non-blocking: failures are silently logged.
 */
export async function pushTransactionToSupabase(tx: Transaction): Promise<void> {
  try {
    await supabase.from('transactions').insert({
      id: tx.id,
      user_id: OWNER_USER_ID,
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
      user_id: OWNER_USER_ID,
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
