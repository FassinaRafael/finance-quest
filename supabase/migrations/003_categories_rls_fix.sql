-- =======================================================
-- Finance Quest: Category RLS Policies & Permissions Fix
-- Execute in Supabase SQL Editor
-- =======================================================

-- 1. Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 2. SELECT: User can read global default categories (user_id IS NULL) AND their own categories
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
DROP POLICY IF EXISTS "Users can read categories" ON public.categories;
CREATE POLICY "Users can read categories"
  ON public.categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

-- 3. INSERT: User can insert their own custom categories
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
CREATE POLICY "Users can insert own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. UPDATE: User can update their own categories OR claim/edit categories
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  USING (user_id IS NULL OR auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. DELETE: User can delete their own categories
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);
