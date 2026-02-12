-- Clean up test/stale votes from deleted submissions and test fingerprints
DELETE FROM votes WHERE submission_id IN ('community-hub', 'access-all', 'third-spaces-explorer', 'vibe-finder')
   OR voter_fingerprint = 'test-cleanup-check-00000';
