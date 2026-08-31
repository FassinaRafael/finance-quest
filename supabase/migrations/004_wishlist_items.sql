-- =======================================================
-- Finance Quest: Wishlist Items & Impulse Shield Schema
-- Execute in Supabase SQL Editor
-- =======================================================

-- 1. Create wishlist_items table
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  category_id TEXT,
  reason TEXT,
  cooling_off_days INT NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'APPROVED', 'CANCELLED', 'BOUGHT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for authenticated users
DROP POLICY IF EXISTS "Users can read own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can read own wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can insert own wishlist items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can update own wishlist items"
  ON public.wishlist_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wishlist items" ON public.wishlist_items;
CREATE POLICY "Users can delete own wishlist items"
  ON public.wishlist_items FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;
