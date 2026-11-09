-- Coût fournisseur par secteur de billet (un billet Setor 1 ne coûte pas
-- comme une frisa) et devise par défaut alignée sur la convention du Hub :
-- les prix des billets sont saisis en euros.
alter table public.ticket_offer_variants add column if not exists supplier_cost numeric;
alter table public.ticket_offer_variants alter column currency set default 'EUR';
comment on column public.ticket_offer_variants.supplier_cost is
  'Coût d''achat d''un billet de ce secteur (même devise que le prix). Vide : coût de l''offre.';
