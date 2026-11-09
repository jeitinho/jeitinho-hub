-- Automatisations (09/11/2026) :
--  1. Registre des parts alimenté automatiquement (réservations plateformes, paiements clients).
--  2. Relances de devis générées par le serveur (plus besoin d'ouvrir le CRM).
--  3. Messages clients des voyages : bienvenue J-3, programme de demain, demande d'avis.
--     Les messages restent des BROUILLONS dans « À envoyer » : un humain valide et envoie.
--  4. Planning des guides : chaque soir, chaque guide reçoit ses tours du lendemain sur WhatsApp.
--  5. Guide assigné aux réservations GetYourGuide (message client au nom du bon guide).

-- ---------------------------------------------------------------- colonnes
alter table public.ota_bookings add column if not exists guide_id uuid references auth.users(id) on delete set null;
alter table public.partner_members add column if not exists whatsapp text;
alter table public.crm_tasks add column if not exists dedupe_key text;
create unique index if not exists crm_tasks_dedupe_key on public.crm_tasks (dedupe_key) where dedupe_key is not null;
alter table public.crm_tasks add column if not exists trip_id uuid references public.trips(id) on delete cascade;

update public.partner_members set whatsapp = '+55 79 99198-0280'
 where display_name = 'Rafael' and whatsapp is null;

-- ---------------------------------------------------------------- 1. registre auto
create or replace function public.partner_ledger_from_ota() returns trigger
language plpgsql security definer set search_path = public as $$
declare rate numeric;
begin
  if tg_op = 'DELETE' then
    delete from partner_ledger_entries where source_type = 'ota_booking' and source_id = old.id;
    return old;
  end if;
  if coalesce(new.status,'') in ('annulee','cancelled','canceled') or coalesce(new.price,0) <= 0 then
    delete from partner_ledger_entries where source_type = 'ota_booking' and source_id = new.id;
    return new;
  end if;
  select eur_brl into rate from partner_settings where id = 1;
  rate := coalesce(rate, 5.5);
  insert into partner_ledger_entries (occurred_on, label, source_type, source_id, revenue, direct_cost,
                                      guided_internally, guide_id, original_amount, original_currency, notes)
  values (coalesce((new.start_at at time zone 'America/Sao_Paulo')::date, current_date),
          coalesce(new.activity_title, 'Réservation plateforme') || ' — ' || coalesce(new.lead_name, new.booking_ref, ''),
          'ota_booking', new.id,
          round(case when upper(coalesce(new.currency,'BRL')) = 'EUR' then new.price * rate else new.price end, 2),
          0, true, new.guide_id, new.price, upper(coalesce(new.currency,'BRL')),
          initcap(new.platform) || ' ' || coalesce(new.booking_ref,''))
  on conflict (source_type, source_id) where source_id is not null do update set
    occurred_on = excluded.occurred_on,
    revenue = excluded.revenue,
    original_amount = excluded.original_amount,
    original_currency = excluded.original_currency,
    guide_id = coalesce(excluded.guide_id, partner_ledger_entries.guide_id);
  return new;
end $$;

drop trigger if exists ota_bookings_ledger on public.ota_bookings;
create trigger ota_bookings_ledger after insert or update or delete on public.ota_bookings
  for each row execute function public.partner_ledger_from_ota();

create or replace function public.partner_ledger_from_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare rate numeric; who text;
begin
  if tg_op = 'DELETE' then
    delete from partner_ledger_entries where source_type = 'payment' and source_id = old.id;
    return old;
  end if;
  if new.event_id is not null or (new.quote_id is null and new.trip_id is null) or coalesce(new.amount,0) <= 0 then
    delete from partner_ledger_entries where source_type = 'payment' and source_id = new.id;
    return new;
  end if;
  select eur_brl into rate from partner_settings where id = 1;
  rate := coalesce(rate, 5.5);
  select full_name into who from clients where id = new.client_id;
  insert into partner_ledger_entries (occurred_on, label, source_type, source_id, revenue, direct_cost,
                                      original_amount, original_currency, notes)
  values (coalesce(new.paid_at, current_date),
          'Paiement client' || coalesce(' — ' || who, '') || coalesce(' (' || new.kind || ')', ''),
          'payment', new.id,
          round(case when upper(coalesce(new.currency,'EUR')) = 'EUR' then new.amount * rate else new.amount end, 2),
          0, new.amount, upper(coalesce(new.currency,'EUR')), new.reference)
  on conflict (source_type, source_id) where source_id is not null do update set
    occurred_on = excluded.occurred_on,
    revenue = excluded.revenue,
    original_amount = excluded.original_amount,
    original_currency = excluded.original_currency;
  return new;
end $$;

drop trigger if exists payments_ledger on public.payments;
create trigger payments_ledger after insert or update or delete on public.payments
  for each row execute function public.partner_ledger_from_payment();

-- ---------------------------------------------------------------- 5. message GYG au nom du guide
-- Le brouillon « ota_reservation » est créé à l'insertion avec Rafael comme guide.
-- Quand on assigne un autre guide, le brouillon encore à valider est réécrit.
create or replace function public.ota_guide_draft(b public.ota_bookings) returns text
language plpgsql stable security definer set search_path = public as $$
declare l record; g_name text; g_phone text; v_meet text; v_prep text; fr boolean;
begin
  select coalesce(display_name, 'Rafael'), coalesce(whatsapp, '+55 79 99198-0280') into g_name, g_phone
    from partner_members where user_id = b.guide_id;
  g_name := coalesce(g_name, 'Rafael'); g_phone := coalesce(g_phone, '+55 79 99198-0280');
  select * into l from ota_listings
   where id = b.listing_id or (b.listing_id is null and lower(title) = lower(b.activity_title))
   order by (id = b.listing_id) desc nulls last limit 1;
  v_meet := coalesce(l.meeting_point, '[POINT DE RDV À PRÉCISER]');
  v_prep := replace(coalesce(l.prep_note, 'Vérifier le matériel pour {n} personne(s).'), '{n}', coalesce(b.participants::text,'?'));
  fr := coalesce(b.lead_language,'') ilike 'fran%';
  return case when fr then
      'Bonjour ' || coalesce(split_part(b.lead_name,' ',1),'') || ', ici ' || g_name || ', votre guide pour « '
      || coalesce(b.activity_title,'la visite') || ' » le '
      || coalesce(to_char(b.start_at at time zone 'America/Sao_Paulo','DD/MM "à" HH24"h"MI'),'jour prévu')
      || '. Point de rendez-vous : ' || v_meet || '. Vous pouvez me joindre sur WhatsApp : ' || g_phone || '. À très vite !'
    else
      'Hi ' || coalesce(split_part(b.lead_name,' ',1),'') || ', this is ' || g_name || ', your guide for "'
      || coalesce(b.activity_title,'the tour') || '" on '
      || coalesce(to_char(b.start_at at time zone 'America/Sao_Paulo','DD/MM "at" HH24:MI'),'your date')
      || '. Meeting point: ' || v_meet || '. You can reach me on WhatsApp: ' || g_phone || '. See you soon!'
    end
    || E'\n\n— À envoyer via la messagerie GetYourGuide. ' || v_prep || ' Client(e) parle '
    || coalesce(b.lead_language,'?') || '. Après le tour : demander un avis (QR code).';
end $$;

create or replace function public.ota_guide_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.guide_id is distinct from old.guide_id then
    update crm_tasks set message_draft = public.ota_guide_draft(new), updated_at = now()
     where kind = 'ota_reservation' and status = 'a_valider'
       and title like ('GYG ' || new.booking_ref || ' %');
  end if;
  return new;
end $$;

drop trigger if exists ota_bookings_guide_changed on public.ota_bookings;
create trigger ota_bookings_guide_changed after update of guide_id on public.ota_bookings
  for each row execute function public.ota_guide_changed();

-- ---------------------------------------------------------------- 2. relances de devis (serveur)
create or replace function public.quote_followup_draft(stage int, client_name text, quote_number text,
  title text, amount numeric, currency text, period_start date) returns text
language sql immutable set search_path = public as $$
  select case stage
    when 1 then 'Olá ' || coalesce(nullif(split_part(coalesce(client_name,''),' ',1),''),'bonjour') || ' ! Je voulais m''assurer que vous avez bien reçu la proposition « '
      || coalesce(title,'votre séjour') || ' »' || coalesce(' (réf. ' || quote_number || ')','')
      || coalesce(' — ' || to_char(amount,'FM999G999G990D00') || ' ' || coalesce(currency,'EUR'),'')
      || '. Des questions, des ajustements à faire ? Je suis là.'
    when 2 then 'Bonjour ' || coalesce(nullif(split_part(coalesce(client_name,''),' ',1),''),'bonjour') || ', un petit mot au sujet de votre projet'
      || coalesce(' pour ' || to_char(period_start,'DD/MM/YYYY'),'') || coalesce(' (réf. ' || quote_number || ')','')
      || '. Si vous souhaitez modifier le programme ou le budget, je peux vous refaire une version en quelques minutes.'
    when 3 then 'Bonjour ' || coalesce(nullif(split_part(coalesce(client_name,''),' ',1),''),'bonjour') || ', je garde vos dates'
      || coalesce(' pour ' || to_char(period_start,'DD/MM/YYYY'),'')
      || ' en tête. Les disponibilités bougent vite sur cette période — souhaitez-vous que je bloque les prestations principales ?'
    else 'Bonjour ' || coalesce(nullif(split_part(coalesce(client_name,''),' ',1),''),'bonjour') || ', je clôture votre dossier'
      || coalesce(' (réf. ' || quote_number || ')','')
      || ' sauf si le projet est toujours d''actualité. Dites-moi simplement oui ou non, et je m''adapte à votre calendrier.'
  end $$;

create or replace function public.crm_generate_quote_followups() returns integer
language plpgsql security definer set search_path = public as $$
declare q record; s int; offs int[] := array[1,3,7,14]; labels text[] := array['Relance J+1','Relance J+3','Relance J+7','Relance J+14'];
        due timestamptz; n int := 0;
begin
  for q in select qu.*, c.full_name from quotes qu left join clients c on c.id = qu.client_id
            where qu.status = 'sent' and not coalesce(qu.followup_paused,false)
              and coalesce(qu.followup_anchor_at, qu.sent_at) is not null loop
    for s in (coalesce(q.followup_stage,0) + 1) .. 4 loop
      due := coalesce(q.followup_anchor_at, q.sent_at) + make_interval(days => offs[s]);
      exit when due > now();
      insert into crm_tasks (kind, channel, status, stage, quote_id, client_id, due_at, title, message_draft)
      values ('relance_devis','whatsapp','a_valider', s, q.id, q.client_id, due,
              labels[s] || ' — ' || coalesce(q.number, q.reference),
              public.quote_followup_draft(s, q.full_name, coalesce(q.number,q.reference), q.title, q.total_amount, q.currency, q.period_start))
      on conflict (quote_id, stage) do nothing;
      if found then n := n + 1; end if;
    end loop;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------- 3. messages clients des voyages
create or replace function public.trip_client_language(p_quote_id uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select lower(left(language,2)) from quotes where id = p_quote_id), 'fr') $$;

