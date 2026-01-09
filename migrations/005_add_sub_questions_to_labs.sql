-- Add sub_questions column to labs table
ALTER TABLE labs ADD COLUMN IF NOT EXISTS sub_questions TEXT;
