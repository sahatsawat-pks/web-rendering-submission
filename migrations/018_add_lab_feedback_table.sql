-- Add lab feedback table for student comments and admin feedback
CREATE TABLE IF NOT EXISTS lab_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id UUID,
    lab_number TEXT NOT NULL,
    subject TEXT NOT NULL,
    student_id TEXT NOT NULL,
    admin_comment TEXT,
    is_visible_to_student BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    UNIQUE(lab_number, subject, student_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lab_feedback_student ON lab_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_lab_feedback_subject ON lab_feedback(subject);
CREATE INDEX IF NOT EXISTS idx_lab_feedback_lab ON lab_feedback(lab_number, subject);
