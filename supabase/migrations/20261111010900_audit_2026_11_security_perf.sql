-- Audit nov. 2026 — sécurité + performance (aucun changement fonctionnel attendu)

-- 1. Formulaires du site : les INSERT passent par le Worker (service role, Zod).
--    Les politiques d'INSERT anonymes directes ne servent plus qu'aux robots.
drop policy if exists "public_insert_reservations" on public.reservations;
drop policy if exists "anon_insert_nordeste" on public.devis_nordeste;
drop policy if exists "anon_insert_jeitinho" on public.trouver_jeitinho;

-- 2. search_path figé sur les fonctions signalées
alter function public.ig_kind(text, text) set search_path = public, extensions, pg_temp;
alter function public.ig_media_owner_lili() set search_path = public, extensions, pg_temp;
alter function public.ig_words(text) set search_path = public, extensions, pg_temp;
alter function public.slugify(text) set search_path = public, extensions, pg_temp;
alter function public.ticket_sales_default_currency() set search_path = public, extensions, pg_temp;
alter function public.ticketing_eur_brl() set search_path = public, extensions, pg_temp;

-- 3. Vues CM : SECURITY DEFINER volontaire (exposent un sous-ensemble de
--    colonnes aux CM sans leur ouvrir ticket_sales/events). Documenté.
comment on view public.cm_events is 'SECURITY DEFINER volontaire : colonnes non sensibles des événements pour les CM (filtre can_manage/cm_has_pole dans la vue).';
comment on view public.cm_event_sales_daily is 'SECURITY DEFINER volontaire : agrégats de ventes sans données client pour les CM (filtre can_manage/cm_has_pole dans la vue).';
comment on view public.cm_event_tracking is 'SECURITY DEFINER volontaire : performance des liens de tracking pour les CM (filtre can_manage/cm_has_pole dans la vue).';
comment on view public.cm_agent_notes is 'SECURITY DEFINER volontaire : résumés des agents AFRO LOVE pour les CM (filtre can_manage/cm_has_pole dans la vue).';

-- 4. Table de sauvegarde sortie de l'API (données conservées)
create schema if not exists archive;
revoke all on schema archive from anon, authenticated;
alter table if exists public.manual_sections_backup_20260819 set schema archive;

-- 5. Index en double
drop index if exists public.manual_sessions_token_hash_idx;
drop index if exists public.sections_chapter_idx;
drop index if exists public.media_assets_key_unique;
drop index if exists public.media_assets_chapter_idx;
drop index if exists public.idx_bookings_reference;

-- 6. Clés étrangères non indexées
create index if not exists experiences_partner_id_idx on public.experiences (partner_id);
create index if not exists calendar_events_related_trip_id_idx on public.calendar_events (related_trip_id);
create index if not exists content_comments_resolved_by_idx on public.content_comments (resolved_by);
create index if not exists content_revisions_editor_id_idx on public.content_revisions (editor_id);
create index if not exists sales_access_code_id_idx on public.sales (access_code_id);
create index if not exists content_categories_parent_id_idx on public.content_categories (parent_id);
create index if not exists authors_user_id_idx on public.authors (user_id);
create index if not exists contents_category_id_idx on public.contents (category_id);
create index if not exists contents_author_id_idx on public.contents (author_id);
create index if not exists contents_experience_id_idx on public.contents (experience_id);
create index if not exists contents_cover_media_id_idx on public.contents (cover_media_id);
create index if not exists contents_og_image_media_id_idx on public.contents (og_image_media_id);
create index if not exists contents_parent_content_id_idx on public.contents (parent_content_id);
create index if not exists contents_assignee_id_idx on public.contents (assignee_id);
create index if not exists contents_created_by_idx on public.contents (created_by);
create index if not exists content_media_media_id_idx on public.content_media (media_id);
create index if not exists content_comments_content_id_idx on public.content_comments (content_id);
create index if not exists content_comments_parent_id_idx on public.content_comments (parent_id);
create index if not exists content_comments_author_id_idx on public.content_comments (author_id);
create index if not exists publications_content_id_idx on public.publications (content_id);
create index if not exists publications_channel_id_idx on public.publications (channel_id);
create index if not exists publications_published_by_idx on public.publications (published_by);
create index if not exists trip_activities_ticket_offer_id_idx on public.trip_activities (ticket_offer_id);
create index if not exists trip_activities_created_by_idx on public.trip_activities (created_by);
create index if not exists invoices_created_by_idx on public.invoices (created_by);
create index if not exists quote_lines_ticket_offer_variant_id_idx on public.quote_lines (ticket_offer_variant_id);
create index if not exists invoice_lines_ticket_offer_variant_id_idx on public.invoice_lines (ticket_offer_variant_id);
create index if not exists event_partner_sales_partner_id_idx on public.event_partner_sales (partner_id);
create index if not exists ota_listings_experience_id_idx on public.ota_listings (experience_id);
create index if not exists whatsapp_posts_week_id_idx on public.whatsapp_posts (week_id);
create index if not exists whatsapp_posts_section_id_idx on public.whatsapp_posts (section_id);
create index if not exists payments_event_id_idx on public.payments (event_id);
create index if not exists payments_partner_id_idx on public.payments (partner_id);
create index if not exists event_ticket_lots_event_id_idx on public.event_ticket_lots (event_id);
create index if not exists event_promo_codes_partner_id_idx on public.event_promo_codes (partner_id);
create index if not exists ticket_sales_event_id_idx on public.ticket_sales (event_id);
create index if not exists ticket_sync_requests_event_id_idx on public.ticket_sync_requests (event_id);
create index if not exists ig_media_ig_user_id_idx on public.ig_media (ig_user_id);
create index if not exists event_tracking_links_partner_id_idx on public.event_tracking_links (partner_id);
create index if not exists blog_topic_proposals_editorial_item_id_idx on public.blog_topic_proposals (editorial_item_id);
create index if not exists user_poles_pole_idx on public.user_poles (pole);
create index if not exists team_requests_requested_by_idx on public.team_requests (requested_by);
create index if not exists team_requests_pole_idx on public.team_requests (pole);
create index if not exists team_requests_event_id_idx on public.team_requests (event_id);
create index if not exists partner_settings_updated_by_idx on public.partner_settings (updated_by);
create index if not exists partner_ledger_entries_created_by_idx on public.partner_ledger_entries (created_by);
create index if not exists ota_bookings_checked_in_by_idx on public.ota_bookings (checked_in_by);
create index if not exists site_booking_assignments_partner_id_idx on public.site_booking_assignments (partner_id);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index if not exists push_outbox_user_id_idx on public.push_outbox (user_id);

-- 7. RLS : auth.uid()/auth.jwt()/auth.role() évalués une fois par requête
--    au lieu d'une fois par ligne (même logique, réécriture mécanique).
do $$
declare
  r record;
  pat constant text := '(?<!SELECT )auth\.(uid|jwt|role)\(\)';
  rep constant text := '(select auth.\1())';
  stmt text;
begin
  for r in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') || coalesce(with_check, '')) ~ pat
  loop
    stmt := format('alter policy %I on public.%I', r.policyname, r.tablename);
    if r.qual is not null then
      stmt := stmt || ' using (' || regexp_replace(r.qual, pat, rep, 'g') || ')';
    end if;
    if r.with_check is not null then
      stmt := stmt || ' with check (' || regexp_replace(r.with_check, pat, rep, 'g') || ')';
    end if;
    execute stmt;
  end loop;
end
$$;
