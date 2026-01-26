-- Remove direct SELECT access to upvote tables to avoid exposing voter_fingerprint
-- Public reads should use the aggregation views (feedback_upvote_counts, remix_upvote_counts)
-- which only expose counts, not individual voter identifiers

-- Remove SELECT policies on raw upvote tables
DROP POLICY IF EXISTS "Anyone can read" ON feedback_upvotes;
DROP POLICY IF EXISTS "Anyone can read remix upvotes" ON remix_upvotes;

-- Revoke SELECT grants on raw tables
REVOKE SELECT ON feedback_upvotes FROM anon;
REVOKE SELECT ON feedback_upvotes FROM authenticated;
REVOKE SELECT ON remix_upvotes FROM anon;
REVOKE SELECT ON remix_upvotes FROM authenticated;

-- Ensure aggregation views are accessible (grants may already exist from 20260127500000)
GRANT SELECT ON feedback_upvote_counts TO anon;
GRANT SELECT ON feedback_upvote_counts TO authenticated;
GRANT SELECT ON remix_upvote_counts TO anon;
GRANT SELECT ON remix_upvote_counts TO authenticated;
