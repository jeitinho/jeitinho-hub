-- JEITINHO Hub: catalogue + voyage factory hardening
-- Makes the application schema match the live UI and keeps Supabase as the source of truth.

-- =========================
-- EXPERIENCES: commercial fields used by the Factory UI
-- =========================
ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS price_model text NOT NULL DEFAULT 'per_person',
  ADD COLUMN IF NOT EXISTS supplier_net numeric(10,2),
  ADD COLUMN IF NOT EXISTS supplier_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS fixed_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS commission_pct numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_basis text NOT NULL DEFAULT 'sale_price',
  ADD COLUMN IF NOT EXISTS requires_driver boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_excursion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_group_size integer,
  ADD COLUMN IF NOT EXISTS min_age integer,
  ADD COLUMN IF NOT EXISTS inclusions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exclusions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS conditions text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS experiences_published_idx ON public.experiences (is_published, title);
CREATE INDEX IF NOT EXISTS experiences_excursion_idx ON public.experiences (is_excursion, title);

-- =========================
-- SERVICES: complete commercial source for quotes + trips
-- =========================
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_model text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS supplier_net numeric(10,2),
  ADD COLUMN IF NOT EXISTS supplier_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS fixed_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS commission_pct numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_basis text NOT NULL DEFAULT 'sale_price';

CREATE INDEX IF NOT EXISTS services_active_title_idx ON public.services (is_active, title);
CREATE INDEX IF NOT EXISTS services_group_idx ON public.services (group_slug, title);

-- =========================
-- TICKETS: complete commercial source
-- =========================
ALTER TABLE public.ticket_offers
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS supplier_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS commission_basis text NOT NULL DEFAULT 'sale_price',
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS ticket_offers_active_date_idx ON public.ticket_offers (is_active, event_date);

-- =========================
-- TRIPS: explicit source link + manual creation fields
-- =========================
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS party_size integer,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS trips_quote_id_unique ON public.trips (quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS trips_status_dates_idx ON public.trips (status, start_date, end_date);

-- =========================
-- TRIP TRAVELERS
-- =========================
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
CREATE POLICY trip_travelers_read_managers ON public.trip_travelers FOR SELECT TO authenticated
  USING (public.can_manage(auth.uid()));
DROP POLICY IF EXISTS trip_travelers_write_managers ON public.trip_travelers;
CREATE POLICY trip_travelers_write_managers ON public.trip_travelers FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
DROP TRIGGER IF EXISTS trip_travelers_updated_at ON public.trip_travelers;
CREATE TRIGGER trip_travelers_updated_at BEFORE UPDATE ON public.trip_travelers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- TRIP ACTIVITIES: unified operational lines
-- =========================
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
CREATE POLICY trip_activities_read_managers ON public.trip_activities FOR SELECT TO authenticated
  USING (public.can_manage(auth.uid()));
DROP POLICY IF EXISTS trip_activities_write_managers ON public.trip_activities;
CREATE POLICY trip_activities_write_managers ON public.trip_activities FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
DROP TRIGGER IF EXISTS trip_activities_updated_at ON public.trip_activities;
CREATE TRIGGER trip_activities_updated_at BEFORE UPDATE ON public.trip_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS trip_activities_trip_idx ON public.trip_activities (trip_id, scheduled_start);
CREATE INDEX IF NOT EXISTS trip_activities_experience_idx ON public.trip_activities (experience_id);
CREATE INDEX IF NOT EXISTS trip_activities_partner_idx ON public.trip_activities (partner_id);

-- =========================
-- TRIP REFERENCE SEQUENCE
-- =========================
CREATE TABLE IF NOT EXISTS public.trip_number_sequences (
  year integer PRIMARY KEY,
  next_number integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.trip_number_sequences TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.trip_number_sequences TO authenticated;
ALTER TABLE public.trip_number_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trip_number_sequences_manage ON public.trip_number_sequences;
CREATE POLICY trip_number_sequences_manage ON public.trip_number_sequences FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE OR REPLACE FUNCTION public.next_trip_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y integer := EXTRACT(YEAR FROM now())::int;
  n integer;
BEGIN
  INSERT INTO public.trip_number_sequences (year, next_number)
  VALUES (y, 2)
  ON CONFLICT (year) DO UPDATE
    SET next_number = public.trip_number_sequences.next_number + 1,
        updated_at = now()
  RETURNING next_number - 1 INTO n;
  RETURN 'VOY-' || y::text || '-' || lpad(n::text, 3, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.next_trip_reference() TO authenticated;

-- =========================
-- EXPLICIT QUOTE -> TRIP CONVERSION
-- =========================
CREATE OR REPLACE FUNCTION public.create_trip_from_accepted_quote(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.quotes%ROWTYPE;
  v_trip uuid;
  v_reference text;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Devis introuvable'; END IF;
  IF q.status <> 'accepted' THEN RAISE EXCEPTION 'Le devis doit être accepté avant conversion'; END IF;

  SELECT id INTO v_trip FROM public.trips WHERE quote_id = p_quote_id LIMIT 1;
  IF v_trip IS NOT NULL THEN RETURN v_trip; END IF;

  v_reference := public.next_trip_reference();
  INSERT INTO public.trips (
    reference, title, client_id, status, start_date, end_date,
    currency, party_size, quote_id, source, notes, created_by
  ) VALUES (
    v_reference, q.title, q.client_id, 'draft', q.period_start, q.period_end,
    q.currency, q.party_size, q.id, 'quote', q.notes, auth.uid()
  ) RETURNING id INTO v_trip;

  RETURN v_trip;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_trip_from_accepted_quote(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.copy_quote_lines_to_trip(p_quote_id uuid, p_trip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trip_activities (
    trip_id, title, activity_type, status, quantity, sale_price,
    supplier_cost, commission_amount, margin_amount, currency, metadata, created_by
  )
  SELECT
    p_trip_id,
    ql.label,
    'quote_line',
    'to_plan',
    ql.quantity,
    ql.amount,
    0,
    0,
    ql.amount,
    ql.currency,
    jsonb_build_object('quote_line_id', ql.id, 'unit', ql.unit, 'details', ql.details),
    auth.uid()
  FROM public.quote_lines ql
  WHERE ql.quote_id = p_quote_id
    AND NOT EXISTS (
      SELECT 1 FROM public.trip_activities ta
      WHERE ta.trip_id = p_trip_id
        AND (ta.metadata->>'quote_line_id')::text = ql.id::text
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.copy_quote_lines_to_trip(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.convert_accepted_quote_to_trip(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_trip uuid;
BEGIN
  v_trip := public.create_trip_from_accepted_quote(p_quote_id);
  PERFORM public.copy_quote_lines_to_trip(p_quote_id, v_trip);
  RETURN v_trip;
END;
$$;
GRANT EXECUTE ON FUNCTION public.convert_accepted_quote_to_trip(uuid) TO authenticated;

-- Keep the PostgREST relationship cache in sync after adding the quote FK.
NOTIFY pgrst, 'reload schema';
