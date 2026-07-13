
-- ROLE HELPER (now that redacteur_chef is committed)
CREATE OR REPLACE FUNCTION public.can_review_content(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'manager'::public.app_role)
      OR public.has_role(_user_id, 'redacteur_chef'::public.app_role);
$$;

-- Drop legacy tables + their private enums
DROP TABLE IF EXISTS public.articles CASCADE;
DROP TABLE IF EXISTS public.content_items CASCADE;
DROP TYPE IF EXISTS public.article_status;
DROP TYPE IF EXISTS public.content_status;
DROP TYPE IF EXISTS public.content_type;

-- New enums
CREATE TYPE public.content_type AS ENUM (
  'blog', 'guide', 'landing', 'seo_hub',
  'instagram_reel', 'instagram_carousel', 'instagram_story',
  'tiktok', 'pinterest', 'newsletter'
);
CREATE TYPE public.content_workflow_status AS ENUM (
  'draft', 'writing', 'to_review', 'changes_requested',
  'approved', 'ready_to_publish', 'scheduled', 'published', 'archived'
);
CREATE TYPE public.channel_kind AS ENUM (
  'blog_github', 'website', 'instagram', 'tiktok', 'pinterest',
  'newsletter', 'whatsapp', 'guide_pdf', 'landing'
);
CREATE TYPE public.publication_status AS ENUM (
  'pending', 'in_progress', 'success', 'failed'
);
CREATE TYPE public.comment_status AS ENUM ('open', 'resolved');
CREATE TYPE public.lead_status AS ENUM (
  'new', 'contacted', 'qualified', 'converted', 'lost', 'spam'
);
CREATE TYPE public.prospect_status AS ENUM (
  'new', 'contacted', 'quoted', 'negotiating', 'won', 'lost'
);

-- ============ AUTHORS ============
CREATE TABLE public.authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  role text,
  language text,
  bio text,
  long_bio text,
  photo_url text,
  location text,
  social jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.authors TO authenticated;
GRANT ALL ON public.authors TO service_role;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authors_read_auth" ON public.authors FOR SELECT TO authenticated USING (true);
CREATE POLICY "authors_write_editors" ON public.authors FOR ALL TO authenticated
  USING (public.can_edit_content(auth.uid())) WITH CHECK (public.can_edit_content(auth.uid()));
CREATE TRIGGER authors_updated_at BEFORE UPDATE ON public.authors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CONTENT CATEGORIES ============
ALTER TABLE public.categories RENAME TO content_categories;
ALTER TABLE public.content_categories
  ADD COLUMN IF NOT EXISTS scope text[] NOT NULL DEFAULT ARRAY['blog']::text[],
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS intro text,
  ADD COLUMN IF NOT EXISTS faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.content_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER content_categories_updated_at BEFORE UPDATE ON public.content_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CONTENTS ============
CREATE TABLE public.contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.content_type NOT NULL,
  status public.content_workflow_status NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  slug text,
  subtitle text,
  excerpt text,
  body_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  body_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  body_markdown text,
  raw_caption text,
  hashtags text[] NOT NULL DEFAULT '{}'::text[],
  category_id uuid REFERENCES public.content_categories(id) ON DELETE SET NULL,
  author_id uuid REFERENCES public.authors(id) ON DELETE SET NULL,
  experience_id uuid REFERENCES public.experiences(id) ON DELETE SET NULL,
  cover_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  og_image_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  parent_content_id uuid REFERENCES public.contents(id) ON DELETE SET NULL,
  seo_title text,
  seo_description text,
  canonical_url text,
  reading_time_min integer,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  language text NOT NULL DEFAULT 'fr',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at timestamptz,
  published_at timestamptz,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, slug)
);
CREATE INDEX contents_type_status_idx ON public.contents (type, status);
CREATE INDEX contents_published_at_idx ON public.contents (published_at DESC NULLS LAST);
CREATE INDEX contents_tags_idx ON public.contents USING GIN (tags);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contents TO authenticated;
GRANT ALL ON public.contents TO service_role;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contents_read_editors" ON public.contents FOR SELECT TO authenticated
  USING (public.can_edit_content(auth.uid()));
