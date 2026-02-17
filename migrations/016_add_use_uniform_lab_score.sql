-- Migration: Add use_uniform_lab_score column to subjects table
-- This column determines whether all labs use a uniform max score of 2
-- When true, all labs are displayed with "/2" regardless of their individual total_score
-- When false (default), each lab uses its own total_score value

ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS use_uniform_lab_score BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN subjects.use_uniform_lab_score IS 'When true, all labs use uniform max score of 2; when false, use individual lab total_score values';
