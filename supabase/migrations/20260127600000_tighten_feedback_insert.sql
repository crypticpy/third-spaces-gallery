-- Tighten feedback INSERT policy to prevent clients from setting approved=true
-- This ensures all feedback goes through the moderation pipeline

DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedback;
CREATE POLICY "Anyone can submit feedback" ON feedback
  FOR INSERT WITH CHECK (approved = false);
