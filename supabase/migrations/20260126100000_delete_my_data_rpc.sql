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

  -- Delete feedback by this device (match on author submissions)
  -- Note: feedback doesn't store device_id directly, so we skip it here.
  -- Users can submit a data concern via the transparency page for full removal.

  RETURN deleted_count;
END;
$$;

-- Allow anonymous users to call this function
GRANT EXECUTE ON FUNCTION delete_my_data(TEXT) TO anon;
