-- Audit sécurité (9 nov. 2026) : des fonctions SECURITY DEFINER étaient appelables
-- sans connexion via /rest/v1/rpc. Certaines renvoyaient des données d'équipe
-- (briefs quotidiens, noms par canal). Les tâches planifiées et les autres
-- fonctions continuent de les appeler (elles s'exécutent en tant que propriétaire).

-- 1. Fonctions internes : ni visiteurs ni comptes connectés.
do $$
declare f text;
begin
  foreach f in array array[
    'public.cm_brief_text(uuid, date)',
    'public.lili_brief_text(date, boolean)',
    'public.cm_people_for_channel(text)',
    'public.person_key(uuid)',
    'public.ensure_tracking_links(uuid)',
    'public.quote_refresh_paid_status(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- 2. Aides utilisées par les règles d'accès (RLS) : réservées aux comptes connectés.
do $$
declare f text;
begin
  foreach f in array array[
    'public.my_short_name()',
    'public.is_cm(uuid)',
    'public.cm_has_pole(uuid, text)',
    'public.partner_ledger_start()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- 3. Fonctions de déclencheurs : jamais appelées directement.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef
       and pg_get_function_result(p.oid) = 'trigger'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

-- 4. Vues de pilotage événementiel : pas d'accès visiteur.
revoke all on public.cm_agent_notes, public.cm_events, public.cm_event_sales_daily, public.cm_event_tracking from anon;
