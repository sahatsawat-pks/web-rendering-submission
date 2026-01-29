-- Quick Win Database Indexes
-- Significantly speeds up subject and lab lookups

CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_subjects_visible ON subjects(is_visible);
CREATE INDEX IF NOT EXISTS idx_labs_subject_number ON labs(subject, lab_number);
CREATE INDEX IF NOT EXISTS idx_credentials_student ON credentials(student_id);

-- Optional but recommended additional indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
