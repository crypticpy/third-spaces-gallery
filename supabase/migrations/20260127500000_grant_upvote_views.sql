-- Grant SELECT on upvote aggregation views to anon and authenticated roles
-- Without these grants, PostgREST (Supabase REST API) cannot serve these views

GRANT SELECT ON feedback_upvote_counts TO anon;
GRANT SELECT ON feedback_upvote_counts TO authenticated;

GRANT SELECT ON remix_upvote_counts TO anon;
GRANT SELECT ON remix_upvote_counts TO authenticated;
