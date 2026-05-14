-- Migration: Pad all lab numbers to 2 digits in lab_feedback table
-- This ensures consistency between stored values and API operations

UPDATE lab_feedback 
SET lab_number = LPAD(CAST(CAST(lab_number AS INTEGER) AS VARCHAR), 2, '0')
WHERE lab_number IS NOT NULL 
  AND lab_number !~ '^\d{2}$'  -- Only update if not already 2 digits
  AND lab_number ~ '^\d+$';    -- Only if it's numeric
