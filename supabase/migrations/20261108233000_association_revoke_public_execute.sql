-- Les fonctions de l'association ne sont appelables que par un utilisateur connecté.
revoke execute on function public.is_associe(uuid), public.can_operate(uuid), public.partner_ledger_import_month(date), public.import_quote_into_trip(uuid, uuid) from public, anon;
grant execute on function public.is_associe(uuid), public.can_operate(uuid), public.partner_ledger_import_month(date), public.import_quote_into_trip(uuid, uuid) to authenticated, service_role;
