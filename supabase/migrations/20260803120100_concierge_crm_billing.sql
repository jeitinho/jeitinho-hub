-- =====================================================================
-- CONCIERGE — CRM (prospects/leads), devis, réservations, paiements
--
-- Design notes :
--  - Le "leads" du Sheet prototype (avec pays/budget/relance/valeur
--    estimée) correspond en réalité à `prospects`, pas à la table
--    `leads` déjà existante dans le hub. `leads` reste la boîte de
--    réception brute (webhooks/formulaires non triés, avec
--    raw_payload/external_ref) ; `prospects` est l'objet CRM travaillé.
--    On étend donc `prospects`, on ne touche pas à `leads`.
--  - `quotes`/`quote_lines` existent déjà et sont fonctionnels (export
--    PDF réel) : on ALTER pour les colonnes manquantes.
--  - `bookings` (réservation confirmée, acompte/solde) n'a pas
--    d'équivalent dans le hub — `trips` est un objet plus large
--    (séjour complet, futur Travel OS). `bookings` est nouveau et se
--    branche optionnellement sur `trips`.
-- =====================================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.request_type AS ENUM ('devis','reservation','information','urgence','autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('not_required','pending','sent','signed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_payment_status AS ENUM ('unpaid','deposit_paid','paid','refunded','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_type AS ENUM ('deposit','balance','full','refund','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- PROSPECTS (ALTER) — porte les colonnes "leads" du Sheet ----------
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS request_type public.request_type,
  ADD COLUMN IF NOT EXISTS budget_estimate numeric(12,2),
  ADD COLUMN IF NOT EXISTS estimated_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_followup_at timestamptz;

COMMENT ON TABLE public.prospects IS
  'CRM travaillé (= "leads" du Sheet Concierge OS). Alimenté par triage manuel ou automatisé depuis `leads` (boîte de réception brute). owner_id = "responsable", created_at = "date_contact".';

CREATE INDEX IF NOT EXISTS prospects_next_followup_idx ON public.prospects (next_followup_at);

-- ---------- QUOTES (ALTER) ----------
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS contract_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_status public.contract_status NOT NULL DEFAULT 'not_required';

-- ---------- BOOKINGS (nouvelle table) ----------
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  booking_type text NOT NULL DEFAULT 'experience',   -- 'experience' | 'pack' | 'custom'
  experience_id uuid REFERENCES public.experiences(id) ON DELETE SET NULL,
  pack_id uuid REFERENCES public.packs(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  party_size integer,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  -- deposit_amount / balance_due / payment_status sont recalculés
  -- automatiquement par le trigger sur `payments` ci-dessous : ne pas
  -- les écrire manuellement en usage normal.
  deposit_amount numeric(12,2) NOT NULL DEFAULT 0,
  balance_due numeric(12,2) NOT NULL DEFAULT 0,
  payment_status public.booking_payment_status NOT NULL DEFAULT 'unpaid',
  -- Réutilise l'enum trip_status existant (draft/confirmed/in_progress/
  -- completed/cancelled) plutôt que d'en dupliquer un identique.
  status public.trip_status NOT NULL DEFAULT 'draft',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_client_idx ON public.bookings (client_id);
CREATE INDEX bookings_prospect_idx ON public.bookings (prospect_id);
CREATE INDEX bookings_status_idx ON public.bookings (status, payment_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_read_managers" ON public.bookings FOR SELECT TO authenticated
  USING (public.can_manage(auth.uid()));
CREATE POLICY "bookings_write_managers" ON public.bookings FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- PAYMENTS (nouvelle table) ----------
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  payment_type public.payment_type NOT NULL DEFAULT 'deposit',
  payment_method text,                               -- texte libre (carte, virement, pix, especes...) : évolue trop vite pour un enum
  paid_at timestamptz NOT NULL DEFAULT now(),
  external_ref text,                                  -- id transaction gateway (Stripe, etc.)
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_booking_idx ON public.payments (booking_id, paid_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_rw_managers" ON public.payments FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

-- Recalcule automatiquement bookings.balance_due / deposit_amount /
-- payment_status à chaque mouvement sur `payments`, pour éviter toute
-- dérive entre les deux tables (source de vérité = somme des paiements).
CREATE OR REPLACE FUNCTION public.recompute_booking_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid := COALESCE(NEW.booking_id, OLD.booking_id);
  v_total numeric(12,2);
  v_paid numeric(12,2);
BEGIN
  SELECT total_amount INTO v_total FROM public.bookings WHERE id = v_booking_id;
  IF v_total IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(amount) FILTER (WHERE payment_type <> 'refund'), 0)
       - COALESCE(SUM(amount) FILTER (WHERE payment_type = 'refund'), 0)
    INTO v_paid
    FROM public.payments WHERE booking_id = v_booking_id;

  UPDATE public.bookings
  SET deposit_amount = LEAST(GREATEST(v_paid, 0), v_total),  -- somme versée à date, plafonnée au total
      balance_due = GREATEST(v_total - v_paid, 0),
      payment_status = CASE
        WHEN v_paid <= 0 THEN 'unpaid'::public.booking_payment_status
        WHEN v_paid < v_total THEN 'deposit_paid'::public.booking_payment_status
        ELSE 'paid'::public.booking_payment_status
      END,
      updated_at = now()
  WHERE id = v_booking_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER payments_recompute_booking
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.recompute_booking_balance();

-- ---------- CLIENTS (ALTER) ----------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- nb_sejours / valeur_totale demandés par le Sheet ne sont PAS stockés
-- en colonnes (risque de dérive vs. bookings/payments qui sont la
-- source de vérité) : exposés via une vue calculée à la volée.
CREATE OR REPLACE VIEW public.clients_with_stats
WITH (security_invoker = true) AS
SELECT
  c.*,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('confirmed','in_progress','completed')) AS nb_sejours,
  COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type <> 'refund'), 0)
    - COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'refund'), 0) AS valeur_totale
FROM public.clients c
LEFT JOIN public.bookings b ON b.client_id = c.id
LEFT JOIN public.payments p ON p.booking_id = b.id
GROUP BY c.id;