create or replace function public.crm_generate_trip_messages() returns integer
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'America/Sao_Paulo')::date; t record; first text; lang text;
        prog text; n int := 0; c record;
begin
  for t in select tr.*, cl.full_name, cl.phone from trips tr left join clients cl on cl.id = tr.client_id
            where tr.status in ('confirmed','in_progress') and tr.start_date is not null loop
    first := coalesce(nullif(split_part(coalesce(t.full_name,''),' ',1),''), '');
    lang := public.trip_client_language(t.quote_id);

    -- Bienvenue à J-3
    if t.start_date - d between 0 and 3 then
      insert into crm_tasks (kind, channel, status, title, message_draft, due_at, client_id, trip_id, dedupe_key)
      values ('bienvenue_voyage','whatsapp','a_valider',
        'Bienvenue — ' || coalesce(t.title, t.reference),
        case when lang = 'en' then 'Hi ' || first || '! Your Rio trip starts on ' || to_char(t.start_date,'DD/MM') || '. I''m sending your day-by-day program right away — tell me your flight number and I''ll organise everything on arrival. See you very soon!'
             when lang = 'pt' then 'Olá ' || first || '! Sua viagem no Rio começa dia ' || to_char(t.start_date,'DD/MM') || '. Já te mando o programa dia a dia — me passa o número do voo que eu organizo tudo na chegada. Até já!'
             else 'Bonjour ' || first || ' ! Votre séjour à Rio commence le ' || to_char(t.start_date,'DD/MM') || '. Je vous envoie votre programme jour par jour — donnez-moi votre numéro de vol et je m''occupe de tout à l''arrivée. À très vite !' end,
        (t.start_date - 3)::timestamp at time zone 'America/Sao_Paulo' + interval '10 hours',
        t.client_id, t.id, 'bienvenue:' || t.id)
      on conflict (dedupe_key) where dedupe_key is not null do nothing;
      if found then n := n + 1; end if;
    end if;

    -- Programme de demain (pendant le séjour, et la veille de l'arrivée)
    if d + 1 between t.start_date and coalesce(t.end_date, t.start_date) then
      prog := null;
      for c in select coalesce(display_time, to_char(scheduled_start at time zone 'America/Sao_Paulo','HH24"h"MI'),
                              case slot when 'matin' then 'Matin' when 'midi' then 'Midi' when 'apres_midi' then 'Après-midi'
                                        when 'soir' then 'Soir' when 'nuit' then 'Nuit' else '' end) as h, title
                 from trip_activities
                where trip_id = t.id and day = d + 1 and coalesce(status,'') not in ('cancelled','replaced')
                  and coalesce(kind,'activity') <> 'note'
                order by scheduled_start nulls last, array_position(array['matin','midi','apres_midi','soir','nuit'], slot) loop
        prog := coalesce(prog || E'\n', '') || '• ' || coalesce(nullif(btrim(c.h),'') || ' — ', '') || c.title;
      end loop;
      if prog is not null then
        insert into crm_tasks (kind, channel, status, title, message_draft, due_at, client_id, trip_id, dedupe_key)
        values ('programme_demain','whatsapp','a_valider',
          'Programme du ' || to_char(d + 1,'DD/MM') || ' — ' || coalesce(t.title, t.reference),
          case when lang = 'en' then 'Hi ' || first || '! Here is your program for tomorrow (' || to_char(d+1,'DD/MM') || E'):\n' || prog || E'\nAny question, I''m here.'
               when lang = 'pt' then 'Olá ' || first || '! Seu programa de amanhã (' || to_char(d+1,'DD/MM') || E'):\n' || prog || E'\nQualquer dúvida, estou aqui.'
               else 'Bonjour ' || first || ' ! Votre programme de demain (' || to_char(d+1,'DD/MM') || E') :\n' || prog || E'\nUne question, je suis là.' end,
          d::timestamp at time zone 'America/Sao_Paulo' + interval '18 hours',
          t.client_id, t.id, 'programme:' || t.id || ':' || (d + 1))
        on conflict (dedupe_key) where dedupe_key is not null do nothing;
        if found then n := n + 1; end if;
      end if;
    end if;

    -- Demande d'avis le lendemain du départ
    if coalesce(t.end_date, t.start_date) = d - 1 then
      insert into crm_tasks (kind, channel, status, title, message_draft, due_at, client_id, trip_id, dedupe_key)
      values ('demande_avis','whatsapp','a_valider', 'Avis — ' || coalesce(t.title, t.reference),
        case when lang = 'en' then 'Hi ' || first || ', thank you for travelling with JEITINHO! If you have one minute, your review helps us a lot: [LIEN AVIS GOOGLE]'
             when lang = 'pt' then 'Olá ' || first || ', obrigado por viajar com a JEITINHO! Se tiver um minuto, sua avaliação ajuda muito: [LIEN AVIS GOOGLE]'
             else 'Bonjour ' || first || ', merci d''avoir voyagé avec JEITINHO ! Si vous avez une minute, votre avis nous aide énormément : [LIEN AVIS GOOGLE]' end
          || E'\n\n— Remplacer [LIEN AVIS GOOGLE] par le lien d''avis avant envoi.',
        now(), t.client_id, t.id, 'avis:' || t.id)
      on conflict (dedupe_key) where dedupe_key is not null do nothing;
      if found then n := n + 1; end if;
    end if;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------- 4. planning des guides (WhatsApp, chaque soir)
create or replace function public.guide_planning_text(_user_id uuid, _day date) returns text
language plpgsql stable security definer set search_path = public as $$
declare r record; txt text := null; is_admin boolean := public.has_role(_user_id, 'admin');
begin
  for r in
    select to_char(o.start_at at time zone 'America/Sao_Paulo','HH24"h"MI') h,
           o.activity_title || ' · ' || coalesce(o.participants::text,'?') || ' pers. · ' || coalesce(o.lead_name,'')
             || coalesce(' (' || o.lead_language || ')','') || coalesce(E'\n   📍 ' || l.meeting_point, '') || coalesce(' · ' || o.lead_phone,'') as line,
           o.start_at as sort_at,
           o.guide_id is null as unassigned
      from ota_bookings o
      left join ota_listings l on l.id = o.listing_id
     where (o.start_at at time zone 'America/Sao_Paulo')::date = _day
       and coalesce(o.status,'') not in ('annulee','cancelled','canceled')
       and (o.guide_id = _user_id or (o.guide_id is null and is_admin))
    union all
    select coalesce(a.display_time, to_char(a.scheduled_start at time zone 'America/Sao_Paulo','HH24"h"MI'), a.slot, ''),
           a.title || ' · ' || coalesce(t.title, t.reference) || coalesce(' · ' || t.party_size || ' pers.',''),
           coalesce(a.scheduled_start, _day::timestamptz),
           false
      from trip_activities a join trips t on t.id = a.trip_id
     where a.day = _day and t.guide_id = _user_id
       and t.status in ('confirmed','in_progress')
       and coalesce(a.status,'') not in ('cancelled','replaced') and coalesce(a.kind,'activity') <> 'note'
     order by 3
  loop
    txt := coalesce(txt || E'\n', '') || '• ' || coalesce(nullif(r.h,''),'—') || ' — ' || r.line
           || case when r.unassigned then ' ⚠️ sans guide' else '' end;
  end loop;
  if txt is null then return null; end if;
  return 'JEITINHO — tes tours de demain (' || to_char(_day,'DD/MM') || E') :\n' || txt
         || E'\n\nDétails : manager.jeitinho.fr/calendrier';
end $$;

create or replace function public.send_guide_plannings() returns text
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'America/Sao_Paulo')::date + 1; u record; txt text; key text; out text := '';
begin
  for u in select distinct ur.user_id, public.person_key(ur.user_id) person
             from user_roles ur join profiles p on p.id = ur.user_id and p.is_active
            where ur.role in ('associe','guide','admin') loop
    txt := public.guide_planning_text(u.user_id, d);
    if txt is null then continue; end if;
    key := u.person || '-guide';
    if exists (select 1 from team_briefs where day = d and person = key and sent_at is not null) then continue; end if;
    insert into team_briefs (day, person, content) values (d, key, txt)
      on conflict (day, person) do update set content = excluded.content;
    if public.has_role(u.user_id, 'admin') and not exists (select 1 from vault.decrypted_secrets where name = 'callmebot_apikey_' || u.person) then
      perform public.notify_rafael(txt);
      update team_briefs set sent_at = now() where day = d and person = key;
      out := out || u.person || ': envoyé; ';
    elsif public.notify_whatsapp(u.person, txt) is not null then
      update team_briefs set sent_at = now() where day = d and person = key;
      out := out || u.person || ': envoyé; ';
    else
      out := out || u.person || ': clé WhatsApp manquante; ';
    end if;
  end loop;
  return nullif(out,'');
