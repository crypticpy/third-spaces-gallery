-- Tighten published_remixes INSERT policy to prevent clients from setting approved=true
-- Only the moderation GitHub Action (via service role) can approve remixes

DROP POLICY IF EXISTS "Anyone can insert remixes" ON published_remixes;
CREATE POLICY "Anyone can insert remixes" ON published_remixes
  FOR INSERT WITH CHECK (approved = false);
