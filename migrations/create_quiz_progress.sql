-- Create quiz_progress table for storing student quiz answers
CREATE TABLE IF NOT EXISTS quiz_progress (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  lab_number TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, subject, lab_number)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quiz_progress_lookup 
ON quiz_progress(student_id, subject, lab_number);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quiz_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS quiz_progress_updated_at ON quiz_progress;
CREATE TRIGGER quiz_progress_updated_at
  BEFORE UPDATE ON quiz_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_progress_timestamp();