end $$;

revoke execute on function public.partner_ledger_from_ota(), public.partner_ledger_from_payment(),
  public.ota_guide_draft(public.ota_bookings), public.ota_guide_changed(),
  public.crm_generate_quote_followups(), public.crm_generate_trip_messages(),
  public.guide_planning_text(uuid, date), public.send_guide_plannings(),
  public.trip_client_language(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- tâches planifiées (UTC ; Rio = UTC-3)
select cron.unschedule(jobname) from cron.job where jobname in ('crm-relances-devis','crm-messages-voyages','guides-planning-soir');
select cron.schedule('crm-relances-devis', '7 * * * *', 'select public.crm_generate_quote_followups()');
select cron.schedule('crm-messages-voyages', '20 12 * * *', 'select public.crm_generate_trip_messages()');   -- 09h20 Rio
select cron.schedule('guides-planning-soir', '30 22 * * *', 'select public.send_guide_plannings()');       -- 19h30 Rio

-- Rattrapage : réservations plateformes et paiements déjà présents → registre
insert into public.partner_ledger_entries (occurred_on, label, source_type, source_id, revenue, direct_cost, guided_internally, guide_id, original_amount, original_currency, notes)
select coalesce((o.start_at at time zone 'America/Sao_Paulo')::date, current_date),
       coalesce(o.activity_title,'Réservation plateforme') || ' — ' || coalesce(o.lead_name, o.booking_ref, ''),
       'ota_booking', o.id,
       round(case when upper(coalesce(o.currency,'BRL')) = 'EUR' then o.price * 5.5 else o.price end, 2),
       0, true, o.guide_id, o.price, upper(coalesce(o.currency,'BRL')), initcap(o.platform) || ' ' || coalesce(o.booking_ref,'')
  from public.ota_bookings o
 where coalesce(o.status,'') not in ('annulee','cancelled','canceled') and coalesce(o.price,0) > 0
on conflict (source_type, source_id) where source_id is not null do nothing;
