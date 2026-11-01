-- Devis et factures : les PDF existent maintenant en italien, allemand et russe.
-- Élargit la contrainte de langue (aucune nouvelle colonne, RLS inchangée : managers uniquement).
alter table public.quotes drop constraint if exists quotes_language_check;
alter table public.quotes
  add constraint quotes_language_check
  check (language = any (array['fr', 'en', 'pt', 'es', 'it', 'de', 'ru']));

alter table public.invoices drop constraint if exists invoices_language_check;
alter table public.invoices
  add constraint invoices_language_check
  check (language = any (array['fr', 'en', 'pt', 'es', 'it', 'de', 'ru']));
