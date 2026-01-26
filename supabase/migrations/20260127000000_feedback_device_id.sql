-- Add device_id and github_issue_url columns to feedback table
-- device_id enables data deletion via delete_my_data RPC
-- github_issue_url links to the moderation issue

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS github_issue_url TEXT;
CREATE INDEX IF NOT EXISTS feedback_device_id_idx ON feedback (device_id);
