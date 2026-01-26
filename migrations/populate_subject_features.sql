-- Enable grading features for existing subjects
-- Run this SQL in your Vercel Postgres database

-- ITCS123 - Lab/Challenge grading
UPDATE subjects 
SET has_grading_interface = true,
    has_quiz_management = true,
    has_test_cases = true,
    grading_type = 'lab_challenge'
WHERE code = 'ITCS123';

-- ITCS223 - Lab/Challenge grading  
UPDATE subjects
SET has_grading_interface = true,
    has_quiz_management = true,
    has_test_cases = true,
    grading_type = 'lab_challenge'
WHERE code = 'ITCS223';

-- ITCS227 - Simple score
UPDATE subjects
SET has_grading_interface = true,
    has_quiz_management = false,
    has_test_cases = false,
    grading_type = 'simple_score'
WHERE code = 'ITCS227';

-- ITCS251 - Python grading
UPDATE subjects
SET has_grading_interface = true,
    has_quiz_management = true,
    has_test_cases = true,
    grading_type = 'python'
WHERE code = 'ITCS251';

-- ITCS255 - SQL grading
UPDATE subjects
SET has_grading_interface = true,
    has_quiz_management = false,
    has_test_cases = true,
    grading_type = 'sql'
WHERE code = 'ITCS255';

-- ITDS283 - Simple score
UPDATE subjects
SET has_grading_interface = true,
    has_quiz_management = true,
    has_test_cases = false,
    grading_type = 'simple_score'
WHERE code = 'ITDS283';

-- ITGE162 - Simple score
UPDATE subjects
SET has_grading_interface = true,
    has_quiz_management = true,
    has_test_cases = false,
    grading_type = 'simple_score'
WHERE code = 'ITGE162';
