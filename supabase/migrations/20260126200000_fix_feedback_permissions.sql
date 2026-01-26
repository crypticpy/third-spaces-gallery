-- Fix permissions on feedback table
-- The RLS policies exist but the table-level GRANTs may be missing

-- Ensure anon and authenticated roles can interact with feedback table
GRANT SELECT, INSERT ON feedback TO anon;
GRANT SELECT, INSERT ON feedback TO authenticated;

-- Ensure the RLS policies are correctly applied (idempotent)
DO $$ BEGIN
  -- Drop and recreate INSERT policy to be safe
  DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedback;
  CREATE POLICY "Anyone can submit feedback" ON feedback
    FOR INSERT WITH CHECK (true);

  -- Drop and recreate SELECT policy to be safe
  DROP POLICY IF EXISTS "Read approved feedback" ON feedback;
  CREATE POLICY "Read approved feedback" ON feedback
    FOR SELECT USING (approved = true);
END $$;
