-- Add index on is_read column for dashboard queries
-- This optimizes unread count queries

CREATE INDEX IF NOT EXISTS idx_submissions_is_read ON submissions(is_read);
CREATE INDEX IF NOT EXISTS idx_submissions_form_is_read ON submissions(form_id, is_read);
