-- Update delete_my_data RPC to cover all user data tables
-- Now deletes: votes, feedback, feedback_upvotes, published_remixes, remix_upvotes

CREATE OR REPLACE FUNCTION delete_my_data(p_device_id TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_count INTEGER := 0;
  v INTEGER;
BEGIN
  -- Delete votes
  DELETE FROM votes WHERE voter_fingerprint = p_device_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  deleted_count := deleted_count + v;

  -- Delete feedback submissions
  DELETE FROM feedback WHERE device_id = p_device_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  deleted_count := deleted_count + v;

  -- Delete feedback upvotes
  DELETE FROM feedback_upvotes WHERE voter_fingerprint = p_device_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  deleted_count := deleted_count + v;

  -- Delete published remixes
  DELETE FROM published_remixes WHERE device_id = p_device_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  deleted_count := deleted_count + v;

  -- Delete remix upvotes
  DELETE FROM remix_upvotes WHERE voter_fingerprint = p_device_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  deleted_count := deleted_count + v;

  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_my_data(TEXT) TO anon;
