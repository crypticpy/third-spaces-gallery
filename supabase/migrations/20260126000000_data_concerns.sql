-- Data Concerns table for transparency page submissions
-- These are submitted via the Edge Function and create GitHub Issues

CREATE TABLE IF NOT EXISTS data_concerns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  concern_type TEXT NOT NULL CHECK (concern_type IN ('delete_data', 'data_inquiry', 'privacy_concern', 'other')),
  details TEXT NOT NULL,
  email TEXT,
  device_id TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  github_issue_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE data_concerns ENABLE ROW LEVEL SECURITY;

-- Anon users cannot directly read or write this table.
-- All access goes through the Edge Function using the service role key.
-- This prevents users from reading other people's concerns.
CREATE POLICY "No direct access for anon" ON data_concerns
  FOR ALL USING (false);

-- Index for rate-limit queries (device_id + created_at)
CREATE INDEX IF NOT EXISTS data_concerns_device_rate_idx
  ON data_concerns (device_id, created_at DESC);

-- Index for admin status filtering
CREATE INDEX IF NOT EXISTS data_concerns_status_idx
  ON data_concerns (status);
