-- Add fields for subject creation options
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS create_score_check_placeholder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS create_lab_runner_placeholder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS course_summary_link TEXT DEFAULT NULL;

-- Update comment for documentation
COMMENT ON COLUMN subjects.create_score_check_placeholder IS 'Whether to create score check page as placeholder for future implementation';
COMMENT ON COLUMN subjects.create_lab_runner_placeholder IS 'Whether to create lab runner page as placeholder for future implementation';
COMMENT ON COLUMN subjects.course_summary_link IS 'Optional link to course summary document';
