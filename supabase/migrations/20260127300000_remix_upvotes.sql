-- Remix upvotes table
-- Same dedup pattern as votes and feedback_upvotes

CREATE TABLE IF NOT EXISTS remix_upvotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  remix_id UUID NOT NULL REFERENCES published_remixes(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS remix_upvotes_unique
  ON remix_upvotes (remix_id, voter_fingerprint);

CREATE INDEX IF NOT EXISTS remix_upvotes_remix_idx
  ON remix_upvotes (remix_id);

-- Aggregation view
CREATE OR REPLACE VIEW remix_upvote_counts AS
SELECT remix_id, COUNT(*) as count
FROM remix_upvotes
GROUP BY remix_id;

-- RLS: read + insert only, no updates or deletes
ALTER TABLE remix_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read remix upvotes" ON remix_upvotes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert remix upvotes" ON remix_upvotes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "No updates on remix upvotes" ON remix_upvotes
  FOR UPDATE USING (false);

CREATE POLICY "No deletes on remix upvotes" ON remix_upvotes
  FOR DELETE USING (false);

GRANT SELECT, INSERT ON remix_upvotes TO anon;
GRANT SELECT, INSERT ON remix_upvotes TO authenticated;