CREATE POLICY "contents_insert_writers" ON public.contents FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_content(auth.uid()));
CREATE POLICY "contents_update_writers" ON public.contents FOR UPDATE TO authenticated
  USING (public.can_edit_content(auth.uid())) WITH CHECK (public.can_edit_content(auth.uid()));
CREATE POLICY "contents_delete_reviewers" ON public.contents FOR DELETE TO authenticated
  USING (public.can_review_content(auth.uid()));
CREATE TRIGGER contents_updated_at BEFORE UPDATE ON public.contents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CONTENT MEDIA ============
CREATE TABLE public.content_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'gallery',
  position integer NOT NULL DEFAULT 0,
  caption text,
  alt text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, media_id, role, position)
);
CREATE INDEX content_media_content_idx ON public.content_media (content_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_media TO authenticated;
GRANT ALL ON public.content_media TO service_role;
ALTER TABLE public.content_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_media_rw_editors" ON public.content_media FOR ALL TO authenticated
  USING (public.can_edit_content(auth.uid())) WITH CHECK (public.can_edit_content(auth.uid()));

-- ============ COMMENTS ============
CREATE TABLE public.content_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.content_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  selection jsonb,
  mentions uuid[] NOT NULL DEFAULT '{}'::uuid[],
  status public.comment_status NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_comments_content_idx ON public.content_comments (content_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_comments TO authenticated;
GRANT ALL ON public.content_comments TO service_role;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read_editors" ON public.content_comments FOR SELECT TO authenticated
  USING (public.can_edit_content(auth.uid()));
CREATE POLICY "comments_insert_editors" ON public.content_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_content(auth.uid()) AND auth.uid() = author_id);
CREATE POLICY "comments_update_own_or_reviewer" ON public.content_comments FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.can_review_content(auth.uid()))
  WITH CHECK (auth.uid() = author_id OR public.can_review_content(auth.uid()));
CREATE POLICY "comments_delete_reviewer" ON public.content_comments FOR DELETE TO authenticated
  USING (public.can_review_content(auth.uid()) OR auth.uid() = author_id);
CREATE TRIGGER content_comments_updated_at BEFORE UPDATE ON public.content_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REVISIONS ============
CREATE TABLE public.content_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  editor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status public.content_workflow_status,
  to_status public.content_workflow_status,
  note text,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_revisions_content_idx ON public.content_revisions (content_id, created_at DESC);
GRANT SELECT, INSERT ON public.content_revisions TO authenticated;
GRANT ALL ON public.content_revisions TO service_role;
ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "revisions_read_editors" ON public.content_revisions FOR SELECT TO authenticated
  USING (public.can_edit_content(auth.uid()));
CREATE POLICY "revisions_insert_editors" ON public.content_revisions FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_content(auth.uid()));

-- ============ CHANNELS ============
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.channel_kind NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.channels TO authenticated;
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channels_read_auth" ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "channels_write_admin" ON public.channels FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER channels_updated_at BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PUBLICATIONS ============
CREATE TABLE public.publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE RESTRICT,
  status public.publication_status NOT NULL DEFAULT 'pending',
  external_ref text,
  external_url text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  scheduled_at timestamptz,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX publications_content_idx ON public.publications (content_id, created_at DESC);
CREATE INDEX publications_channel_status_idx ON public.publications (channel_id, status);
GRANT SELECT, INSERT, UPDATE ON public.publications TO authenticated;
GRANT ALL ON public.publications TO service_role;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publications_read_editors" ON public.publications FOR SELECT TO authenticated
  USING (public.can_edit_content(auth.uid()));
CREATE POLICY "publications_write_reviewers" ON public.publications FOR ALL TO authenticated
  USING (public.can_review_content(auth.uid())) WITH CHECK (public.can_review_content(auth.uid()));
