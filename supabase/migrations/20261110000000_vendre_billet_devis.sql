-- Vendre un billet en deux clics : devis brouillon avec la ligne du billet (secteur, quantité).
-- Numérotation des devis : la référence interne sautait sur des références déjà prises
-- (compteur en retard) ; et le numéro affiché doit suivre le dernier numéro réellement utilisé.
create or replace function public.next_quote_number() returns text
language plpgsql security definer set search_path to 'public' as $function$
declare y integer := extract(year from now())::int; n integer; candidate text; tries int := 0;
begin
  loop
    insert into public.quote_number_sequences(year, next_number) values (y, 2)
    on conflict (year) do update set next_number = public.quote_number_sequences.next_number + 1, updated_at = now()
    returning next_number - 1 into n;
    candidate := y::text || '-' || lpad(n::text, 3, '0');
    exit when not exists (select 1 from quotes where reference = candidate or number = candidate);
    tries := tries + 1;
    if tries > 500 then raise exception 'numérotation des devis bloquée'; end if;
  end loop;
  return candidate;
end $function$;

-- Prochain numéro « humain » : dernier numéro de l'année + 1 (« 2026-43 » → « 2026-044 »).
create or replace function public.next_quote_display_number() returns text
language sql stable security definer set search_path to 'public' as $$
  select extract(year from now())::int || '-' || lpad((coalesce(max(nullif(regexp_replace(split_part(number, '-', 2), '\D', '', 'g'), '')::int), 0) + 1)::text, 3, '0')
    from quotes where number like extract(year from now())::int || '-%';
$$;
revoke all on function public.next_quote_display_number() from public, anon;
grant execute on function public.next_quote_display_number() to authenticated;

create or replace function public.sell_ticket_quote(
  p_offer uuid, p_variant uuid, p_qty int, p_client uuid, p_language text default 'fr'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_ref text; o record; v_label text; v_price numeric; v_cur text; v_unit_price numeric; v_currency text; v_line text; v_num text; v_qid uuid;
begin
  if not public.can_operate(auth.uid()) then raise exception 'forbidden'; end if;
  if coalesce(p_qty, 0) < 1 then raise exception 'quantité invalide'; end if;
  select * into o from ticket_offers where id = p_offer;
  if not found then raise exception 'billet introuvable'; end if;
  if p_variant is not null then
    select tv.label, tv.public_price, tv.currency into v_label, v_price, v_cur
      from ticket_offer_variants tv where tv.id = p_variant and tv.ticket_offer_id = p_offer;
    if not found then raise exception 'secteur introuvable'; end if;
  end if;
  v_unit_price := coalesce(v_price, o.public_price);
  if v_unit_price is null then raise exception 'prix du billet non renseigné'; end if;
  v_currency := coalesce(v_cur, o.currency, 'EUR');
  v_line := o.title || coalesce(' — ' || v_label, '')
           || coalesce(' (' || to_char(o.event_date, 'DD/MM/YYYY') || coalesce(' ' || o.event_time, '') || ')', '');
  v_ref := public.next_quote_number();
  v_num := public.next_quote_display_number();
  if exists (select 1 from quotes where number = v_num) then v_num := v_ref; end if;
  insert into quotes (reference, number, title, status, currency, total_amount, client_id, language,
                      period_start, period_end, party_size, created_by, deposit_pct)
  values (v_ref, v_num, 'Billets — ' || o.title, 'draft', v_currency, v_unit_price * p_qty,
          p_client, coalesce(p_language, 'fr'), o.event_date, o.event_date, p_qty, auth.uid(), 100)
  returning id into v_qid;
  insert into quote_lines (quote_id, position, label, unit, quantity, unit_price, currency, ticket_offer_id, ticket_offer_variant_id)
  values (v_qid, 0, v_line, 'Billet', p_qty, v_unit_price, v_currency, o.id, p_variant);
  return v_qid;
end $$;
revoke all on function public.sell_ticket_quote(uuid, uuid, int, uuid, text) from public, anon;
grant execute on function public.sell_ticket_quote(uuid, uuid, int, uuid, text) to authenticated;
