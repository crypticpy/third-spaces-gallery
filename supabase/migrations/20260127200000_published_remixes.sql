-- Published remixes table
-- Stores user-submitted remixes for moderation and community display

CREATE TABLE IF NOT EXISTS published_remixes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  author_name TEXT DEFAULT 'Anonymous',
  user_note TEXT DEFAULT '',
  features JSONB NOT NULL DEFAULT '[]',
  approved BOOLEAN DEFAULT FALSE,
  github_issue_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS published_remixes_approved_idx
  ON published_remixes (approved);

CREATE INDEX IF NOT EXISTS published_remixes_device_idx
  ON published_remixes (device_id);

-- RLS: only approved remixes are publicly readable
ALTER TABLE published_remixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read approved remixes" ON published_remixes
  FOR SELECT USING (approved = true);

CREATE POLICY "Anyone can insert remixes" ON published_remixes
  FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT ON published_remixes TO anon;
GRANT SELECT, INSERT ON published_remixes TO authenticated;
