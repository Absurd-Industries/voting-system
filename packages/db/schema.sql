CREATE TABLE IF NOT EXISTS conferences (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  description         TEXT,
  voting_opens_at     INTEGER,
  voting_closes_at    INTEGER,
  voting_force_status TEXT NOT NULL DEFAULT 'scheduled',
  votes_per_voter     INTEGER NOT NULL DEFAULT 0,
  created_at          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS slot_types (
  id               TEXT PRIMARY KEY,
  conference_id    TEXT NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  count            INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS talks (
  id               TEXT PRIMARY KEY,
  conference_id    TEXT NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  duration_minutes INTEGER NOT NULL,
  presenter_name   TEXT NOT NULL,
  presenter_bio    TEXT,
  presenter_email  TEXT,
  created_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS voters (
  id            TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  id        TEXT PRIMARY KEY,
  voter_id  TEXT NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  talk_id   TEXT NOT NULL REFERENCES talks(id) ON DELETE CASCADE,
  cast_at   INTEGER NOT NULL,
  UNIQUE(voter_id, talk_id)
);
