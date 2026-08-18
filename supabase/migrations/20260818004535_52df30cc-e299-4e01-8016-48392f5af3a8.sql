CREATE TABLE IF NOT EXISTS public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  group_slug text,
  price_label text,
  price_from numeric,
  currency text not null default 'EUR',
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS services_read_auth ON public.services;
CREATE POLICY services_read_auth ON public.services FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS services_write_managers ON public.services;
CREATE POLICY services_write_managers ON public.services FOR ALL TO authenticated USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE TABLE IF NOT EXISTS public.ticket_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  venue text,
  event_date date,
  public_price numeric,
  supplier_net numeric,
  commission_pct numeric not null default 0,
  currency text not null default 'BRL',
  notes text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_offers TO authenticated;
GRANT ALL ON public.ticket_offers TO service_role;
ALTER TABLE public.ticket_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ticket_offers_read_auth ON public.ticket_offers;
CREATE POLICY ticket_offers_read_auth ON public.ticket_offers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS ticket_offers_write_managers ON public.ticket_offers;
CREATE POLICY ticket_offers_write_managers ON public.ticket_offers FOR ALL TO authenticated USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ticket_offers_updated_at BEFORE UPDATE ON public.ticket_offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();