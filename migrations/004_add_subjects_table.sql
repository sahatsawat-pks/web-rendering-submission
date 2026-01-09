-- Create subjects table for managing subject visibility
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(100),
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert existing subjects
INSERT INTO subjects (code, title, description, icon, color, is_visible, display_order) VALUES
('ITCS223', 'Introduction to Web Development', 'Full-stack web submission rendering & testing.', 'Code2', 'from-teal-500 to-cyan-500', true, 1),
('ITCS227', 'Introduction to Data Science', 'Lab score tracking and grading system.', 'BarChart3', 'from-indigo-500 to-violet-500', true, 2),
('ITGE162', 'Physical Science and Computation', 'Lab score tracking and grading system.', 'Layers', 'from-emerald-500 to-green-500', true, 3),
('ITCS123', 'Object Oriented Programming', 'Java JUnit test runner and code validator.', 'Terminal', 'from-orange-500 to-amber-500', true, 4),
('ITDS283', 'Mobile Application Development', 'Mobile app project submissions and testing.', 'Smartphone', 'from-rose-500 to-red-500', true, 5),
('ITCS251', 'Python Programming', 'Python code execution and test validation.', 'Code', 'from-blue-500 to-sky-500', true, 6),
('ITCS255', 'Database Systems', 'SQL query execution and validation.', 'Database', 'from-purple-500 to-pink-500', true, 7)
ON CONFLICT (code) DO NOTHING;
