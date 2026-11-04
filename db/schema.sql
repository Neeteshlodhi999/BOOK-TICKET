CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 2049;

CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  ticket_key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL CHECK (length(trim(subject)) > 0),
  requester TEXT NOT NULL CHECK (length(trim(requester)) > 0),
  requester_initials TEXT NOT NULL DEFAULT 'CU',
  requester_color TEXT NOT NULL DEFAULT 'blue',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Pending', 'Closed')),
  priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Urgent', 'High', 'Normal', 'Low')),
  assignee TEXT NOT NULL DEFAULT 'Jordan Lee',
  category TEXT NOT NULL DEFAULT 'account',
  icon TEXT NOT NULL DEFAULT '✉',
  icon_color TEXT NOT NULL DEFAULT 'violet-bg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_updated_at_idx ON tickets (updated_at DESC);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets (status);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  initials TEXT NOT NULL DEFAULT 'JD',
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_comments_ticket_id_idx ON ticket_comments (ticket_id, created_at, id);
