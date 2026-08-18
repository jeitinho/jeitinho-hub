-- Catalog Factory fields used by the Hub UI/forms.
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

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_model text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS supplier_net numeric(10,2),
  ADD COLUMN IF NOT EXISTS supplier_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS fixed_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS commission_pct numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_basis text NOT NULL DEFAULT 'sale_price';

ALTER TABLE public.ticket_offers
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS supplier_cost numeric(10,2),
  ADD COLUMN IF NOT EXISTS commission_basis text NOT NULL DEFAULT 'sale_price';
