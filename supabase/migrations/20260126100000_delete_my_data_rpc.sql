-- RPC function for user data deletion (called from transparency page)
-- Uses SECURITY DEFINER to bypass RLS "No deletes" policy on votes

CREATE OR REPLACE FUNCTION delete_my_data(p_device_id TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_count INTEGER := 0;
  v INTEGER;
BEGIN
  -- Delete votes by this device
  DELETE FROM votes WHERE voter_fingerprint = p_device_id;
  GET DIAGNOSTICS v = ROW_COUNT;
  deleted_count := deleted_count + v;

  -- Note: feedback now has device_id (added in migration 20260127000000).
  -- Feedback deletion is handled by the updated RPC in 20260127400000_update_delete_my_data.sql.

  RETURN deleted_count;
END;
$$;

-- Allow anonymous users to call this function
GRANT EXECUTE ON FUNCTION delete_my_data(TEXT) TO anon;
