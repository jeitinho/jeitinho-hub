PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scope TEXT NOT NULL DEFAULT '["blog"]',
  title TEXT,
  intro TEXT,
  faq TEXT NOT NULL DEFAULT '[]',
  parent_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES content_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  category TEXT,
  location TEXT,
  notes TEXT,
  website TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  kind TEXT NOT NULL DEFAULT 'photo',
  alt TEXT,
  caption TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  orientation TEXT,
  photographer TEXT,
  copyright TEXT,
  drive_url TEXT,
  used_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  price_from REAL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  duration TEXT,
  location TEXT,
  partner_id TEXT,
  cover_image_url TEXT,
  gallery TEXT NOT NULL DEFAULT '[]',
  videos TEXT NOT NULL DEFAULT '[]',
  tags TEXT NOT NULL DEFAULT '[]',
  seo_title TEXT,
  seo_description TEXT,
  is_published INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  city TEXT,
  neighborhood TEXT,
  experience_type TEXT,
  level TEXT,
  category TEXT,
  price_model TEXT NOT NULL DEFAULT 'fixed',
  supplier_net REAL,
  supplier_cost REAL,
  fixed_cost REAL NOT NULL DEFAULT 0,
  commission_pct REAL NOT NULL DEFAULT 0,
  commission_basis TEXT NOT NULL DEFAULT 'sale_price',
  requires_driver INTEGER NOT NULL DEFAULT 0,
  is_excursion INTEGER NOT NULL DEFAULT 0,
  max_group_size INTEGER,
  min_age INTEGER,
  inclusions TEXT NOT NULL DEFAULT '[]',
  exclusions TEXT NOT NULL DEFAULT '[]',
  conditions TEXT NOT NULL DEFAULT '[]',
  faq TEXT NOT NULL DEFAULT '[]',
  factory_status TEXT NOT NULL DEFAULT 'to_review',
  factory_data TEXT NOT NULL DEFAULT '{}',
  source_slug TEXT
);
CREATE INDEX IF NOT EXISTS idx_experiences_slug ON experiences(slug);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'lead',
  stage TEXT NOT NULL DEFAULT 'nouveau',
  source TEXT,
  notes TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  assigned_to TEXT,
  last_contact_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS authors (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT,
  language TEXT,
  bio TEXT,
  long_bio TEXT,
  photo_url TEXT,
  location TEXT,
  social TEXT NOT NULL DEFAULT '{}',
  user_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  slug TEXT,
  subtitle TEXT,
  excerpt TEXT,
  body_json TEXT NOT NULL DEFAULT '{}',
  body_sections TEXT NOT NULL DEFAULT '[]',
  body_markdown TEXT,
  raw_caption TEXT,
  hashtags TEXT NOT NULL DEFAULT '[]',
  category_id TEXT,
  author_id TEXT,
  experience_id TEXT,
  cover_media_id TEXT,
  og_image_media_id TEXT,
  parent_content_id TEXT,
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,
  reading_time_min INTEGER,
  tags TEXT NOT NULL DEFAULT '[]',
  language TEXT NOT NULL DEFAULT 'fr',
  metadata TEXT NOT NULL DEFAULT '{}',
  scheduled_at TEXT,
  published_at TEXT,
  assignee_id TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(type, slug),
  FOREIGN KEY (category_id) REFERENCES content_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL,
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE SET NULL,
  FOREIGN KEY (cover_media_id) REFERENCES media(id) ON DELETE SET NULL,
  FOREIGN KEY (og_image_media_id) REFERENCES media(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_content_id) REFERENCES contents(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_contents_type_status ON contents(type, status);
CREATE INDEX IF NOT EXISTS idx_contents_updated ON contents(updated_at DESC);

CREATE TABLE IF NOT EXISTS content_media (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'gallery',
  position INTEGER NOT NULL DEFAULT 0,
  caption TEXT,
  alt TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_media_content ON content_media(content_id, position);

CREATE TABLE IF NOT EXISTS content_comments (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  parent_id TEXT,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  selection TEXT,
  mentions TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TEXT,
  resolved_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_revisions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  editor_id TEXT,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  snapshot TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_content_revisions_content ON content_revisions(content_id, created_at DESC);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  config TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS publications (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_ref TEXT,
  external_url TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  error TEXT,
  scheduled_at TEXT,
  published_at TEXT,
  published_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prospects (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'jeitinho.fr',
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  travel_start TEXT,
  travel_end TEXT,
  party_size INTEGER,
  activities TEXT NOT NULL DEFAULT '[]',
  message TEXT,
  owner_id TEXT,
  client_id TEXT,
  notes TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  score INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'COLD',
  estimated_value REAL,
  pipeline_stage TEXT NOT NULL DEFAULT 'nouveau',
  next_action TEXT,
  next_action_at TEXT,
  last_contact_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status, created_at DESC);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'jeitinho.fr',
  status TEXT NOT NULL DEFAULT 'new',
  name TEXT,
  email TEXT,
  phone TEXT,
  travel_start TEXT,
  travel_end TEXT,
  party_size INTEGER,
  activities TEXT NOT NULL DEFAULT '[]',
  message TEXT,
  raw_payload TEXT NOT NULL DEFAULT '{}',
  external_ref TEXT,
  prospect_id TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  request_type TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'COLD',
  score_breakdown TEXT NOT NULL DEFAULT '{}',
  estimated_value REAL,
  pipeline_stage TEXT NOT NULL DEFAULT 'nouveau',
  next_action TEXT,
  next_action_at TEXT,
  last_contact_at TEXT,
  assigned_to TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, received_at DESC);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  client_id TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'EUR',
  total_amount REAL NOT NULL DEFAULT 0,
  items TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  valid_until TEXT,
  sent_at TEXT,
  accepted_at TEXT,
  paid_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  number TEXT UNIQUE,
  eyebrow TEXT,
  project_label TEXT,
  location TEXT,
  period_start TEXT,
  period_end TEXT,
  deposit_pct INTEGER NOT NULL DEFAULT 30,
  validity_days INTEGER NOT NULL DEFAULT 2,
  equipment TEXT NOT NULL DEFAULT '{}',
  prospect_id TEXT,
  party_size INTEGER,
  description TEXT,
  highlights TEXT NOT NULL DEFAULT '{"excluded":[],"included":[]}',
  itinerary TEXT NOT NULL DEFAULT '[]',
  next_action TEXT,
  next_action_at TEXT,
  last_contact_at TEXT,
  followup_paused INTEGER NOT NULL DEFAULT 0,
  followup_stage INTEGER NOT NULL DEFAULT 0,
  followup_anchor_at TEXT
);

CREATE TABLE IF NOT EXISTS quote_lines (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  label TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '[]',
  unit TEXT NOT NULL DEFAULT 'Forfait',
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  experience_id TEXT,
  service_id TEXT,
  ticket_offer_id TEXT,
  partner_id TEXT,
  supplier_cost REAL NOT NULL DEFAULT 0,
  commission_amount REAL NOT NULL DEFAULT 0,
  margin_amount REAL NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote ON quote_lines(quote_id, position);

CREATE TABLE IF NOT EXISTS quote_number_sequences (
  year INTEGER PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS roles (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS staff_directory (
  id TEXT PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'relance_devis',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'a_valider',
  stage INTEGER,
  title TEXT NOT NULL,
  message_draft TEXT,
  due_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lead_id TEXT,
  prospect_id TEXT,
  quote_id TEXT,
  client_id TEXT,
  created_by TEXT,
  handled_by TEXT,
  handled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  group_slug TEXT,
  description TEXT,
  price_from REAL,
  price_label TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  bookable INTEGER NOT NULL DEFAULT 0,
  requires_driver INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  category TEXT,
  partner_id TEXT,
  price_model TEXT NOT NULL DEFAULT 'fixed',
  supplier_net REAL,
  supplier_cost REAL,
  fixed_cost REAL,
  commission_pct REAL NOT NULL DEFAULT 0,
  commission_basis TEXT NOT NULL DEFAULT 'sale_price'
);

CREATE TABLE IF NOT EXISTS ticket_offers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT,
  event_date TEXT,
  event_time TEXT,
  venue TEXT,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  public_price REAL,
  supplier_net REAL,
  fixed_cost REAL NOT NULL DEFAULT 0,
  commission_pct REAL NOT NULL DEFAULT 0,
  commission_basis TEXT NOT NULL DEFAULT 'sale_price',
  pricing_model TEXT NOT NULL DEFAULT 'markup',
  is_published INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  supplier_cost REAL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS partner_offerings (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL,
  experience_id TEXT,
  service_id TEXT,
  ticket_offer_id TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  supplier_net REAL,
  fixed_cost REAL NOT NULL DEFAULT 0,
  commission_pct REAL NOT NULL DEFAULT 0,
  commission_basis TEXT NOT NULL DEFAULT 'sale_price',
  pricing_model TEXT NOT NULL DEFAULT 'net_plus_margin',
  valid_from TEXT,
  valid_until TEXT,
  availability_notes TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active INTEGER NOT NULL DEFAULT 1,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  client_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date TEXT,
  end_date TEXT,
  itinerary TEXT NOT NULL DEFAULT '[]',
  hotels TEXT NOT NULL DEFAULT '[]',
  transport TEXT NOT NULL DEFAULT '[]',
  payments TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  guide_id TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  quote_id TEXT,
  source_prospect_id TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  quoted_amount REAL NOT NULL DEFAULT 0,
  supplier_cost REAL NOT NULL DEFAULT 0,
  margin_amount REAL NOT NULL DEFAULT 0,
  notes_internal TEXT,
  party_size INTEGER,
  source TEXT NOT NULL DEFAULT 'manual',
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'meeting',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  all_day INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  related_trip_id TEXT,
  related_content_id TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  quote_id TEXT,
  trip_id TEXT,
  kind TEXT NOT NULL DEFAULT 'deposit',
  status TEXT NOT NULL DEFAULT 'pending',
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  due_at TEXT,
  paid_at TEXT,
  provider TEXT,
  external_reference TEXT,
  notes TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trip_travelers (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'traveler',
  phone TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email TEXT
);

CREATE TABLE IF NOT EXISTS trip_activities (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  quote_line_id TEXT,
  experience_id TEXT,
  service_id TEXT,
  ticket_offer_id TEXT,
  partner_id TEXT,
  replaced_activity_id TEXT,
  title TEXT NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'experience',
  status TEXT NOT NULL DEFAULT 'to_plan',
  scheduled_start TEXT,
  scheduled_end TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  sale_price REAL NOT NULL DEFAULT 0,
  supplier_cost REAL NOT NULL DEFAULT 0,
  commission_amount REAL NOT NULL DEFAULT 0,
  margin_amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  partner_reference TEXT,
  client_informed_at TEXT,
  completed_at TEXT,
  notes TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS factory_outputs (
  id TEXT PRIMARY KEY,
  experience_id TEXT,
  service_id TEXT,
  ticket_offer_id TEXT,
  output_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  content TEXT NOT NULL DEFAULT '{}',
  source_snapshot TEXT NOT NULL DEFAULT '{}',
  approved_at TEXT,
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS acquisition_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  prospect_id TEXT,
  client_id TEXT,
  event_name TEXT NOT NULL,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  content TEXT,
  term TEXT,
  landing_path TEXT,
  referrer TEXT,
  value REAL,
  currency TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS trip_number_sequences (
  year INTEGER PRIMARY KEY,
  next_number INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task TEXT NOT NULL,
  autonomy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  input_summary TEXT,
  output_summary TEXT,
  confidence REAL,
  approval_required INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  target_type TEXT,
  target_id TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS agent_actions (
  id TEXT PRIMARY KEY,
  agent_run_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  risk TEXT NOT NULL DEFAULT 'low',
  approval_required INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  input TEXT,
  output TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  executed_at TEXT
);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  intro TEXT,
  cover_media TEXT,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  chapter_slug TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  kicker TEXT,
  position INTEGER NOT NULL,
  blocks TEXT NOT NULL,
  search_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  alt TEXT,
  caption TEXT,
  source TEXT,
  chapter_slug TEXT,
  position INTEGER,
  crop TEXT,
  mobile_crop TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS access_codes (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  label TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  last_access_at TEXT,
  access_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS manual_sessions (
  id TEXT PRIMARY KEY,
  code_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_chapter TEXT,
  last_section TEXT
);
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  payload TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO roles(code,label,description,sort_order) VALUES
  ('admin','Administrateur','Accès complet à tous les modules',10),
  ('manager','Manager','Accès complet opérationnel',20),
  ('redacteur_chef','Rédacteur en chef','Validation et publication éditoriale',30),
  ('redacteur','Rédacteur','Rédaction et édition de contenu',40),
  ('auteur','Auteur','Rédige ses propres contenus assignés',50),
  ('guide','Guide','Lecture des missions assignées',60),
  ('prestataire','Prestataire','Lecture des missions assignées',70);

CREATE INDEX IF NOT EXISTS idx_contents_type_status_updated ON contents(type,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_created ON trips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_starts ON calendar_events(starts_at);
