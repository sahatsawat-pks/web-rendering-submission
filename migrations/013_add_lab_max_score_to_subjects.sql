-- Add lab_max_score column to subjects table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS lab_max_score INTEGER DEFAULT NULL;

-- Set lab_max_score for existing subjects based on their current static configuration
UPDATE subjects SET lab_max_score = 22 WHERE code = 'ITCS223';
UPDATE subjects SET lab_max_score = NULL WHERE code = 'ITCS227';  
UPDATE subjects SET lab_max_score = NULL WHERE code = 'ITGE162';
UPDATE subjects SET lab_max_score = NULL WHERE code = 'ITCS123';
UPDATE subjects SET lab_max_score = NULL WHERE code = 'ITDS283';
UPDATE subjects SET lab_max_score = NULL WHERE code = 'ITCS251';
UPDATE subjects SET lab_max_score = NULL WHERE code = 'ITCS255';

-- Add comment for documentation
COMMENT ON COLUMN subjects.lab_max_score IS 'Maximum possible lab score for grade calculation (NULL = auto-calculate)';