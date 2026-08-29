-- ================================================
-- Finance Quest: Auth Provisioning, RLS & Cleanup
-- Execute in Supabase SQL Editor (in order)
-- ================================================

-- =========================================
-- 1. CLEANUP: Remove test data & old profile
-- =========================================
DELETE FROM transactions WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM gamification_state WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM budgets WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM user_achievements WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001';

-- ==========================================================
-- 2. TRIGGER: Auto-create profile + gamification on sign-up
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, display_name, currency, timezone, monthly_income)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'Viajante Financeiro'),
    'BRL',
    'America/Sao_Paulo',
    5000
  );

  -- Create initial gamification state
  INSERT INTO public.gamification_state (user_id, current_hp, total_xp, current_level, current_streak, max_streak)
  VALUES (NEW.id, 100, 0, 1, 0, 0);

  -- Create default variable budget for current month
  INSERT INTO public.budgets (id, user_id, category_id, amount_limit, month, year)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NULL,
    2200,
    EXTRACT(MONTH FROM NOW())::int,
    EXTRACT(YEAR FROM NOW())::int
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 3. RLS POLICIES: Strict per-user access
-- ==========================================

-- First drop the permissive "anon can read" policies we added earlier
DROP POLICY IF EXISTS "Anon can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Anon can read all categories" ON categories;
DROP POLICY IF EXISTS "Anon can read all transactions" ON transactions;
DROP POLICY IF EXISTS "Anon can read gamification" ON gamification_state;

-- Enable RLS on all user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
CREATE POLICY "Users can read own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- GAMIFICATION STATE
DROP POLICY IF EXISTS "Users can read own gamification" ON gamification_state;
CREATE POLICY "Users can read own gamification"
  ON gamification_state FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own gamification" ON gamification_state;
CREATE POLICY "Users can update own gamification"
  ON gamification_state FOR UPDATE
  USING (auth.uid() = user_id);

-- BUDGETS
DROP POLICY IF EXISTS "Users can read own budgets" ON budgets;
CREATE POLICY "Users can read own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

-- USER ACHIEVEMENTS
DROP POLICY IF EXISTS "Users can read own achievements" ON user_achievements;
CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;
CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- CATEGORIES (shared across all users + user-specific)
DROP POLICY IF EXISTS "Anyone can read categories" ON categories;
CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Done!
