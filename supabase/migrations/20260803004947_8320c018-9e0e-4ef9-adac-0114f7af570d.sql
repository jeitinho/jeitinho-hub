ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS party_size integer;
GRANT EXECUTE ON FUNCTION public.next_quote_number() TO authenticated;