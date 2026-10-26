-- Lot 2 — Planning jour × créneau

alter table public.trip_activities
  add column day date,
  add column slot text check (slot in ('matin','midi','apres_midi','soir','nuit')),
  add column slot_span integer not null default 1,
  add column display_time text,
  add column category text check (category in ('activite','visite','deplacement','soiree')),
  add column is_offered boolean not null default false,
  add column kind text not null default 'activity' check (kind in ('activity','free','note'));

comment on column public.trip_activities.day is 'Jour du planning. NULL = activité « à placer » (pas encore positionnée).';
comment on column public.trip_activities.slot is 'Créneau de départ (matin/midi/après-midi/soir/nuit). NULL si non placée.';
comment on column public.trip_activities.slot_span is 'Nombre de créneaux consécutifs occupés à partir de `slot` (fusion de créneaux, ex. 2 = matin+midi).';
comment on column public.trip_activities.display_time is 'Heure affichée dans le planning (ex. « 10H »), indépendante de scheduled_start.';
comment on column public.trip_activities.kind is 'activity = prestation du catalogue ou texte libre facturable ; free = « Libre » (aucun prix) ; note = texte libre non facturable.';

create index trip_activities_trip_day_idx on public.trip_activities(trip_id, day);
