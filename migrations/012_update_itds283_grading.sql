-- Update ITDS283 to use lab_challenge grading since it has hasChallenge: true in static config
UPDATE subjects SET grading_type='lab_challenge' WHERE code='ITDS283';