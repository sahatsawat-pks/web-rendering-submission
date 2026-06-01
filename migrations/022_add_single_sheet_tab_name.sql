-- Add singleSheetTabName column to subjects table for custom sheet tab names on single-sheet subjects
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS single_sheet_tab_name VARCHAR(255);

-- Add comment for clarity
COMMENT ON COLUMN subjects.single_sheet_tab_name IS 'Custom sheet tab name for single-sheet subjects (overrides default subject code)';
