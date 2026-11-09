-- Index sur les clés étrangères les plus utilisées (listes, fiches, dispatch).
-- Volumes encore faibles : on prend l'avance avant la haute saison.
create index if not exists crm_tasks_client_id_idx on public.crm_tasks (client_id);
create index if not exists crm_tasks_lead_id_idx on public.crm_tasks (lead_id);
create index if not exists crm_tasks_prospect_id_idx on public.crm_tasks (prospect_id);
create index if not exists crm_tasks_trip_id_idx on public.crm_tasks (trip_id);
create index if not exists leads_prospect_id_idx on public.leads (prospect_id);
create index if not exists ota_bookings_client_id_idx on public.ota_bookings (client_id);
create index if not exists ota_bookings_guide_id_idx on public.ota_bookings (guide_id);
create index if not exists ota_bookings_listing_id_idx on public.ota_bookings (listing_id);
create index if not exists ota_bookings_partner_id_idx on public.ota_bookings (partner_id);
create index if not exists payments_client_id_idx on public.payments (client_id);
create index if not exists payments_quote_id_idx on public.payments (quote_id);
create index if not exists payments_trip_id_idx on public.payments (trip_id);
create index if not exists prospects_client_id_idx on public.prospects (client_id);
create index if not exists quote_lines_quote_id_idx on public.quote_lines (quote_id);
create index if not exists quotes_prospect_id_idx on public.quotes (prospect_id);
create index if not exists site_booking_assignments_assignee_id_idx on public.site_booking_assignments (assignee_id);
create index if not exists trip_activities_assignee_id_idx on public.trip_activities (assignee_id);
create index if not exists trip_activities_experience_id_idx on public.trip_activities (experience_id);
create index if not exists trip_activities_partner_id_idx on public.trip_activities (partner_id);
create index if not exists trip_activities_quote_line_id_idx on public.trip_activities (quote_line_id);
create index if not exists trip_activities_service_id_idx on public.trip_activities (service_id);
create index if not exists trip_travelers_trip_id_idx on public.trip_travelers (trip_id);
create index if not exists trips_quote_id_idx on public.trips (quote_id);
create index if not exists trips_source_prospect_id_idx on public.trips (source_prospect_id);
create index if not exists partner_ledger_entries_guide_id_idx on public.partner_ledger_entries (guide_id);
create index if not exists partner_ledger_entries_apporteur_id_idx on public.partner_ledger_entries (apporteur_id);
