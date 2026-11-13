-- Suite de l'audit du 12/11/2026
--  1. Langue du hub stockée dans le profil + notifications push traduites (FR/PT/EN)
--  2. Sécurité : un utilisateur ne peut plus modifier lui-même son statut / activation
--  3. Devis : date de validité automatique, passage en « expiré », rappel la veille
--  4. Voyages : passage automatique en cours / terminé
--  5. Formulaires publics : anti-doublon et plafond anti-spam

-- ─── 1. Langue ──────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists ui_lang text not null default 'fr'
  check (ui_lang in ('fr', 'pt', 'en'));

create or replace function public.push_tr(p_text text, p_lang text)
returns text language plpgsql immutable set search_path to 'public' as $$
declare t text := p_text;
begin
  if t is null or p_lang not in ('pt', 'en') then return t; end if;
  if p_lang = 'pt' then
    t := regexp_replace(t, '^Réservation payée sur le site · ', 'Reserva paga no site · ');
    t := regexp_replace(t, '^Réservation ', 'Reserva ');
    t := regexp_replace(t, '^Nouvelle demande · ', 'Nova demanda · ');
    t := regexp_replace(t, '^Demande sans réponse · ', 'Demanda sem resposta · ');
    t := regexp_replace(t, '^Nouvelle sortie pour toi$', 'Novo passeio para você');
    t := regexp_replace(t, '^Devis (.+) expire demain$', 'Orçamento \1 expira amanhã');
    t := regexp_replace(t, 'arrivée il y a (\d+) h', 'chegou há \1 h', 'g');
    t := regexp_replace(t, 'voyage le ', 'viagem em ', 'g');
    t := regexp_replace(t, '(\d+) pers\.', '\1 pess.', 'g');
    t := regexp_replace(t, '· client$', '· cliente');
    t := regexp_replace(t, '— Sortie$', '— Passeio');
    t := regexp_replace(t, 'Sans réponse, la relance s''arrête\.', 'Sem resposta, o follow-up para.', 'g');
  else
    t := regexp_replace(t, '^Réservation payée sur le site · ', 'Paid booking on the website · ');
    t := regexp_replace(t, '^Réservation ', 'Booking ');
    t := regexp_replace(t, '^Nouvelle demande · ', 'New request · ');
    t := regexp_replace(t, '^Demande sans réponse · ', 'Unanswered request · ');
    t := regexp_replace(t, '^Nouvelle sortie pour toi$', 'New tour for you');
    t := regexp_replace(t, '^Devis (.+) expire demain$', 'Quote \1 expires tomorrow');
    t := regexp_replace(t, 'arrivée il y a (\d+) h', 'received \1 h ago', 'g');
    t := regexp_replace(t, 'voyage le ', 'trip on ', 'g');
    t := regexp_replace(t, '(\d+) pers\.', '\1 pax', 'g');
    t := regexp_replace(t, '— Sortie$', '— Tour');
    t := regexp_replace(t, 'Sans réponse, la relance s''arrête\.', 'Without a reply, follow-ups stop.', 'g');
  end if;
  return t;
end $$;

-- Toutes les notifications passent par push_outbox : on traduit à l'insertion,
-- selon la langue du destinataire. Les textes déjà rédigés dans une autre
-- langue ne correspondent à aucun motif et restent intacts.
create or replace function public.push_outbox_localize()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_lang text;
begin
  select ui_lang into v_lang from public.profiles where id = new.user_id;
  if v_lang in ('pt', 'en') then
    new.title := public.push_tr(new.title, v_lang);
    new.body := public.push_tr(new.body, v_lang);
  end if;
  return new;
end $$;

drop trigger if exists push_outbox_localize on public.push_outbox;
create trigger push_outbox_localize before insert on public.push_outbox
  for each row execute function public.push_outbox_localize();

-- Luan et Patricia utilisent le hub en portugais.
update public.profiles set ui_lang = 'pt'
 where email in ('luan@jeitinho.fr', 'patrivargaas032@gmail.com');

-- ─── 2. Sécurité profils ─────────────────────────────────────────────────────
-- La règle RLS « update self » laissait un compte en attente se passer lui-même
-- en status = active / is_active = true. Seuls admin/manager touchent ces champs.
create or replace function public.profiles_guard_self_update()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is not null and not public.can_manage(auth.uid())
     and (new.status is distinct from old.status or new.is_active is distinct from old.is_active) then
    raise exception 'Seul un administrateur peut changer le statut d''un compte';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_self_update on public.profiles;
create trigger profiles_guard_self_update before update on public.profiles
  for each row execute function public.profiles_guard_self_update();

-- ─── 3. Devis ────────────────────────────────────────────────────────────────
create or replace function public.quotes_set_valid_until()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.status = 'sent' and new.sent_at is not null and new.valid_until is null then
    new.valid_until := (new.sent_at at time zone 'America/Sao_Paulo')::date + coalesce(nullif(new.validity_days, 0), 14);
  end if;
  return new;
