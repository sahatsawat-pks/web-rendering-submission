-- Add subject-level toggle for student feedback visibility on score page
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS feedback_section_enabled BOOLEAN DEFAULT TRUE;

UPDATE subjects
SET feedback_section_enabled = TRUE
WHERE feedback_section_enabled IS NULL;
