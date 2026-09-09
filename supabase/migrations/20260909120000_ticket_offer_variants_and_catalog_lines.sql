-- Recreates, for repo history, a schema change already applied directly to
-- prod (no migration file was committed at the time). Column/constraint/RLS
-- shape here matches production exactly (verified via information_schema /
-- pg_policies / pg_constraint before writing this file) — this is a record,
-- not a fresh change.

create table if not exists public.ticket_offer_variants (
  id uuid primary key default gen_random_uuid(),
  ticket_offer_id uuid not null references public.ticket_offers(id) on delete cascade,
  label text not null,
  public_price numeric,
  currency text not null default 'BRL',
  capacity integer,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ticket_offer_variants enable row level security;

drop policy if exists ticket_offer_variants_read_auth on public.ticket_offer_variants;
create policy ticket_offer_variants_read_auth on public.ticket_offer_variants
  for select to authenticated using (true);

drop policy if exists ticket_offer_variants_write_managers on public.ticket_offer_variants;
create policy ticket_offer_variants_write_managers on public.ticket_offer_variants
  for all to authenticated using (can_manage(auth.uid())) with check (can_manage(auth.uid()));

-- Catalog-linked lines: a quote/invoice line may snapshot from an experience,
-- a service, or a ticket offer (optionally a specific sector variant) — or
-- stay free text with all four columns null. inclusions/exclusions are a
-- point-in-time copy of the catalog item's, not a live reference.
alter table public.quote_lines
  add column if not exists experience_id uuid references public.experiences(id) on delete set null,
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists ticket_offer_id uuid references public.ticket_offers(id) on delete set null,
  add column if not exists ticket_offer_variant_id uuid references public.ticket_offer_variants(id) on delete set null,
  add column if not exists inclusions text[] not null default '{}',
  add column if not exists exclusions text[] not null default '{}';

alter table public.quote_lines
  drop constraint if exists quote_lines_single_catalog_source_check,
  add constraint quote_lines_single_catalog_source_check
    check (num_nonnulls(experience_id, service_id, ticket_offer_id) <= 1);

alter table public.quote_lines
  drop constraint if exists quote_lines_variant_requires_ticket,
  add constraint quote_lines_variant_requires_ticket
    check (ticket_offer_variant_id is null or ticket_offer_id is not null);

alter table public.invoice_lines
  add column if not exists experience_id uuid references public.experiences(id) on delete set null,
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists ticket_offer_id uuid references public.ticket_offers(id) on delete set null,
  add column if not exists ticket_offer_variant_id uuid references public.ticket_offer_variants(id) on delete set null,
  add column if not exists inclusions text[] not null default '{}',
  add column if not exists exclusions text[] not null default '{}';

alter table public.invoice_lines
  drop constraint if exists invoice_lines_single_catalog_source_check,
  add constraint invoice_lines_single_catalog_source_check
    check (num_nonnulls(experience_id, service_id, ticket_offer_id) <= 1);

alter table public.invoice_lines
  drop constraint if exists invoice_lines_variant_requires_ticket,
  add constraint invoice_lines_variant_requires_ticket
    check (ticket_offer_variant_id is null or ticket_offer_id is not null);
