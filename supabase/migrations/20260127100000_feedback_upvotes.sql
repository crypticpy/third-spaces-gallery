-- Feedback upvotes table
-- Same dedup pattern as votes: unique index on (feedback_id, voter_fingerprint)

CREATE TABLE IF NOT EXISTS feedback_upvotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS feedback_upvotes_unique
  ON feedback_upvotes (feedback_id, voter_fingerprint);

CREATE INDEX IF NOT EXISTS feedback_upvotes_feedback_idx
  ON feedback_upvotes (feedback_id);

-- Aggregation view
CREATE OR REPLACE VIEW feedback_upvote_counts AS
SELECT feedback_id, COUNT(*) as count
FROM feedback_upvotes
GROUP BY feedback_id;

-- RLS: read + insert only, no updates or deletes
ALTER TABLE feedback_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feedback upvotes" ON feedback_upvotes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert feedback upvotes" ON feedback_upvotes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "No updates on feedback upvotes" ON feedback_upvotes
  FOR UPDATE USING (false);

CREATE POLICY "No deletes on feedback upvotes" ON feedback_upvotes
  FOR DELETE USING (false);

GRANT SELECT, INSERT ON feedback_upvotes TO anon;
GRANT SELECT, INSERT ON feedback_upvotes TO authenticated;
