-- Add quiz_scores table for storing student quiz results
CREATE TABLE IF NOT EXISTS quiz_scores (
  id VARCHAR(255) PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  subject VARCHAR(20) NOT NULL,
  lab_number VARCHAR(10) NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  answers JSONB,
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT quiz_scores_score_check CHECK (score >= 0 AND score <= 100)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_scores_student ON quiz_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_subject ON quiz_scores(subject);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_lab ON quiz_scores(subject, lab_number);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_submitted ON quiz_scores(submitted_at DESC);
