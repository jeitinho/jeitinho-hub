-- Les associés gèrent l'offre (tarifs, coûts) au même titre que les gérants :
-- ils pouvaient déjà modifier services et billets, pas les expériences.
drop policy if exists experiences_associes on public.experiences;
create policy experiences_associes on public.experiences
  for all to authenticated using (public.is_associe(auth.uid())) with check (public.is_associe(auth.uid()));
