-- Add quiz_section_enabled column to subjects table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS quiz_section_enabled BOOLEAN DEFAULT TRUE;

-- Update comment for documentation
COMMENT ON COLUMN subjects.quiz_section_enabled IS 'Whether the quiz section (Check Your Understanding) is visible on student pages';
