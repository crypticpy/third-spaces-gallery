-- Supabase Setup for Third Spaces Gallery
-- Run this in your Supabase SQL Editor (Database > SQL Editor)

-- 1. Votes table - stores individual votes for real-time counting
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('favorite', 'innovative', 'inclusive')),
  voter_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate votes
CREATE UNIQUE INDEX IF NOT EXISTS votes_unique_vote
ON votes (submission_id, category, voter_fingerprint);

-- 2. Feedback table - stores moderated comments
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id TEXT NOT NULL,
  author_name TEXT DEFAULT 'Anonymous',
  feedback_text TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vote counts view - aggregates votes for quick retrieval
CREATE OR REPLACE VIEW vote_counts AS
SELECT
  submission_id,
  category,
  COUNT(*) as count
FROM votes
GROUP BY submission_id, category;

-- 4. Enable Row Level Security
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for votes
-- Anyone can read votes (for counting)
CREATE POLICY "Anyone can read votes" ON votes
  FOR SELECT USING (true);

-- Anyone can insert votes (anonymous voting)
CREATE POLICY "Anyone can insert votes" ON votes
  FOR INSERT WITH CHECK (true);

-- No one can update or delete votes from client
CREATE POLICY "No updates on votes" ON votes
  FOR UPDATE USING (false);

CREATE POLICY "No deletes on votes" ON votes
  FOR DELETE USING (false);

-- 6. RLS Policies for feedback
-- Only approved feedback is publicly readable
CREATE POLICY "Read approved feedback" ON feedback
  FOR SELECT USING (approved = true);

-- Anyone can submit feedback
CREATE POLICY "Anyone can submit feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- 7. Enable realtime for votes table
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- 8. Create index for faster queries
CREATE INDEX IF NOT EXISTS votes_submission_idx ON votes (submission_id);
CREATE INDEX IF NOT EXISTS feedback_submission_idx ON feedback (submission_id);
CREATE INDEX IF NOT EXISTS feedback_approved_idx ON feedback (approved);
