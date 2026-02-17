-- Migration: Update use_uniform_lab_score default to TRUE
-- This migration changes the default for new subjects to use uniform /2 scoring
-- and updates all existing subjects to use uniform scoring by default

-- Update existing subjects to use uniform scoring (if not already explicitly set to false)
UPDATE subjects 
SET use_uniform_lab_score = TRUE 
WHERE use_uniform_lab_score IS NULL OR use_uniform_lab_score = FALSE;

-- Change the default value for new subjects
ALTER TABLE subjects 
ALTER COLUMN use_uniform_lab_score SET DEFAULT TRUE;

-- Update comment for documentation
COMMENT ON COLUMN subjects.use_uniform_lab_score IS 'When true (default), all labs use uniform max score of 2; when false, use individual lab total_score values';
