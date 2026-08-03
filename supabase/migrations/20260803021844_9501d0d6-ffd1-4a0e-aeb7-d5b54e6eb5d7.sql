-- Champs manquants pour enrichir le PDF de devis au-delà du modèle "Carolina" :
-- description (paragraphe sous le titre), highlights (inclus/exclus) et
-- itinerary (roteiro numéroté). Chaque bloc reste optionnel côté PDF et ne
-- s'affiche que si les données correspondantes sont renseignées.
-- (party_size existe déjà depuis la migration 20260803004947.)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS description text,
  -- { "included": ["Transport privé..."], "excluded": ["Déjeuner", ...] }
  ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '{"included": [], "excluded": []}'::jsonb,
  -- ["Départ de Rio de Janeiro", "Navigation privée...", ...]
  ADD COLUMN IF NOT EXISTS itinerary jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Rappel de forme pour la colonne quotes.equipment (déjà existante, jusqu'ici
-- inutilisée par l'UI) :
-- [{ "label": "Caméra", "items": ["Blackmagic 6K Pro"] }, ...]