end $$;

drop trigger if exists quotes_set_valid_until on public.quotes;
create trigger quotes_set_valid_until before insert or update of status, sent_at, valid_until on public.quotes
  for each row execute function public.quotes_set_valid_until();

update public.quotes
   set valid_until = (sent_at at time zone 'America/Sao_Paulo')::date + coalesce(nullif(validity_days, 0), 14)
 where status = 'sent' and sent_at is not null and valid_until is null;

create or replace function public.quotes_expire_and_warn()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare r record; n int := 0; today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  -- Rappel la veille de l'expiration
  for r in select q.id, coalesce(q.number, q.reference) num, c.full_name
             from public.quotes q left join public.clients c on c.id = q.client_id
            where q.status = 'sent' and q.valid_until = today + 1 loop
    perform public.notify_push(public.push_operators(),
      'Devis ' || r.num || ' expire demain',
      concat_ws(' · ', r.full_name, 'Sans réponse, la relance s''arrête.'),
      '/devis/' || r.id, 'quote-expiry-' || r.id);
  end loop;
  -- Expiration
  update public.quotes set status = 'expired', updated_at = now()
   where status = 'sent' and valid_until is not null and valid_until < today;
  get diagnostics n = row_count;
  return n;
end $$;

-- ─── 4. Voyages ──────────────────────────────────────────────────────────────
create or replace function public.trips_auto_status()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n int; m int; today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  update public.trips set status = 'in_progress', updated_at = now()
   where status = 'confirmed' and start_date <= today and coalesce(end_date, start_date) >= today;
  get diagnostics n = row_count;
  update public.trips set status = 'completed', updated_at = now()
   where status in ('confirmed', 'in_progress') and coalesce(end_date, start_date) < today;
  get diagnostics m = row_count;
  return n + m;
end $$;

revoke all on function public.quotes_expire_and_warn() from public, anon, authenticated;
revoke all on function public.trips_auto_status() from public, anon, authenticated;
revoke all on function public.push_outbox_localize() from public, anon, authenticated;
revoke all on function public.profiles_guard_self_update() from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname in ('devis-expiration', 'voyages-statut');
select cron.schedule('devis-expiration', '3 13 * * *', 'select public.quotes_expire_and_warn()');  -- 10h03 Rio
select cron.schedule('voyages-statut', '9 3 * * *', 'select public.trips_auto_status()');        -- 00h09 Rio

-- ─── 5. Formulaires publics ──────────────────────────────────────────────────
create or replace function public.public_form_guard(p_form text, p_email text, p_phone text)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
  if p_form = 'lead' then
    -- Même personne qui renvoie le formulaire dans les 10 min : on renvoie la demande existante
    select l.id into v_id from public.leads l
     where l.external_ref is null and l.received_at > now() - interval '10 minutes'
       and ((p_email is not null and lower(l.email) = lower(p_email)) or (p_phone is not null and l.phone = p_phone))
     order by l.received_at desc limit 1;
    if v_id is not null then return v_id; end if;
    -- Plafond global (en temps normal : 1 à 2 demandes par jour)
    if (select count(*) from public.leads where external_ref is null and received_at > now() - interval '1 hour') >= 40 then
      raise exception 'Trop de demandes en ce moment, merci de réessayer plus tard';
    end if;
  elsif p_form = 'partner' then
    if (select count(*) from public.partners where source = 'blog' and submitted_at > now() - interval '1 hour') >= 20 then
      raise exception 'Trop de candidatures en ce moment, merci de réessayer plus tard';
    end if;
  end if;
  return null;
end $$;
revoke all on function public.public_form_guard(text, text, text) from public, anon, authenticated;

-- Branche le garde au début des deux fonctions publiques (corps inchangé sinon).
do $mig$
declare d text;
begin
  d := pg_get_functiondef('public.capture_public_lead(jsonb)'::regprocedure);
  if d !~ 'public_form_guard' then
    d := replace(d,
      'IF lead_external_ref IS NOT NULL THEN',
      'lead_name := left(lead_name, 200); lead_message := left(lead_message, 5000);
  IF lead_external_ref IS NULL THEN
    new_id := public.public_form_guard(''lead'', lead_email, lead_phone);
    IF new_id IS NOT NULL THEN RETURN new_id; END IF;
  END IF;

  IF lead_external_ref IS NOT NULL THEN');
    if d !~ 'public_form_guard' then raise exception 'capture_public_lead : point d''insertion introuvable'; end if;
    execute d;
  end if;

  d := pg_get_functiondef('public.submit_partner_application(jsonb)'::regprocedure);
  if d !~ 'public_form_guard' then
    d := replace(d,
      '  if v_existing is not null then return v_existing; end if;',
      '  if v_existing is not null then return v_existing; end if;
  perform public.public_form_guard(''partner'', v_email, v_phone);');
    if d !~ 'public_form_guard' then raise exception 'submit_partner_application : point d''insertion introuvable'; end if;
    execute d;
  end if;
end $mig$;
