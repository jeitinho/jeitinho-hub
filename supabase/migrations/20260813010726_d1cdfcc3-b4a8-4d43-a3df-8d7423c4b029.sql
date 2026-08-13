ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '{"included": [], "excluded": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS itinerary jsonb NOT NULL DEFAULT '[]'::jsonb;