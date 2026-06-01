-- Configurable student ID column for Google Sheet score read/write
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS student_id_column VARCHAR(50);

COMMENT ON COLUMN subjects.student_id_column IS 'Student ID column: letter (A, B), 1-based number, or header name. Empty = auto-detect.';
