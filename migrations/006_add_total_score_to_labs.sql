-- Migration: Add total_score column to labs table
-- This column stores the maximum possible score for a lab assignment
-- Used for gradient color display from 0 (red) to max (green)

ALTER TABLE labs 
ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN labs.total_score IS 'Total possible score for the lab, used for gradient scoring display';
