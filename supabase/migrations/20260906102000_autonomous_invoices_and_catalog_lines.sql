-- Invoices may exist without a quote and may originate from a direct site booking.
alter table public.invoices
  alter column quote_id drop not null;

alter table public.invoices
  add column if not exists booking_id uuid references public.bookings(id) on delete set null;

alter table public.invoices
  add column if not exists sale_id uuid references public.sales(id) on delete set null;

alter table public.invoices
  drop constraint if exists invoices_single_origin_check;

alter table public.invoices
  add constraint invoices_single_origin_check
  check (num_nonnulls(quote_id, booking_id, sale_id) <= 1);

create unique index if not exists invoices_booking_id_unique
  on public.invoices (booking_id)
  where booking_id is not null;

create unique index if not exists invoices_sale_id_unique
  on public.invoices (sale_id)
  where sale_id is not null;

-- Keep the catalogue origin on document lines while preserving a historical snapshot
-- of label/quantity/unit price. Removing a catalogue item never deletes invoice/quote data.
alter table public.quote_lines
  add column if not exists experience_id uuid references public.experiences(id) on delete set null,
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists ticket_offer_id uuid references public.ticket_offers(id) on delete set null;

alter table public.quote_lines
  drop constraint if exists quote_lines_single_catalog_source_check;

alter table public.quote_lines
  add constraint quote_lines_single_catalog_source_check
  check (num_nonnulls(experience_id, service_id, ticket_offer_id) <= 1);

alter table public.invoice_lines
  add column if not exists experience_id uuid references public.experiences(id) on delete set null,
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists ticket_offer_id uuid references public.ticket_offers(id) on delete set null;

alter table public.invoice_lines
  drop constraint if exists invoice_lines_single_catalog_source_check;

alter table public.invoice_lines
  add constraint invoice_lines_single_catalog_source_check
  check (num_nonnulls(experience_id, service_id, ticket_offer_id) <= 1);

create index if not exists quote_lines_experience_id_idx on public.quote_lines(experience_id) where experience_id is not null;
create index if not exists quote_lines_service_id_idx on public.quote_lines(service_id) where service_id is not null;
create index if not exists quote_lines_ticket_offer_id_idx on public.quote_lines(ticket_offer_id) where ticket_offer_id is not null;
create index if not exists invoice_lines_experience_id_idx on public.invoice_lines(experience_id) where experience_id is not null;
create index if not exists invoice_lines_service_id_idx on public.invoice_lines(service_id) where service_id is not null;
create index if not exists invoice_lines_ticket_offer_id_idx on public.invoice_lines(ticket_offer_id) where ticket_offer_id is not null;

-- Managers need read-only access to direct website bookings so they can turn a purchase
-- into an invoice. Public users retain the existing INSERT-only policy.
drop policy if exists bookings_read_managers on public.bookings;
create policy bookings_read_managers
  on public.bookings
  for select
  to authenticated
  using (can_manage(auth.uid()));

-- Preserve the quote -> invoice workflow while copying catalogue lineage too.
create or replace function public.convert_quote_to_invoice(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  q record;
  c record;
  new_invoice_id uuid;
  existing_id uuid;
  num text;
  billing_name text;
  ln record;
begin
  if not can_manage(auth.uid()) then
    raise exception 'unauthorized';
  end if;

  select * into q from public.quotes where id = p_quote_id;
  if not found then
    raise exception 'Devis introuvable';
  end if;
  if q.status <> 'accepted' then
    raise exception 'Le devis doit être accepté';
  end if;

  select id into existing_id from public.invoices where quote_id = p_quote_id order by created_at limit 1;
  if existing_id is not null then
    return existing_id;
  end if;

  if q.client_id is not null then
    select * into c from public.clients where id = q.client_id;
  end if;

  billing_name := coalesce(
    case when c.legal_type = 'company' then coalesce(c.company_name, c.full_name) else c.full_name end,
    q.title
  );

  select public.next_invoice_number() into num;

  new_invoice_id := gen_random_uuid();
  insert into public.invoices (
    id, number, quote_id, client_id, title, status, currency, total_amount,
    due_date, notes, billing_legal_type, billing_name, billing_company_name,
    billing_siret, billing_vat_number, billing_address, created_by
  ) values (
    new_invoice_id, num, p_quote_id, q.client_id, q.title, 'draft', coalesce(q.currency, 'EUR'), coalesce(q.total_amount, 0),
    current_date + coalesce(q.validity_days, 30), q.notes,
    coalesce(c.legal_type, 'individual'), billing_name, c.company_name,
    c.siret, c.vat_number, c.billing_address, auth.uid()
  );

  for ln in select * from public.quote_lines where quote_id = p_quote_id order by position loop
    insert into public.invoice_lines (
      invoice_id, position, label, unit, quantity, unit_price, currency,
      experience_id, service_id, ticket_offer_id
    ) values (
      new_invoice_id, ln.position, ln.label, ln.unit, ln.quantity, ln.unit_price, coalesce(ln.currency, 'EUR'),
      ln.experience_id, ln.service_id, ln.ticket_offer_id
    );
  end loop;

  return new_invoice_id;
end;
$function$;
