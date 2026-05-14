-- Make lab_id nullable in lab_feedback table
-- This allows feedback to be saved without requiring a lab_id
ALTER TABLE lab_feedback 
ALTER COLUMN lab_id DROP NOT NULL;
