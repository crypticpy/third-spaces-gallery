-- Secure the delete_my_data SECURITY DEFINER function:
-- 1. Set explicit search_path to prevent object-hijacking
-- 2. Revoke default EXECUTE and grant only to intended roles

CREATE OR REPLACE FUNCTION delete_my_data(p_device_id TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE deleted_count INTEGER := 0; v INTEGER;
BEGIN
  DELETE FROM votes WHERE voter_fingerprint = p_device_id;
  GET DIAGNOSTICS v = ROW_COUNT; deleted_count := deleted_count + v;
  DELETE FROM feedback WHERE device_id = p_device_id;
  GET DIAGNOSTICS v = ROW_COUNT; deleted_count := deleted_count + v;
  DELETE FROM feedback_upvotes WHERE voter_fingerprint = p_device_id;
  GET DIAGNOSTICS v = ROW_COUNT; deleted_count := deleted_count + v;
  DELETE FROM published_remixes WHERE device_id = p_device_id;
  GET DIAGNOSTICS v = ROW_COUNT; deleted_count := deleted_count + v;
  DELETE FROM remix_upvotes WHERE voter_fingerprint = p_device_id;
  GET DIAGNOSTICS v = ROW_COUNT; deleted_count := deleted_count + v;
  RETURN deleted_count;
END; $$;

-- Revoke default EXECUTE from PUBLIC, grant only to anon and authenticated
REVOKE EXECUTE ON FUNCTION delete_my_data(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_my_data(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION delete_my_data(TEXT) TO authenticated;
