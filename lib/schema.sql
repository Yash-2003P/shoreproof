CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('collector','reviewer','both')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cleanups (
  id TEXT PRIMARY KEY,
  external_id TEXT UNIQUE,
  public_slug TEXT NOT NULL UNIQUE,
  site TEXT NOT NULL,
  date TEXT NOT NULL,
  lead_id TEXT NOT NULL REFERENCES users(id),
  conditions TEXT,
  public_note TEXT,
  consent_attested_by TEXT NOT NULL REFERENCES users(id),
  consent_attested_at TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  public_enabled INTEGER NOT NULL DEFAULT 0 CHECK (public_enabled IN (0,1)),
  public_published_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pairs (
  id TEXT PRIMARY KEY,
  cleanup_id TEXT NOT NULL REFERENCES cleanups(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  comparability TEXT CHECK (comparability IN ('comparable','partial','not_comparable')),
  comparability_reason TEXT,
  comparability_by TEXT REFERENCES users(id),
  comparability_at TEXT,
  framing_score INTEGER,
  framing_detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('before','after')),
  stored_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  original_sha256 TEXT NOT NULL,
  dhash TEXT NOT NULL,
  blur_score REAL NOT NULL,
  exposure_clipped REAL NOT NULL,
  near_duplicate_of TEXT REFERENCES photos(id),
  near_duplicate_distance INTEGER,
  people_visible INTEGER NOT NULL DEFAULT 0 CHECK (people_visible IN (0,1)),
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  superseded_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS one_current_photo_per_side
  ON photos(pair_id, side) WHERE superseded_at IS NULL;

CREATE TABLE IF NOT EXISTS model_runs (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  model_sha256 TEXT NOT NULL,
  runtime_ms INTEGER NOT NULL,
  box_count INTEGER NOT NULL,
  input_width INTEGER NOT NULL,
  input_height INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
  x REAL NOT NULL,
  y REAL NOT NULL,
  w REAL NOT NULL,
  h REAL NOT NULL,
  coco_id INTEGER NOT NULL,
  coco_class TEXT NOT NULL,
  confidence REAL NOT NULL,
  icc_category TEXT,
  mapping_uncertain INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','rejected')),
  edited INTEGER NOT NULL DEFAULT 0,
  reject_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  photo_id TEXT NOT NULL REFERENCES photos(id),
  suggestion_id TEXT REFERENCES suggestions(id),
  x REAL,
  y REAL,
  w REAL,
  h REAL,
  text TEXT NOT NULL DEFAULT '',
  category TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','confirmed','rejected','insufficient','superseded')),
  revision INTEGER NOT NULL DEFAULT 1,
  supersedes_id TEXT REFERENCES claims(id),
  collector_id TEXT NOT NULL REFERENCES users(id),
  decided_by TEXT REFERENCES users(id),
  decided_at TEXT,
  decision_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  cleanup_id TEXT NOT NULL REFERENCES cleanups(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TRIGGER IF NOT EXISTS events_no_update
BEFORE UPDATE ON events
BEGIN
  SELECT RAISE(ABORT, 'events are append-only');
END;

CREATE TRIGGER IF NOT EXISTS events_no_delete
BEFORE DELETE ON events
BEGIN
  SELECT RAISE(ABORT, 'events are append-only');
END;

CREATE TABLE IF NOT EXISTS exports (
  id TEXT PRIMARY KEY,
  cleanup_id TEXT NOT NULL REFERENCES cleanups(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('html','json')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  cleanup_id TEXT NOT NULL REFERENCES cleanups(id) ON DELETE CASCADE,
  manifest_sha256 TEXT NOT NULL UNIQUE,
  pair_count INTEGER NOT NULL,
  photo_count INTEGER NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pairs_cleanup ON pairs(cleanup_id);
CREATE INDEX IF NOT EXISTS idx_photos_pair ON photos(pair_id);
CREATE INDEX IF NOT EXISTS idx_claims_pair_status ON claims(pair_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_decided ON claims(decided_by, decided_at);
CREATE INDEX IF NOT EXISTS idx_events_cleanup ON events(cleanup_id, created_at);
CREATE INDEX IF NOT EXISTS idx_suggestions_photo ON suggestions(photo_id);
CREATE INDEX IF NOT EXISTS idx_cleanups_external ON cleanups(external_id);
CREATE INDEX IF NOT EXISTS idx_imports_cleanup ON import_batches(cleanup_id);