CREATE TRIGGER publications_updated_at BEFORE UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROSPECTS ============
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status public.prospect_status NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'jeitinho.fr',
  name text NOT NULL,
  email text,
  phone text,
  travel_start date,
  travel_end date,
  party_size integer,
  activities text[] NOT NULL DEFAULT '{}'::text[],
  message text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prospects_status_idx ON public.prospects (status, created_at DESC);
CREATE INDEX prospects_owner_idx ON public.prospects (owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;
GRANT ALL ON public.prospects TO service_role;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prospects_read_managers" ON public.prospects FOR SELECT TO authenticated USING (public.can_manage(auth.uid()));
CREATE POLICY "prospects_write_managers" ON public.prospects FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE TRIGGER prospects_updated_at BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ LEADS ============
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'jeitinho.fr',
  status public.lead_status NOT NULL DEFAULT 'new',
  name text,
  email text,
  phone text,
  travel_start date,
  travel_end date,
  party_size integer,
  activities text[] NOT NULL DEFAULT '{}'::text[],
  message text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_ref text,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_status_idx ON public.leads (status, received_at DESC);
CREATE INDEX leads_external_ref_idx ON public.leads (external_ref);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_read_managers" ON public.leads FOR SELECT TO authenticated USING (public.can_manage(auth.uid()));
CREATE POLICY "leads_write_managers" ON public.leads FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ QUOTES + LINES ============
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS number text UNIQUE,
  ADD COLUMN IF NOT EXISTS eyebrow text,
  ADD COLUMN IF NOT EXISTS project_label text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS deposit_pct integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS validity_days integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS equipment jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

CREATE TABLE public.quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  icon text,
  label text NOT NULL,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  unit text NOT NULL DEFAULT 'Forfait',
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  currency text NOT NULL DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quote_lines_quote_idx ON public.quote_lines (quote_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_lines TO authenticated;
GRANT ALL ON public.quote_lines TO service_role;
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quote_lines_rw_managers" ON public.quote_lines FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE TRIGGER quote_lines_updated_at BEFORE UPDATE ON public.quote_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.quote_number_sequences (
  year integer PRIMARY KEY,
  next_number integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.quote_number_sequences TO service_role;
ALTER TABLE public.quote_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.next_quote_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y integer := EXTRACT(YEAR FROM now())::int;
  n integer;
BEGIN
  INSERT INTO public.quote_number_sequences (year, next_number)
    VALUES (y, 2)
    ON CONFLICT (year) DO UPDATE
      SET next_number = public.quote_number_sequences.next_number + 1,
          updated_at = now()
    RETURNING next_number - 1 INTO n;
  RETURN y::text || '-' || lpad(n::text, 3, '0');
END $$;
GRANT EXECUTE ON FUNCTION public.next_quote_number() TO authenticated;

-- ============ EXPERIENCES + MEDIA extensions ============
ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS experience_type text,
  ADD COLUMN IF NOT EXISTS level text;

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS orientation text,
  ADD COLUMN IF NOT EXISTS photographer text,
  ADD COLUMN IF NOT EXISTS copyright text,
  ADD COLUMN IF NOT EXISTS drive_url text,
  ADD COLUMN IF NOT EXISTS used_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER media_updated_at BEFORE UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED CHANNELS ============
INSERT INTO public.channels (kind, slug, name, description, config, is_active) VALUES
  ('blog_github', 'blog-jeitinho', 'blog.jeitinho.fr', 'Blog éditorial poussé vers le repo rio-uncovered',
   jsonb_build_object('owner','jeitinho','repo','rio-uncovered','branch','main','path_template','src/content/articles/{slug}.ts'), true),
  ('website', 'jeitinho-fr', 'jeitinho.fr', 'Site principal',
   jsonb_build_object('owner','jeitinho','repo','jeitinho','branch','main'), true),
  ('instagram', 'instagram-jeitinho', '@jeitinho.fr', 'Compte Instagram', '{}'::jsonb, false),
  ('newsletter', 'newsletter-jeitinho', 'Newsletter JEITINHO', 'Envoi via Lovable Emails', '{}'::jsonb, false)
ON CONFLICT (slug) DO NOTHING;
