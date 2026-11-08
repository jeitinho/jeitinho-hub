-- Le Manuel fait partie du périmètre de l'association : ventes (lecture), canaux de distribution, commission payée.
drop policy if exists sales_associes_read on public.sales;
create policy sales_associes_read on public.sales for select to authenticated using (public.is_associe(auth.uid()));
drop policy if exists sales_channels_associes on public.sales_channels;
create policy sales_channels_associes on public.sales_channels for all to authenticated using (public.is_associe(auth.uid())) with check (public.is_associe(auth.uid()));
do $$
declare def text;
begin
  select pg_get_functiondef('public.set_sale_commission_paid'::regproc) into def;
  if def like '%can_manage(auth.uid())%' then
    execute replace(def, 'can_manage(auth.uid())', 'can_operate(auth.uid())');
  end if;
end $$;
