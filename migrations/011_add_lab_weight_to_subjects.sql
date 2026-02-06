-- Add lab_weight column to subjects table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS lab_weight INTEGER DEFAULT 20;

-- Set lab_weight for existing subjects based on their current static configuration
UPDATE subjects SET lab_weight = 15 WHERE code = 'ITCS223';
UPDATE subjects SET lab_weight = 0 WHERE code = 'ITCS227';  
UPDATE subjects SET lab_weight = 20 WHERE code = 'ITGE162';
UPDATE subjects SET lab_weight = 0 WHERE code = 'ITCS123';
UPDATE subjects SET lab_weight = 20 WHERE code = 'ITDS283';
UPDATE subjects SET lab_weight = 20 WHERE code = 'ITCS251';
UPDATE subjects SET lab_weight = 20 WHERE code = 'ITCS255';

-- Add comment for documentation
COMMENT ON COLUMN subjects.lab_weight IS 'Lab weight percentage for grade calculation (e.g. 20 for 20%)';