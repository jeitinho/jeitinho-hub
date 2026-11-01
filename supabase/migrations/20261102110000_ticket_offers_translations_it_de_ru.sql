-- Billetterie : traductions italien, allemand et russe, sur le modèle des
-- colonnes en/es/pt existantes (titre, lieu, description). Vide = repli sur
-- l'anglais puis le français côté jeitinho.fr. RLS inchangée.
alter table public.ticket_offers
  add column if not exists title_it text,
  add column if not exists title_de text,
  add column if not exists title_ru text,
  add column if not exists description_it text,
  add column if not exists description_de text,
  add column if not exists description_ru text,
  add column if not exists venue_it text,
  add column if not exists venue_de text,
  add column if not exists venue_ru text;
