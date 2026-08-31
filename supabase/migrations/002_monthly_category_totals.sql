-- =======================================================
-- Finance Quest: Monthly Category Totals Analytical View
-- Execute in Supabase SQL Editor
-- =======================================================

-- 1. Create or replace analytical view for monthly aggregations
CREATE OR REPLACE VIEW public.monthly_category_totals AS
SELECT
  user_id,
  DATE_TRUNC('month', transaction_date::date)::date AS month_date,
  category_id,
  type,
  SUM(amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM public.transactions
GROUP BY user_id, DATE_TRUNC('month', transaction_date::date), category_id, type;

-- 2. Grant access to authenticated users
GRANT SELECT ON public.monthly_category_totals TO authenticated;
GRANT SELECT ON public.monthly_category_totals TO service_role;
