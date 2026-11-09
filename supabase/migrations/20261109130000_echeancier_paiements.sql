-- Échéancier client (modèle WeTravel) : date limite du solde par devis + brouillons de relance
-- dans « À envoyer » (jamais envoyés sans validation).
alter table public.quotes add column if not exists balance_due_on date;

create or replace function public.crm_generate_payment_reminders() returns integer
language plpgsql security definer set search_path = public as $$
declare d date := (now() at time zone 'America/Sao_Paulo')::date; q record; paid numeric; deposit numeric;
        remaining numeric; first text; n int := 0;
begin
  for q in select qu.*, c.full_name from quotes qu left join clients c on c.id = qu.client_id
            where qu.status in ('accepted','ready') and coalesce(qu.total_amount,0) > 0 loop
    select coalesce(sum(case when p.kind in ('acompte','solde','total') then p.amount
                             when p.kind = 'remboursement' then -p.amount else 0 end), 0)
      into paid from payments p
     where p.quote_id = q.id and upper(coalesce(p.currency, q.currency, 'EUR')) = upper(coalesce(q.currency, 'EUR'));
    deposit := round(q.total_amount * coalesce(q.deposit_pct, 0) / 100.0, 2);
    remaining := q.total_amount - paid;
    first := coalesce(nullif(split_part(coalesce(q.full_name,''),' ',1),''), '');

    -- Acompte toujours attendu 2 jours après l'acceptation
    if paid < deposit - 0.005 and q.accepted_at is not null and (q.accepted_at at time zone 'America/Sao_Paulo')::date <= d - 2 then
      insert into crm_tasks (kind, channel, status, title, message_draft, due_at, quote_id, client_id, dedupe_key)
      values ('relance_paiement','whatsapp','a_valider',
        'Acompte attendu — ' || coalesce(q.number, q.reference),
        'Bonjour ' || first || ' ! Pour confirmer les réservations de votre séjour (réf. ' || coalesce(q.number, q.reference)
          || '), il reste l''acompte de ' || to_char(deposit - paid, 'FM999G999G990D00') || ' ' || coalesce(q.currency,'EUR')
          || ' à régler. Je vous renvoie le lien de paiement ?',
        now(), q.id, q.client_id, 'acompte:' || q.id)
      on conflict (dedupe_key) where dedupe_key is not null do nothing;
      if found then n := n + 1; end if;
    end if;

    -- Solde : rappel 3 jours avant l'échéance, puis relance le lendemain de l'échéance
    if q.balance_due_on is not null and remaining > 0.005 and paid >= deposit - 0.005 then
      if q.balance_due_on - d between 0 and 3 then
        insert into crm_tasks (kind, channel, status, title, message_draft, due_at, quote_id, client_id, dedupe_key)
        values ('relance_paiement','whatsapp','a_valider',
          'Solde dû le ' || to_char(q.balance_due_on,'DD/MM') || ' — ' || coalesce(q.number, q.reference),
          'Bonjour ' || first || ' ! Petit rappel : le solde de votre séjour (réf. ' || coalesce(q.number, q.reference) || '), soit '
            || to_char(remaining, 'FM999G999G990D00') || ' ' || coalesce(q.currency,'EUR') || ', est à régler avant le '
            || to_char(q.balance_due_on,'DD/MM') || '. Je vous envoie le lien ?',
          now(), q.id, q.client_id, 'solde:' || q.id || ':' || q.balance_due_on)
        on conflict (dedupe_key) where dedupe_key is not null do nothing;
        if found then n := n + 1; end if;
      elsif q.balance_due_on < d then
        insert into crm_tasks (kind, channel, status, title, message_draft, due_at, quote_id, client_id, dedupe_key)
        values ('relance_paiement','whatsapp','a_valider',
          'Solde en retard — ' || coalesce(q.number, q.reference),
          'Bonjour ' || first || ', le solde de votre séjour (réf. ' || coalesce(q.number, q.reference) || '), '
            || to_char(remaining, 'FM999G999G990D00') || ' ' || coalesce(q.currency,'EUR') || ', était attendu le '
            || to_char(q.balance_due_on,'DD/MM') || '. Pouvez-vous me dire quand le régler ? Je vous renvoie le lien si besoin.',
          now(), q.id, q.client_id, 'solde-retard:' || q.id || ':' || q.balance_due_on)
        on conflict (dedupe_key) where dedupe_key is not null do nothing;
        if found then n := n + 1; end if;
      end if;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public.crm_generate_payment_reminders() from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname = 'crm-relances-paiement';
select cron.schedule('crm-relances-paiement', '25 12 * * *', 'select public.crm_generate_payment_reminders()');
