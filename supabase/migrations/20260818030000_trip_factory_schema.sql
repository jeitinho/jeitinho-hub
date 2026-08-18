-- Trip Factory schema: manual trips and operational activities.
-- This migration is intentionally additive and safe to run after the existing quote/trip migrations.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS party_size integer,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS trips_quote_id_unique
  ON public.trips (quote_id) WHERE quote_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.trip_travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Voyageur',
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_travelers TO authenticated;
GRANT ALL ON public.trip_travelers TO service_role;
ALTER TABLE public.trip_travelers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trip_travelers_read_managers ON public.trip_travelers;
CREATE POLICY trip_travelers_read_managers ON public.trip_travelers FOR SELECT TO authenticated USING (public.can_manage(auth.uid()));
DROP POLICY IF EXISTS trip_travelers_write_managers ON public.trip_travelers;
CREATE POLICY trip_travelers_write_managers ON public.trip_travelers FOR ALL TO authenticated USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
DROP TRIGGER IF EXISTS trip_travelers_updated_at ON public.trip_travelers;
CREATE TRIGGER trip_travelers_updated_at BEFORE UPDATE ON public.trip_travelers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.trip_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  experience_id uuid REFERENCES public.experiences(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  title text NOT NULL,
  activity_type text NOT NULL DEFAULT 'experience',
  status text NOT NULL DEFAULT 'to_plan',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  sale_price numeric(12,2) NOT NULL DEFAULT 0,
  supplier_cost numeric(12,2) NOT NULL DEFAULT 0,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  margin_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  client_informed_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_activities TO authenticated;
GRANT ALL ON public.trip_activities TO service_role;
ALTER TABLE public.trip_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trip_activities_read_managers ON public.trip_activities;
CREATE POLICY trip_activities_read_managers ON public.trip_activities FOR SELECT TO authenticated USING (public.can_manage(auth.uid()));
DROP POLICY IF EXISTS trip_activities_write_managers ON public.trip_activities;
CREATE POLICY trip_activities_write_managers ON public.trip_activities FOR ALL TO authenticated USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
DROP TRIGGER IF EXISTS trip_activities_updated_at ON public.trip_activities;
CREATE TRIGGER trip_activities_updated_at BEFORE UPDATE ON public.trip_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.trip_number_sequences (
  year integer PRIMARY KEY,
  next_number integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.trip_number_sequences TO service_role;
ALTER TABLE public.trip_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.next_trip_reference()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE y integer := EXTRACT(YEAR FROM now())::int; n integer;
BEGIN
  INSERT INTO public.trip_number_sequences(year,next_number) VALUES(y,2)
  ON CONFLICT(year) DO UPDATE SET next_number=public.trip_number_sequences.next_number+1,updated_at=now()
  RETURNING next_number-1 INTO n;
  RETURN 'VOY-'||y::text||'-'||lpad(n::text,3,'0');
END $$;
GRANT EXECUTE ON FUNCTION public.next_trip_reference() TO authenticated;
