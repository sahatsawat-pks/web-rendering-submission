-- Add challenge_enabled column to labs table
-- This allows each lab to have its own challenge toggle
-- Default is TRUE for subjects with lab_challenge grading type

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labs' AND column_name = 'challenge_enabled') THEN 
        ALTER TABLE labs ADD COLUMN challenge_enabled BOOLEAN DEFAULT TRUE; 
    END IF; 
END $$;

-- Update existing labs to have challenge_enabled = TRUE if they are Lab type in subjects with grading_type = 'lab_challenge'
UPDATE labs 
SET challenge_enabled = TRUE 
WHERE (lab_type = 'Lab' OR lab_type IS NULL)
AND subject IN (SELECT code FROM subjects WHERE grading_type = 'lab_challenge');
