import { Pool } from 'pg';
import { hashPassword } from "./password";

// Database Interface Definitions
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'LA' | 'Lecturer';
  createdAt: string;
}

export interface Lab {
  id: string;
  labNumber: string;
  title: string;
  fileName: string;
  subject: string;
  isActive: boolean;
  deadline?: string;
  testCases?: string; // JSON string
  subQuestions?: string; // JSON string
  labType?: 'Lab' | 'Challenge'; // Type of lab
  totalScore?: number; // Total possible score for gradient display
  databaseStarter?: string; // SQL to initialize database for this lab (ITCS255)
  quizQuestions?: string; // JSON string for quiz questions
  quizCategories?: string; // JSON string for quiz categories
  quizEnabled?: boolean; // Whether quiz is enabled for this lab
  quizTimeLimit?: number; // Time limit in minutes (0 = no limit)
  quizTimeLimitEnabled?: boolean; // Whether time limit is enabled
  challengeEnabled?: boolean; // Whether challenge is enabled for this lab (for lab_challenge grading type)
  createdAt: string;
}

export interface UserPermission {
  id: string;
  userId: string;
  subjectCode: string;
  canEdit: boolean;
  grantedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: number;
  code: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  isVisible: boolean;
  displayOrder: number;
  createScoreCheckPlaceholder?: boolean;
  createLabRunnerPlaceholder?: boolean;
  courseSummaryLink?: string;
  quizSectionEnabled?: boolean;
  feedbackSectionEnabled?: boolean;
  hasGradingInterface: boolean;
  hasQuizManagement: boolean;
  hasTestCases: boolean;
  gradingType: 'lab_challenge' | 'simple_score' | 'sql' | 'python' | 'java' | 'criteria' | 'multi_question' | string | null;
  googleSheetId?: string;
  headerRow?: number;
  columnPattern?: string;
  dataSourceType?: string;
  sheetTabs?: string;
  singleSheetTabName?: string; // Custom tab name for single-sheet subjects
  studentIdColumn?: string; // Column letter, 1-based index, or header name for student IDs
  labWeight?: number;
  labMaxScore?: number;
  useUniformLabScore?: boolean;
  rubricLevels?: any[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  subject: string;
  title: string;
  message: string;
  createdBy: string;
  createdAt: string;
  isVisible: boolean;
}

export interface LabFeedback {
  id: string;
  labId?: string;
  labNumber: string;
  subject: string;
  studentId: string;
  adminComment?: string;
  isVisibleToStudent: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Singleton Pool
let pool: Pool;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing in environment variables");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Neon typically requires this
      },
      // Better configuration for Vercel serverless
      max: 5, // Reduced pool size for serverless
      connectionTimeoutMillis: 10000, // 10 seconds
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      allowExitOnIdle: true // Allow process to exit when all connections are idle
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

// Helper function to execute database operations with retry logic
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.error(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
}

// Initializer to create tables if they don't exist
// In a real prod app, use migrations (Prisma, Drizzle, etc.)
// For this scale, ensureTables is fine.
async function ensureTables() {
    const client = await getPool().connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'LA',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS labs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                lab_number TEXT NOT NULL,
                title TEXT NOT NULL,
                file_name TEXT NOT NULL,
                subject TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                deadline TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_permissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT NOT NULL,
                subject_code TEXT NOT NULL,
                can_edit BOOLEAN DEFAULT FALSE,
                granted_by TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Add test_cases column if not exists (Migration-like)
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labs' AND column_name = 'test_cases') THEN 
                    ALTER TABLE labs ADD COLUMN test_cases TEXT; 
                END IF; 
            END $$;
        `);
        
        // Add lab_type column if not exists
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labs' AND column_name = 'lab_type') THEN 
                    ALTER TABLE labs ADD COLUMN lab_type TEXT DEFAULT 'Lab'; 
                END IF; 
            END $$;
        `);
        
        // Add challenge_enabled column if not exists
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labs' AND column_name = 'challenge_enabled') THEN 
                    ALTER TABLE labs ADD COLUMN challenge_enabled BOOLEAN DEFAULT TRUE; 
                END IF; 
            END $$;
        `);
        
        // Add role column to users table if not exists
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN 
                    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'LA'; 
                END IF; 
            END $$;
        `);
        
        // Set kanzaki_aito as Lecturer if exists
        await client.query(`
            UPDATE users SET role = 'Lecturer' WHERE username = 'kanzaki_aito' AND role != 'Lecturer';
        `);
        
        // Add quiz columns to labs table
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labs' AND column_name = 'quiz_questions') THEN 
                    ALTER TABLE labs ADD COLUMN quiz_questions TEXT; 
                END IF; 
            END $$;
        `);
        
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labs' AND column_name = 'quiz_categories') THEN 
                    ALTER TABLE labs ADD COLUMN quiz_categories TEXT; 
                END IF; 
            END $$;
        `);
        
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labs' AND column_name = 'quiz_enabled') THEN 
                    ALTER TABLE labs ADD COLUMN quiz_enabled BOOLEAN DEFAULT FALSE; 
                END IF; 
            END $$;
        `);
        
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labs' AND column_name = 'quiz_time_limit') THEN 
                    ALTER TABLE labs ADD COLUMN quiz_time_limit INTEGER DEFAULT 0; 
                END IF; 
            END $$;
        `);
        
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'labs' AND column_name = 'quiz_time_limit_enabled') THEN 
                    ALTER TABLE labs ADD COLUMN quiz_time_limit_enabled BOOLEAN DEFAULT FALSE; 
                END IF; 
            END $$;
        `);

        // Add quiz_section_enabled to subjects table
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'quiz_section_enabled') THEN 
                    ALTER TABLE subjects ADD COLUMN quiz_section_enabled BOOLEAN DEFAULT TRUE; 
                END IF; 
            END $$;
        `);

        // Add feedback_section_enabled to subjects table
        await client.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'feedback_section_enabled') THEN
              ALTER TABLE subjects ADD COLUMN feedback_section_enabled BOOLEAN DEFAULT TRUE;
            END IF;
          END $$;
        `);
        
        // Ensure all existing subjects have quiz_section_enabled set to TRUE (if NULL)
        await client.query(`
            UPDATE subjects 
            SET quiz_section_enabled = TRUE 
            WHERE quiz_section_enabled IS NULL;
        `);

        await client.query(`
          UPDATE subjects
          SET feedback_section_enabled = TRUE
          WHERE feedback_section_enabled IS NULL;
        `);

        // Add dynamic routing configuration columns
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'has_grading_interface') THEN 
                    ALTER TABLE subjects ADD COLUMN has_grading_interface BOOLEAN DEFAULT false; 
                END IF; 
            END $$;
        `);
        
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'has_quiz_management') THEN 
                    ALTER TABLE subjects ADD COLUMN has_quiz_management BOOLEAN DEFAULT false; 
                END IF; 
            END $$;
        `);
        
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'has_test_cases') THEN 
                    ALTER TABLE subjects ADD COLUMN has_test_cases BOOLEAN DEFAULT false; 
                END IF; 
            END $$;
        `);
        
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'grading_type') THEN 
                    ALTER TABLE subjects ADD COLUMN grading_type VARCHAR(50); 
                END IF; 
            END $$;
        `);

        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'google_sheet_id') THEN 
                    ALTER TABLE subjects ADD COLUMN google_sheet_id TEXT; 
                END IF; 
            END $$;
        `);

        // Add advanced config columns
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'header_row') THEN 
                    ALTER TABLE subjects ADD COLUMN header_row INTEGER DEFAULT 1; 
                END IF; 
            END $$;
        `);

        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'column_pattern') THEN 
                    ALTER TABLE subjects ADD COLUMN column_pattern TEXT; 
                END IF; 
            END $$;
        `);

        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'data_source_type') THEN 
                    ALTER TABLE subjects ADD COLUMN data_source_type VARCHAR(50) DEFAULT 'single_sheet'; 
                END IF; 
            END $$;
        `);

        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'sheet_tabs') THEN 
                    ALTER TABLE subjects ADD COLUMN sheet_tabs TEXT; 
                END IF; 
            END $$;
        `);

        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'single_sheet_tab_name') THEN 
                    ALTER TABLE subjects ADD COLUMN single_sheet_tab_name VARCHAR(255); 
                END IF; 
            END $$;
        `);

        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'student_id_column') THEN 
                    ALTER TABLE subjects ADD COLUMN student_id_column VARCHAR(50); 
                END IF; 
            END $$;
        `);

        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'rubric_levels') THEN 
                    ALTER TABLE subjects ADD COLUMN rubric_levels TEXT; 
                END IF; 
            END $$;
        `);

        // Create subjects table
        await client.query(`
            CREATE TABLE IF NOT EXISTS subjects (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                icon VARCHAR(50),
                color VARCHAR(100),
                is_visible BOOLEAN DEFAULT true,
                display_order INTEGER DEFAULT 0,
                rubric_levels TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Create credentials table
        await client.query(`
            CREATE TABLE IF NOT EXISTS credentials (\
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(50) NOT NULL UNIQUE,
                credential VARCHAR(10) NOT NULL,
                subject VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Migrate existing credentials: Drop old constraint and make student_id unique
        await client.query(`
            DO $$ 
            BEGIN 
                -- Drop old constraint if it exists
                IF EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'credentials_student_id_subject_key'
                ) THEN 
                    ALTER TABLE credentials DROP CONSTRAINT credentials_student_id_subject_key;
                END IF;
                
                -- Add unique constraint on student_id if not exists
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'credentials_student_id_key'
                ) THEN 
                    -- First, remove duplicate entries keeping the most recent
                    DELETE FROM credentials a USING credentials b 
                    WHERE a.id < b.id AND a.student_id = b.student_id;
                    
                    -- Add the new constraint
                    ALTER TABLE credentials ADD CONSTRAINT credentials_student_id_key UNIQUE (student_id);
                END IF;
            END $$;
        `);
        
        // Create ITCS113 students table
        await client.query(`
            CREATE TABLE IF NOT EXISTS itcs113_students (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                surname VARCHAR(100) NOT NULL,
                section VARCHAR(20) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Insert ITCS113 students if table is empty
        const itcs113Count = await client.query('SELECT COUNT(*) FROM itcs113_students');
        if (parseInt(itcs113Count.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO itcs113_students (student_id, name, surname) VALUES
                ('6888011', 'Kotchapond', 'Chaingka'),
                ('6888022', 'Phunyisa', 'Dechtarathorn'),
                ('6888026', 'Jolinda', 'Fangfuengfu'),
                ('6888035', 'Kitchanan', 'Kaewma'),
                ('6888038', 'Samuch', 'Keadkaew'),
                ('6888062', 'Pudit', 'Ninparkobkul'),
                ('6888064', 'Koranit', 'Nisub'),
                ('6888066', 'Nontawat', 'Nontree'),
                ('6888067', 'Sasinan', 'Nontree'),
                ('6888073', 'Pensurat', 'Panryheng'),
                ('6888074', 'Pornrawin', 'Pantharuksakul'),
                ('6888086', 'Kamonchanok', 'Rub'),
                ('6888092', 'Theppachai', 'Sakulruangrak'),
                ('6888094', 'Paphawin', 'Sanitwong na ayutthaya'),
                ('6888095', 'Manita', 'Sanyangyuen'),
                ('6888096', 'Thanathat', 'Satianpanich'),
                ('6888110', 'Wongsathorn', 'Sukkhaphoksakul'),
                ('6888115', 'Sirikorn', 'Tachakumput'),
                ('6888119', 'Chayada', 'Thepmongkol'),
                ('6888122', 'Sirawit', 'Tongrod'),
                ('6888127', 'Chang', 'Gao'),
                ('6888128', 'Ruoyi', 'Niu'),
                ('6888129', 'Shuhan', 'Mei'),
                ('6888139', 'Nateenon', 'Satsanathai'),
                ('6888144', 'Lerot', 'Apilertthanapong'),
                ('6888153', 'Wanrutch', 'Kittisagsereekul'),
                ('6888154', 'Phatsawich', 'Klinprachum'),
                ('6888159', 'Varattaya', 'Nakanupap'),
                ('6888164', 'Siravit', 'Phanpairoj'),
                ('6888165', 'Chanapa', 'Piriyatanalag'),
                ('6888167', 'Kamjira', 'Prayai'),
                ('6888170', 'Thitikon', 'Sansom'),
                ('6888171', 'Virada', 'Saithong'),
                ('6888172', 'Thatchakron', 'Sompong'),
                ('6888182', 'Piyawan', 'Thanakularporn'),
                ('6888184', 'Nisha', 'Tiyawattanaroj'),
                ('6888189', 'Thanakrit', 'Horjun'),
                ('6888193', 'Keyue', 'Zhao'),
                ('6888195', 'Pabhikul', 'Thaiwattananon'),
                ('6888196', 'Chakatorn', 'Into'),
                ('6888197', 'Chanyanan', 'Jatuteerapat'),
                ('6888198', 'Kittakorn', 'Kaewloi'),
                ('6888202', 'Wachirawit', 'Sukwattanawinakul')
            `);
        }
        
        // Seed subjects if table is empty
        const subjectsCount = await client.query('SELECT COUNT(*) FROM subjects');
        if (parseInt(subjectsCount.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO subjects (code, title, description, icon, color, is_visible, display_order) VALUES
                ('ITCS223', 'Introduction to Web Development', 'Full-stack web submission rendering & testing.', 'Code2', 'from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400', true, 1),
                ('ITCS227', 'Introduction to Data Science', 'Lab score tracking and grading system.', 'BarChart3', 'from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400', true, 2),
                ('ITGE162', 'Physical Science and Computation', 'Lab score tracking and grading system.', 'Layers', 'from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400', true, 3),
                ('ITCS123', 'Object Oriented Programming', 'Java JUnit test runner and code validator.', 'Terminal', 'from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400', true, 4),
                ('ITDS283', 'Mobile Application Development', 'Mobile app project submissions and testing.', 'Smartphone', 'from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400', true, 5),
                ('ITCS251', 'Programming in Python', 'Python code execution and test validation.', 'Code', 'from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400', true, 6),
                ('ITCS255', 'Structured Query Language Essentials', 'SQL query execution and validation.', 'Database', 'from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400', true, 7);
            `);
            // console.log('✅ Seeded subjects table');
        }

        // Seed labs if table is empty
        const labsCount = await client.query('SELECT COUNT(*) FROM labs');
        if (parseInt(labsCount.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO labs (lab_number, title, file_name, subject, is_active, lab_type) VALUES
                -- ITCS123 (Java OOP) - Labs and Challenges
                ('1', 'Introduction to Java', 'index.html', 'ITCS123', true, 'Lab'),
                ('1', 'Introduction to Java', 'index.html', 'ITCS123', true, 'Challenge'),
                ('2', 'Classes and Objects', 'index.html', 'ITCS123', true, 'Lab'),
                ('2', 'Classes and Objects', 'index.html', 'ITCS123', true, 'Challenge'),
                ('3', 'Inheritance and Polymorphism', 'index.html', 'ITCS123', true, 'Lab'),
                ('3', 'Inheritance and Polymorphism', 'index.html', 'ITCS123', true, 'Challenge'),
                
                -- ITCS223 (Web Development)
                ('1', 'HTML Basics', 'index.html', 'ITCS223', true, 'Lab'),
                ('2', 'CSS Styling', 'index.html', 'ITCS223', true, 'Lab'),
                ('3', 'JavaScript Fundamentals', 'index.html', 'ITCS223', true, 'Lab'),
                ('4', 'DOM Manipulation', 'index.html', 'ITCS223', true, 'Lab'),
                ('5', 'Forms and Validation', 'index.html', 'ITCS223', true, 'Lab'),
                
                -- ITCS251 (Python)
                ('1', 'Python Basics', 'main.py', 'ITCS251', true, 'Lab'),
                ('2', 'Control Flow', 'main.py', 'ITCS251', true, 'Lab'),
                ('3', 'Functions and Modules', 'main.py', 'ITCS251', true, 'Lab'),
                ('4', 'Data Structures', 'main.py', 'ITCS251', true, 'Lab'),
                ('5', 'File I/O', 'main.py', 'ITCS251', true, 'Lab'),
                
                -- ITCS255 (SQL)
                ('1', 'Basic SELECT Queries', 'queries.sql', 'ITCS255', true, 'Lab'),
                ('2', 'Filtering with WHERE', 'queries.sql', 'ITCS255', true, 'Lab'),
                ('3', 'Joins and Relationships', 'queries.sql', 'ITCS255', true, 'Lab'),
                ('4', 'Aggregation Functions', 'queries.sql', 'ITCS255', true, 'Lab'),
                ('5', 'Subqueries', 'queries.sql', 'ITCS255', true, 'Lab'),
                
                -- ITCS227 (Data Science)
                ('1', 'Introduction to Data Analysis', 'notebook.ipynb', 'ITCS227', true, 'Lab'),
                ('2', 'Data Visualization', 'notebook.ipynb', 'ITCS227', true, 'Lab'),
                ('3', 'Statistical Analysis', 'notebook.ipynb', 'ITCS227', true, 'Lab'),
                ('4', 'Machine Learning Basics', 'notebook.ipynb', 'ITCS227', true, 'Lab'),
                
                -- ITDS283 (Mobile Development)
                ('1', 'Introduction to Mobile UI', 'MainActivity.java', 'ITDS283', true, 'Lab'),
                ('2', 'User Input and Events', 'MainActivity.java', 'ITDS283', true, 'Lab'),
                ('3', 'Data Persistence', 'MainActivity.java', 'ITDS283', true, 'Lab'),
                ('4', 'API Integration', 'MainActivity.java', 'ITDS283', true, 'Lab'),
                
                -- ITGE162 (Physical Science)
                ('1', 'Scientific Computing Basics', 'index.html', 'ITGE162', true, 'Lab'),
                ('2', 'Physics Simulations', 'index.html', 'ITGE162', true, 'Lab'),
                ('3', 'Data Analysis in Science', 'index.html', 'ITGE162', true, 'Lab');
            `);
            // console.log('✅ Seeded labs table with sample data');
        }

        // Create quiz_progress table for storing student quiz answers
        await client.query(`
            CREATE TABLE IF NOT EXISTS quiz_progress (
                id SERIAL PRIMARY KEY,
                student_id TEXT NOT NULL,
                subject TEXT NOT NULL,
                lab_number TEXT NOT NULL,
                answers JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(student_id, subject, lab_number)
            );
        `);

        // --- MIGRATION: Backfill legacy subject configuration ---
        // Ensuring these subjects work with the new dynamic routing directly
        // console.log('🔄 Running legacy subject migration...');
        
        await client.query(`
            UPDATE subjects SET has_grading_interface=true, grading_type='lab_challenge', has_quiz_management=true, has_test_cases=true WHERE code='ITCS123' AND grading_type IS NULL;
            UPDATE subjects SET has_grading_interface=true, grading_type='lab_challenge', has_quiz_management=true, has_test_cases=true WHERE code='ITCS223' AND grading_type IS NULL;
            UPDATE subjects SET has_grading_interface=true, grading_type='python', has_quiz_management=true, has_test_cases=true WHERE code='ITCS251' AND grading_type IS NULL;
            UPDATE subjects SET has_grading_interface=true, grading_type='sql', has_quiz_management=true, has_test_cases=true WHERE code='ITCS255' AND grading_type IS NULL;
            UPDATE subjects SET has_grading_interface=true, grading_type='simple_score', has_quiz_management=true, has_test_cases=false WHERE code='ITCS227' AND grading_type IS NULL;
            UPDATE subjects SET has_grading_interface=true, grading_type='simple_score', has_quiz_management=true, has_test_cases=false WHERE code='ITDS283' AND grading_type IS NULL;
            UPDATE subjects SET has_grading_interface=true, grading_type='simple_score', has_quiz_management=true, has_test_cases=false WHERE code='ITGE162' AND grading_type IS NULL;
            
            -- Force enable features for Python/SQL subjects (Fixes missing Test Case / Quiz pages)
            UPDATE subjects SET has_test_cases=true, has_quiz_management=true WHERE code='ITCS251';
            UPDATE subjects SET has_test_cases=true, has_quiz_management=true WHERE code='ITCS255';
        `);
        // console.log('✅ Legacy subjects migrated to dynamic routing');

        // --- MIGRATION: Backfill Google Sheet IDs ---
        // console.log('🔄 Running Google Sheets ID backfill...');
        await client.query(`
            UPDATE subjects SET google_sheet_id='1b3BdHlzBc5jVcaaldRkdUVLAVicTG5hqKDYEModLraA' WHERE code='ITGE162' AND google_sheet_id IS NULL;
            UPDATE subjects SET google_sheet_id='1LnPggDqEnvGZ7LSEhZZf0TSE8bnbX_3zuoZFeIpJD_g' WHERE code='ITCS227' AND google_sheet_id IS NULL;
            UPDATE subjects SET google_sheet_id='1ZH6-_4we-PCHstk719MZr2Vo0NAOe5wGokq-IBHIx2U' WHERE code='ITCS123' AND google_sheet_id IS NULL;
            UPDATE subjects SET google_sheet_id='1tXj1QnbQFR3RQUWdzimR0vfWVtu-aUyeCbnAgv3RAbE' WHERE code='ITCS223' AND google_sheet_id IS NULL;
            UPDATE subjects SET google_sheet_id='1ZHm5UnRK80aDLsACU5vOe68vLWcK6eeI3TB1vf2fkhI' WHERE code='ITDS283' AND google_sheet_id IS NULL;
            UPDATE subjects SET google_sheet_id='1x29jzhrMCzr7MazNWoLZ2XSn77hk33bu5ltuGmLSVtE' WHERE code='ITCS251' AND google_sheet_id IS NULL;
            UPDATE subjects SET google_sheet_id='154LairckAZ5jF33dZ4cRAuP54cbv_42Inv-gZTNxSro' WHERE code='ITCS255' AND google_sheet_id IS NULL;
        `);
        // console.log('✅ Google Sheets IDs backfilled');

        // --- MIGRATION: Contrast Fix (Adaptive Dark/Light) ---
        // Ensure all subjects use 600 weight for light mode (contrast against white)
        // and 400 weight for dark mode (contrast against slate-900)
        // console.log('🔄 Running Color Contrast Fix (Adaptive)...');
        await client.query(`
            -- ITCS123 (Orange/Amber)
            UPDATE subjects SET color = 'from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400' 
            WHERE code = 'ITCS123';

            -- ITCS251 (Blue/Sky)
            UPDATE subjects SET color = 'from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400' 
            WHERE code = 'ITCS251';

            -- ITCS223 (Teal/Cyan)
            UPDATE subjects SET color = 'from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400' 
            WHERE code = 'ITCS223';

            -- ITCS227 (Indigo/Violet)
            UPDATE subjects SET color = 'from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400' 
            WHERE code = 'ITCS227';

            -- ITGE162 (Emerald/Green)
            UPDATE subjects SET color = 'from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400' 
            WHERE code = 'ITGE162';

            -- ITDS283 (Rose/Red)
            UPDATE subjects SET color = 'from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400' 
            WHERE code = 'ITDS283';

            -- ITCS255 (Purple/Pink)
            UPDATE subjects SET color = 'from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400' 
            WHERE code = 'ITCS255';
        `);
        // console.log('✅ Color contrast improved with adaptive dark mode support');

        // Index for faster lookups
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_quiz_progress_lookup 
            ON quiz_progress(student_id, subject, lab_number);
        `);

        // console.log('✅ Ensured quiz_progress table exists');

        // Create announcements table
        await client.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                subject TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                created_by TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                is_visible BOOLEAN DEFAULT TRUE
            );
        `);

        // Add is_visible column if it doesn't exist (migration for existing tables)
        await client.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'announcements' AND column_name = 'is_visible'
                ) THEN
                    ALTER TABLE announcements ADD COLUMN is_visible BOOLEAN DEFAULT TRUE;
                END IF;
            END $$;
        `);

        // Index for faster announcement lookups by subject
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_announcements_subject 
            ON announcements(subject);
        `);

        // console.log('✅ Ensured announcements table exists');

        // Create lab_feedback table for storing admin comments on student labs
        await client.query(`
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
        `);

        // Create indexes for faster feedback lookups
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_lab_feedback_student 
            ON lab_feedback(student_id);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_lab_feedback_subject 
            ON lab_feedback(subject);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_lab_feedback_lab 
            ON lab_feedback(lab_number, subject);
        `);

        // Seed initial admin if needed
        const targetUsername = "kanzaki_aito";
        const res = await client.query('SELECT * FROM users WHERE username = $1', [targetUsername]);
        if (res.rowCount === 0) {
            const hashed = await hashPassword("aito1472*");
            await client.query(`
                INSERT INTO users (username, password)
                VALUES ($1, $2)
            `, [targetUsername, hashed]);
            // console.log(`✅ Created seed user: ${targetUsername}`);
        }

    } catch (err) {
        console.error("Failed to ensure tables:", err);
    } finally {
        client.release();
    }
}

// Run initialization once (lazy or explicit)
// We'll call this inside our accessor methods to ensure DB is ready, or rely on calling it once.
// For simplicity, let's call it on first pool access logic or just rely on manual invocation if we had a start script.
// To satisfy "async getDb()" signature from legacy code, we can alias permission check here.
// Run initialization once (lazy or explicit)
// We'll call this inside our accessor methods to ensure DB is ready, or rely on calling it once.
// For simplicity, let's call it on first pool access logic or just rely on manual invocation if we had a start script.
// To satisfy "async getDb()" signature from legacy code, we can alias permission check here.
let initialized = false;
async function init() {
    if (!initialized) {
        await ensureTables();
        initialized = true;
    }
}

// -- USER OPERATIONS --

export async function findUserByUsername(username: string): Promise<User | undefined> {
    await init();
    const client = await getPool().connect();
    try {
        const res = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        if (res.rowCount === 0) return undefined;
        const r = res.rows[0];
        return {
            id: r.id,
            username: r.username,
            password: r.password,
            role: r.role || 'LA',
            createdAt: r.created_at.toString()
        };
    } finally {
        client.release();
    }
}

export async function createUser(username: string, password: string, role: 'LA' | 'Lecturer' = 'LA'): Promise<User> {
    await init();
    const client = await getPool().connect();
    try {
        const hashed = await hashPassword(password);
        const res = await client.query(`
            INSERT INTO users (username, password, role)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [username, hashed, role]);
        const r = res.rows[0];
        return {
            id: r.id,
            username: r.username,
            password: r.password,
            role: r.role || 'LA',
            createdAt: r.created_at.toString()
        };
    } finally {
        client.release();
    }
}

export async function getAllUsers(): Promise<User[]> {
    await init();
    return withRetry(async () => {
        const client = await getPool().connect();
        try {
            const res = await client.query('SELECT * FROM users ORDER BY created_at DESC');
            return res.rows.map(r => ({
                id: r.id,
                username: r.username,
                password: r.password,
                role: r.role || 'LA',
                createdAt: r.created_at.toString()
            }));
        } finally {
            client.release();
        }
    });
}

export async function deleteUser(id: string): Promise<boolean> {
    await init();
    const client = await getPool().connect();
    try {
        const res = await client.query('DELETE FROM users WHERE id = $1', [id]);
        return (res.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

export async function updateUserRole(id: string, role: 'LA' | 'Lecturer'): Promise<boolean> {
    await init();
    const client = await getPool().connect();
    try {
        const res = await client.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
        return (res.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

export async function updateUserPassword(id: string, password: string): Promise<boolean> {
    await init();
    const client = await getPool().connect();
    try {
        const hashedPassword = await hashPassword(password);
        const res = await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, id]);
        return (res.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

export async function updateUsername(currentUsername: string, newUsername: string): Promise<boolean> {
    await init();
    const client = await getPool().connect();
    try {
        // Check if new username already exists
        const existing = await client.query('SELECT id FROM users WHERE username = $1', [newUsername]);
        if (existing.rowCount && existing.rowCount > 0) {
            throw new Error('Username already exists');
        }
        
        const res = await client.query('UPDATE users SET username = $1 WHERE username = $2', [newUsername, currentUsername]);
        return (res.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

export async function updateUsernameById(userId: string, newUsername: string): Promise<boolean> {
    await init();
    const client = await getPool().connect();
    try {
        const res = await client.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, userId]);
        return (res.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

// -- LAB OPERATIONS --

export async function getAllLabs(activeOnly: boolean = false, subject?: string): Promise<Lab[]> {
    await init();
    const client = await getPool().connect();
    try {
        let query = 'SELECT * FROM labs WHERE 1=1';
        const params: any[] = [];
        
        if (activeOnly) {
            query += ` AND is_active = $${params.length + 1}`;
            params.push(true);
        }
        
        if (subject) {
            query += ` AND subject = $${params.length + 1}`;
            params.push(subject);
        }
        
        query += ' ORDER BY lab_number ASC';

        const res = await client.query(query, params);
        return res.rows.map(r => ({
            id: r.id,
            labNumber: r.lab_number,
            title: r.title,
            fileName: r.file_name,
            subject: r.subject,
            isActive: r.is_active,
            deadline: r.deadline,
            testCases: r.test_cases,
            subQuestions: r.sub_questions,
            labType: r.lab_type || 'Lab',
            totalScore: r.total_score,
            databaseStarter: r.database_starter,
            quizQuestions: r.quiz_questions,
            quizCategories: r.quiz_categories,
            quizEnabled: r.quiz_enabled,
            quizTimeLimit: r.quiz_time_limit,
            quizTimeLimitEnabled: r.quiz_time_limit_enabled,
            challengeEnabled: r.challenge_enabled,
            createdAt: r.created_at.toString()
        }));
    } finally {
        client.release();
    }
}

export async function getLabById(id: string): Promise<Lab | undefined> {
  await init();
  const client = await getPool().connect();
  try {
      const res = await client.query('SELECT * FROM labs WHERE id = $1', [id]);
      if (res.rowCount === 0) return undefined;
      const r = res.rows[0];
      return {
            id: r.id,
            labNumber: r.lab_number,
            title: r.title,
            fileName: r.file_name,
            subject: r.subject,
            isActive: r.is_active,
            deadline: r.deadline,
            testCases: r.test_cases,
            subQuestions: r.sub_questions,
            labType: r.lab_type || 'Lab',
            totalScore: r.total_score,
            databaseStarter: r.database_starter,
            quizQuestions: r.quiz_questions,
            quizCategories: r.quiz_categories,
            quizEnabled: r.quiz_enabled,
            quizTimeLimit: r.quiz_time_limit,
            quizTimeLimitEnabled: r.quiz_time_limit_enabled,
            challengeEnabled: r.challenge_enabled,
            createdAt: r.created_at.toString()
      };
  } finally {
      client.release();
  }
}

export async function getLabByNumber(
  labNumber: string,
  subject?: string,
  labType: 'Lab' | 'Challenge' = 'Lab'
): Promise<Lab | undefined> {
    await init();
    const client = await getPool().connect();
    try {
        let query = 'SELECT * FROM labs WHERE lab_number = $1';
        const params: any[] = [labNumber];
        let idx = 2;
        
        if (subject) {
            query += ` AND subject = $${idx++}`;
            // Convert to uppercase for case-insensitive matching (DB stores uppercase)
            params.push(subject.toUpperCase());
        }
        
        if (labType) {
            query += ` AND (lab_type = $${idx} OR ($${idx} = 'Lab' AND lab_type IS NULL))`;
            params.push(labType);
            idx++;
        }
        
        query += ' LIMIT 1';
        const res = await client.query(query, params);
        if (res.rowCount === 0) return undefined;
        const r = res.rows[0];
        return {
              id: r.id,
              labNumber: r.lab_number,
              title: r.title,
              fileName: r.file_name,
              subject: r.subject,
              isActive: r.is_active,
              deadline: r.deadline,
              testCases: r.test_cases,
              subQuestions: r.sub_questions,
              labType: r.lab_type || 'Lab',
              totalScore: r.total_score,
              databaseStarter: r.database_starter,
              quizQuestions: r.quiz_questions,
              quizCategories: r.quiz_categories,
              quizEnabled: r.quiz_enabled,
              quizTimeLimit: r.quiz_time_limit,
              quizTimeLimitEnabled: r.quiz_time_limit_enabled,
              challengeEnabled: r.challenge_enabled,
              createdAt: r.created_at.toString()
        };
    } finally {
        client.release();
    }
}

export async function createLab(
  labNumber: string,
  title: string,
  fileName: string = "index.html",
  subject: string = "ITGE162",
  isActive: boolean = true,
  deadline?: string,
  testCases?: string,
  labType: 'Lab' | 'Challenge' = 'Lab',
  subQuestions?: string,
  challengeEnabled?: boolean
): Promise<Lab> {
    await init();
    const client = await getPool().connect();
    try {
        const res = await client.query(`
            INSERT INTO labs (lab_number, title, file_name, subject, is_active, deadline, test_cases, lab_type, sub_questions, challenge_enabled)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [labNumber, title, fileName, subject, isActive, deadline || null, testCases || null, labType, subQuestions || null, challengeEnabled !== undefined ? challengeEnabled : true]);
        
        const r = res.rows[0];
        return {
            id: r.id,
            labNumber: r.lab_number,
            title: r.title,
            fileName: r.file_name,
            subject: r.subject,
            isActive: r.is_active,
            deadline: r.deadline,
            testCases: r.test_cases,
            subQuestions: r.sub_questions,
            labType: r.lab_type || 'Lab',
            totalScore: r.total_score,
            databaseStarter: r.database_starter,
            challengeEnabled: r.challenge_enabled,
            createdAt: r.created_at.toString()
        };
    } finally {
        client.release();
    }
}

export async function updateLab(
  id: string,
  updates: Partial<Omit<Lab, "id" | "createdAt">>
): Promise<Lab | null> {
    await init();
    const client = await getPool().connect();
    try {
        // Construct dynamic update
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (updates.labNumber !== undefined) { fields.push(`lab_number = $${idx++}`); values.push(updates.labNumber); }
        if (updates.title !== undefined) { fields.push(`title = $${idx++}`); values.push(updates.title); }
        if (updates.fileName !== undefined) { fields.push(`file_name = $${idx++}`); values.push(updates.fileName); }
        if (updates.subject !== undefined) { fields.push(`subject = $${idx++}`); values.push(updates.subject); }
        if (updates.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(updates.isActive); }
        if (updates.deadline !== undefined) { fields.push(`deadline = $${idx++}`); values.push(updates.deadline); }
        if (updates.testCases !== undefined) { fields.push(`test_cases = $${idx++}`); values.push(updates.testCases); }
        if (updates.subQuestions !== undefined) { fields.push(`sub_questions = $${idx++}`); values.push(updates.subQuestions); }
        if (updates.labType !== undefined) { fields.push(`lab_type = $${idx++}`); values.push(updates.labType); }
        if (updates.totalScore !== undefined) { fields.push(`total_score = $${idx++}`); values.push(updates.totalScore); }
        if (updates.databaseStarter !== undefined) { fields.push(`database_starter = $${idx++}`); values.push(updates.databaseStarter); }
        if (updates.quizQuestions !== undefined) { fields.push(`quiz_questions = $${idx++}`); values.push(updates.quizQuestions); }
        if (updates.quizCategories !== undefined) { fields.push(`quiz_categories = $${idx++}`); values.push(updates.quizCategories); }
        if (updates.quizEnabled !== undefined) { fields.push(`quiz_enabled = $${idx++}`); values.push(updates.quizEnabled); }
        if (updates.quizTimeLimit !== undefined) { fields.push(`quiz_time_limit = $${idx++}`); values.push(updates.quizTimeLimit); }
        if (updates.quizTimeLimitEnabled !== undefined) { fields.push(`quiz_time_limit_enabled = $${idx++}`); values.push(updates.quizTimeLimitEnabled); }
        if (updates.challengeEnabled !== undefined) { fields.push(`challenge_enabled = $${idx++}`); values.push(updates.challengeEnabled); }

        if (fields.length === 0) return getLabById(id).then(l => l || null); // No updates

        values.push(id);
        const res = await client.query(`
            UPDATE labs SET ${fields.join(', ')}
            WHERE id = $${idx}
            RETURNING *
        `, values);

        if (res.rowCount === 0) return null;
        const r = res.rows[0];
        return {
            id: r.id,
            labNumber: r.lab_number,
            title: r.title,
            fileName: r.file_name,
            subject: r.subject,
            isActive: r.is_active,
            deadline: r.deadline,
            testCases: r.test_cases,
            subQuestions: r.sub_questions,
            labType: r.lab_type || 'Lab',
            totalScore: r.total_score,
            databaseStarter: r.database_starter,
            quizQuestions: r.quiz_questions,
            quizCategories: r.quiz_categories,
            quizEnabled: r.quiz_enabled,
            quizTimeLimit: r.quiz_time_limit,
            quizTimeLimitEnabled: r.quiz_time_limit_enabled,
            challengeEnabled: r.challenge_enabled,
            createdAt: r.created_at.toString()
        };
    } finally {
        client.release();
    }
}

export async function deleteLab(id: string): Promise<boolean> {
    await init();
    const client = await getPool().connect();
    try {
        const res = await client.query('DELETE FROM labs WHERE id = $1', [id]);
        return (res.rowCount || 0) > 0;
    } finally {
        client.release();
    }
}

// -- PERMISSIONS (Legacy Mock support -> Tables) --

// To maintain compatibility with existing code that might call getDb().data.userPermissions
// we might need to Mock it or refactor the caller. 
// I recall `src/app/api/admin/permissions/route.ts` uses `getDb().data.userPermissions`.
// I MUST refactor that route to use SQL as well, or expose a helper here.

export async function getAllPermissions() {
    await init();
    const client = await getPool().connect();
    try {
        const res = await client.query('SELECT * FROM user_permissions');
         return res.rows.map(r => ({
            id: r.id,
            userId: r.user_id,
            subjectCode: r.subject_code,
            canEdit: r.can_edit,
            grantedBy: r.granted_by,
            createdAt: r.created_at.toString(),
            updatedAt: r.updated_at.toString()
        }));
    } finally {
        client.release();
    }
}

export async function getUserPermissions(userId: string) {
     await init();
    const client = await getPool().connect();
    try {
        const res = await client.query('SELECT * FROM user_permissions WHERE user_id = $1', [userId]);
        return res.rows.map(r => ({
            id: r.id,
            userId: r.user_id,
            subjectCode: r.subject_code,
            canEdit: r.can_edit,
            grantedBy: r.granted_by,
            createdAt: r.created_at.toString(),
            updatedAt: r.updated_at.toString()
        }));
    } finally {
        client.release();
    }
}

export async function upsertPermission(userId: string, subjectCode: string, canEdit: boolean, grantedBy: string) {
    await init();
    const client = await getPool().connect();
    try {
        // Check exist
        const check = await client.query(
            'SELECT id FROM user_permissions WHERE user_id = $1 AND subject_code = $2', 
            [userId, subjectCode]
        );
        
        if (check.rowCount && check.rowCount > 0) {
            await client.query(`
                UPDATE user_permissions SET can_edit = $1, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2 AND subject_code = $3
            `, [canEdit, userId, subjectCode]);
        } else {
             await client.query(`
                INSERT INTO user_permissions (user_id, subject_code, can_edit, granted_by)
                VALUES ($1, $2, $3, $4)
            `, [userId, subjectCode, canEdit, grantedBy]);
        }
    } finally {
        client.release();
    }
}

// Legacy helper compatibility
// Some files might import { getDb } and expect .data.users...
// This is a break. I must verify usages.
// The `src/app/api/permissions/route.ts` was using `getDb().data.userPermissions`.
// I need to change that file to use the new exported functions instead of `getDb()`.
export async function getDb() {
    throw new Error("getDb() is deprecated. Please use specific DB functions from named imports.");
}

// Subject Management Functions


export async function getSubjects(visibleOnly: boolean = false): Promise<Subject[]> {
  await init();
  return withRetry(async () => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      const query = visibleOnly 
        ? 'SELECT * FROM subjects WHERE is_visible = true ORDER BY display_order, code'
        : 'SELECT * FROM subjects ORDER BY display_order, code';
      
      const result = await client.query(query);
      return result.rows.map(row => ({
        id: row.id,
        code: row.code,
        title: row.title,
        description: row.description,
        icon: row.icon,
        color: row.color,
        isVisible: row.is_visible,
        displayOrder: row.display_order,
        createScoreCheckPlaceholder: row.create_score_check_placeholder,
        createLabRunnerPlaceholder: row.create_lab_runner_placeholder,
        courseSummaryLink: row.course_summary_link,
        quizSectionEnabled: row.quiz_section_enabled !== false,
        feedbackSectionEnabled: row.feedback_section_enabled !== false,
        hasGradingInterface: row.has_grading_interface || false,
        hasQuizManagement: row.has_quiz_management || false,
        hasTestCases: row.has_test_cases || false,
        gradingType: row.grading_type,
        googleSheetId: row.google_sheet_id,
        headerRow: row.header_row,
        columnPattern: row.column_pattern,
        dataSourceType: row.data_source_type,
        sheetTabs: row.sheet_tabs,
        singleSheetTabName: row.single_sheet_tab_name || undefined,
        studentIdColumn: row.student_id_column || undefined,
        labWeight: row.lab_weight,
        labMaxScore: row.lab_max_score,
        useUniformLabScore: row.use_uniform_lab_score ?? true,
        rubricLevels: row.rubric_levels ? JSON.parse(row.rubric_levels) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } finally {
      client.release();
    }
  });
}

export async function updateSubjectVisibility(code: string, isVisible: boolean): Promise<void> {
  await init();
  return withRetry(async () => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query(`
        UPDATE subjects 
        SET is_visible = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE code = $2
      `, [isVisible, code]);
    } finally {
      client.release();
    }
  });
}

export async function updateSubjectOrder(code: string, displayOrder: number): Promise<void> {
  await init();
  return withRetry(async () => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query(`
        UPDATE subjects 
        SET display_order = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE code = $2
      `, [displayOrder, code]);
    } finally {
      client.release();
    }
  });
}

export async function updateSubjectQuizSection(code: string, enabled: boolean): Promise<boolean> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    // console.log('🔄 Updating subject quiz section:', { code, enabled });
    
    const result = await client.query(`
      UPDATE subjects 
      SET quiz_section_enabled = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE code = $2
      RETURNING quiz_section_enabled
    `, [enabled, code]);
    
    // console.log('📊 Query result:', { rowCount: result.rows.length, rows: result.rows });
    
    if (result.rows.length === 0) {
      throw new Error(`Subject with code '${code}' not found`);
    }
    
    return result.rows[0].quiz_section_enabled;
  } finally {
    client.release();
  }
}

export async function createSubject(
  code: string,
  title: string,
  description: string,
  icon: string = 'Code',
  color: string = 'from-blue-500 to-indigo-500',
  isVisible: boolean = true,
  displayOrder: number = 0,
  createScoreCheckPlaceholder: boolean = false,
  createLabRunnerPlaceholder: boolean = false,
  courseSummaryLink?: string,
  googleSheetId?: string
): Promise<Subject> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      INSERT INTO subjects (code, title, description, icon, color, is_visible, display_order, 
        create_score_check_placeholder, create_lab_runner_placeholder, course_summary_link, google_sheet_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [code, title, description, icon, color, isVisible, displayOrder, 
        createScoreCheckPlaceholder, createLabRunnerPlaceholder, courseSummaryLink || null, googleSheetId || null]);
    
    const row = result.rows[0];
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      icon: row.icon,
      color: row.color,
      isVisible: row.is_visible,
      displayOrder: row.display_order,
      createScoreCheckPlaceholder: row.create_score_check_placeholder,
      createLabRunnerPlaceholder: row.create_lab_runner_placeholder,
      courseSummaryLink: row.course_summary_link,
      quizSectionEnabled: row.quiz_section_enabled,
      feedbackSectionEnabled: row.feedback_section_enabled,
      hasGradingInterface: row.has_grading_interface || false,
      hasQuizManagement: row.has_quiz_management || false,
      hasTestCases: row.has_test_cases || false,
      gradingType: row.grading_type || null,
      googleSheetId: row.google_sheet_id,
      headerRow: row.header_row,
      columnPattern: row.column_pattern,
      dataSourceType: row.data_source_type,
      sheetTabs: row.sheet_tabs,
      singleSheetTabName: row.single_sheet_tab_name || undefined,
      studentIdColumn: row.student_id_column || undefined,
      rubricLevels: row.rubric_levels ? JSON.parse(row.rubric_levels) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } finally {
    client.release();
  }
}

export async function updateSubject(
  code: string,
  updates: Partial<Omit<Subject, 'id' | 'code' | 'createdAt' | 'updatedAt'>>
): Promise<Subject | null> {
  await init();
  return withRetry(async () => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.title !== undefined) { fields.push(`title = $${idx++}`); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push(`description = $${idx++}`); values.push(updates.description); }
    if (updates.icon !== undefined) { fields.push(`icon = $${idx++}`); values.push(updates.icon); }
    if (updates.color !== undefined) { fields.push(`color = $${idx++}`); values.push(updates.color); }
    if (updates.isVisible !== undefined) { fields.push(`is_visible = $${idx++}`); values.push(updates.isVisible); }
    if (updates.displayOrder !== undefined) { fields.push(`display_order = $${idx++}`); values.push(updates.displayOrder); }
    if (updates.createScoreCheckPlaceholder !== undefined) { fields.push(`create_score_check_placeholder = $${idx++}`); values.push(updates.createScoreCheckPlaceholder); }
    if (updates.createLabRunnerPlaceholder !== undefined) { fields.push(`create_lab_runner_placeholder = $${idx++}`); values.push(updates.createLabRunnerPlaceholder); }
    if (updates.courseSummaryLink !== undefined) { fields.push(`course_summary_link = $${idx++}`); values.push(updates.courseSummaryLink); }
    if (updates.hasGradingInterface !== undefined) { fields.push(`has_grading_interface = $${idx++}`); values.push(updates.hasGradingInterface); }
    if (updates.hasQuizManagement !== undefined) { fields.push(`has_quiz_management = $${idx++}`); values.push(updates.hasQuizManagement); }
    if (updates.hasTestCases !== undefined) { fields.push(`has_test_cases = $${idx++}`); values.push(updates.hasTestCases); }
    if (updates.gradingType !== undefined) { fields.push(`grading_type = $${idx++}`); values.push(updates.gradingType); }
    if (updates.quizSectionEnabled !== undefined) { fields.push(`quiz_section_enabled = $${idx++}`); values.push(updates.quizSectionEnabled); }
    if (updates.feedbackSectionEnabled !== undefined) { fields.push(`feedback_section_enabled = $${idx++}`); values.push(updates.feedbackSectionEnabled); }
    if (updates.googleSheetId !== undefined) { fields.push(`google_sheet_id = $${idx++}`); values.push(updates.googleSheetId); }
    if (updates.headerRow !== undefined) { fields.push(`header_row = $${idx++}`); values.push(updates.headerRow); }
    if (updates.columnPattern !== undefined) { fields.push(`column_pattern = $${idx++}`); values.push(updates.columnPattern); }
    if (updates.dataSourceType !== undefined) { fields.push(`data_source_type = $${idx++}`); values.push(updates.dataSourceType); }
    if (updates.sheetTabs !== undefined) { fields.push(`sheet_tabs = $${idx++}`); values.push(updates.sheetTabs); }
    if (updates.singleSheetTabName !== undefined) { fields.push(`single_sheet_tab_name = $${idx++}`); values.push(updates.singleSheetTabName || null); }
    if (updates.studentIdColumn !== undefined) { fields.push(`student_id_column = $${idx++}`); values.push(updates.studentIdColumn || null); }
    if (updates.labWeight !== undefined) { fields.push(`lab_weight = $${idx++}`); values.push(updates.labWeight); }
    if (updates.labMaxScore !== undefined) { fields.push(`lab_max_score = $${idx++}`); values.push(updates.labMaxScore); }
    if (updates.useUniformLabScore !== undefined) { fields.push(`use_uniform_lab_score = $${idx++}`); values.push(updates.useUniformLabScore); }
    if (updates.rubricLevels !== undefined) { fields.push(`rubric_levels = $${idx++}`); values.push(updates.rubricLevels ? JSON.stringify(updates.rubricLevels) : null); }

    if (fields.length === 0) {
      const existing = await client.query('SELECT * FROM subjects WHERE code = $1', [code]);
      if (existing.rowCount === 0) return null;
      const row = existing.rows[0];
      return {
        id: row.id,
        code: row.code,
        title: row.title,
        description: row.description,
        icon: row.icon,
        color: row.color,
        isVisible: row.is_visible,
        displayOrder: row.display_order,
        createScoreCheckPlaceholder: row.create_score_check_placeholder,
        createLabRunnerPlaceholder: row.create_lab_runner_placeholder,
        courseSummaryLink: row.course_summary_link,
        quizSectionEnabled: row.quiz_section_enabled,
        feedbackSectionEnabled: row.feedback_section_enabled,
        hasGradingInterface: row.has_grading_interface || false,
        hasQuizManagement: row.has_quiz_management || false,
        hasTestCases: row.has_test_cases || false,
        gradingType: row.grading_type || null,
        googleSheetId: row.google_sheet_id,
        headerRow: row.header_row,
        columnPattern: row.column_pattern,
        dataSourceType: row.data_source_type,
        sheetTabs: row.sheet_tabs,
        singleSheetTabName: row.single_sheet_tab_name || undefined,
        studentIdColumn: row.student_id_column || undefined,
        labWeight: row.lab_weight,
        labMaxScore: row.lab_max_score,
        useUniformLabScore: row.use_uniform_lab_score ?? true,
        rubricLevels: row.rubric_levels ? JSON.parse(row.rubric_levels) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(code);
    
    const result = await client.query(`
      UPDATE subjects SET ${fields.join(', ')}
      WHERE code = $${idx}
      RETURNING *
    `, values);

    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description,
      icon: row.icon,
      color: row.color,
      isVisible: row.is_visible,
      displayOrder: row.display_order,
      createScoreCheckPlaceholder: row.create_score_check_placeholder,
      createLabRunnerPlaceholder: row.create_lab_runner_placeholder,
      courseSummaryLink: row.course_summary_link,
      quizSectionEnabled: row.quiz_section_enabled,
      feedbackSectionEnabled: row.feedback_section_enabled,
      hasGradingInterface: row.has_grading_interface || false,
      hasQuizManagement: row.has_quiz_management || false,
      hasTestCases: row.has_test_cases || false,
      gradingType: row.grading_type || null,
      googleSheetId: row.google_sheet_id,
      headerRow: row.header_row,
      columnPattern: row.column_pattern,
      dataSourceType: row.data_source_type,
      sheetTabs: row.sheet_tabs,
      singleSheetTabName: row.single_sheet_tab_name || undefined,
      studentIdColumn: row.student_id_column || undefined,
      labWeight: row.lab_weight,
      labMaxScore: row.lab_max_score,
      useUniformLabScore: row.use_uniform_lab_score ?? true,
      rubricLevels: row.rubric_levels ? JSON.parse(row.rubric_levels) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    } finally {
      client.release();
    }
  });
}

// Credentials Management Functions
export interface Credential {
  id: number;
  studentId: string;
  credential: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
}

export async function getCredentials(subject?: string, credential?: string, studentId?: string): Promise<Credential[]> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    let query = 'SELECT * FROM credentials WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    // Subject filter is now optional (for backward compatibility)
    // When looking up by credential, ignore subject
    if (subject && !credential && !studentId) {
      query += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }
    
    if (credential) {
      query += ` AND credential = $${paramIndex}`;
      params.push(credential);
      paramIndex++;
    }

    if (studentId) {
      query += ` AND student_id = $${paramIndex}`;
      params.push(studentId);
      paramIndex++;
    }
    
    query += ' ORDER BY student_id';
    
    const result = await client.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      studentId: row.student_id,
      credential: row.credential,
      subject: row.subject,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } finally {
    client.release();
  }
}

export async function saveCredentials(credentials: { studentId: string; credential: string }[], subject?: string): Promise<number> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert or update credentials (upsert)
    // Now uses student_id as unique key (universal across subjects)
    for (const cred of credentials) {
      await client.query(
        `INSERT INTO credentials (student_id, credential, subject) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (student_id) 
         DO UPDATE SET credential = $2, subject = $3, updated_at = CURRENT_TIMESTAMP`,
        [cred.studentId, cred.credential, subject || null]
      );
    }
    
    await client.query('COMMIT');
    return credentials.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete all credentials for a specific subject
 */
export async function deleteAllCredentials(subject: string): Promise<number> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'DELETE FROM credentials WHERE subject = $1',
      [subject]
    );
    return result.rowCount || 0;
  } finally {
    client.release();
  }
}

/**
 * Delete ALL credentials from database (across all subjects)
 */
export async function deleteAllCredentialsEverywhere(): Promise<number> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'DELETE FROM credentials'
    );
    return result.rowCount || 0;
  } finally {
    client.release();
  }
}


export async function deleteSubject(code: string): Promise<boolean> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query('DELETE FROM subjects WHERE code = $1', [code]);
    return (result.rowCount || 0) > 0;
  } finally {
    client.release();
  }
}

// Quiz Scores Interface
export interface QuizScore {
  id: string;
  studentId: string;
  subject: string;
  labNumber: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  answers: any;
  submittedAt: string;
}

// Get quiz scores with optional filters
export async function getQuizScores(
  subject?: string,
  labNumber?: string,
  studentId?: string
): Promise<QuizScore[]> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    let query = 'SELECT * FROM quiz_scores WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (subject) {
      query += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }

    if (labNumber) {
      query += ` AND lab_number = $${paramIndex}`;
      params.push(labNumber);
      paramIndex++;
    }

    if (studentId) {
      query += ` AND student_id = $${paramIndex}`;
      params.push(studentId);
      paramIndex++;
    }

    query += ' ORDER BY submitted_at DESC';

    const result = await client.query(query, params);
    
    return result.rows.map((row) => ({
      id: row.id,
      studentId: row.student_id,
      subject: row.subject,
      labNumber: row.lab_number,
      score: row.score,
      totalQuestions: row.total_questions,
      correctAnswers: row.correct_answers,
      answers: row.answers,
      submittedAt: row.submitted_at
    }));
  } finally {
    client.release();
  }
}

// Save a quiz score
export async function saveQuizScore(
  studentId: string,
  subject: string,
  labNumber: string,
  score: number,
  totalQuestions: number,
  correctAnswers: number,
  answers: any
): Promise<QuizScore> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const submittedAt = new Date().toISOString();

    const result = await client.query(
      `INSERT INTO quiz_scores (
        id, student_id, subject, lab_number, score, 
        total_questions, correct_answers, answers, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [id, studentId, subject, labNumber, score, totalQuestions, correctAnswers, JSON.stringify(answers), submittedAt]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      studentId: row.student_id,
      subject: row.subject,
      labNumber: row.lab_number,
      score: row.score,
      totalQuestions: row.total_questions,
      correctAnswers: row.correct_answers,
      answers: row.answers,
      submittedAt: row.submitted_at
    };
  } finally {
    client.release();
  }
}

// -- QUIZ PROGRESS OPERATIONS --

export interface QuizProgress {
  id: number;
  studentId: string;
  subject: string;
  labNumber: string;
  answers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export async function getQuizProgress(
  studentId: string,
  subject: string,
  labNumber: string
): Promise<QuizProgress | null> {
  await init();
  const client = await getPool().connect();
  
  try {
    const res = await client.query(`
      SELECT * FROM quiz_progress 
      WHERE student_id = $1 AND subject = $2 AND lab_number = $3
    `, [studentId, subject, labNumber]);
    
    if (res.rowCount === 0) return null;
    
    const r = res.rows[0];
    return {
      id: r.id,
      studentId: r.student_id,
      subject: r.subject,
      labNumber: r.lab_number,
      answers: r.answers || {},
      createdAt: r.created_at.toString(),
      updatedAt: r.updated_at.toString()
    };
  } finally {
    client.release();
  }
}

export async function saveQuizProgress(
  studentId: string,
  subject: string,
  labNumber: string,
  answers: Record<string, string>
): Promise<void> {
  await init();
  const client = await getPool().connect();
  
  try {
    await client.query(`
      INSERT INTO quiz_progress (student_id, subject, lab_number, answers)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (student_id, subject, lab_number)
      DO UPDATE SET 
        answers = EXCLUDED.answers,
        updated_at = NOW()
    `, [studentId, subject, labNumber, JSON.stringify(answers)]);
  } finally {
    client.release();
  }
}

export async function deleteQuizProgress(
  studentId: string,
  subject: string,
  labNumber: string
): Promise<boolean> {
  await init();
  const client = await getPool().connect();
  
  try {
    const res = await client.query(`
      DELETE FROM quiz_progress 
      WHERE student_id = $1 AND subject = $2 AND lab_number = $3
    `, [studentId, subject, labNumber]);
    
    return (res.rowCount || 0) > 0;
  } finally {
    client.release();
  }
}

// Delete quiz scores (for resetting)
export async function deleteQuizScores(
  subject: string,
  labNumber: string
): Promise<number> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'DELETE FROM quiz_scores WHERE subject = $1 AND lab_number = $2',
      [subject, labNumber]
    );
    return result.rowCount || 0;
  } finally {
    client.release();
  }
}

// ITCS113 Student interface and functions
export interface ITCS113Student {
  id: number;
  studentId: string;
  name: string;
  surname: string;
  section: string;
  createdAt: string;
}

export async function getITCS113Student(studentId: string): Promise<ITCS113Student | null> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT * FROM itcs113_students WHERE student_id = $1',
      [studentId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      studentId: row.student_id,
      name: row.name,
      surname: row.surname,
      section: row.section || '',
      createdAt: row.created_at
    };
  } finally {
    client.release();
  }
}

// =============================================
// Announcement Functions
// =============================================

export async function getAllAnnouncements(subject: string, visibleOnly: boolean = false): Promise<Announcement[]> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const query = visibleOnly
      ? 'SELECT * FROM announcements WHERE subject = $1 AND is_visible = TRUE ORDER BY created_at DESC'
      : 'SELECT * FROM announcements WHERE subject = $1 ORDER BY created_at DESC';
    
    const result = await client.query(query, [subject]);

    return result.rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      title: row.title,
      message: row.message,
      createdBy: row.created_by,
      createdAt: row.created_at,
      isVisible: row.is_visible ?? true,
    }));
  } finally {
    client.release();
  }
}

export async function createAnnouncement(
  subject: string,
  title: string,
  message: string,
  createdBy: string
): Promise<Announcement> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'INSERT INTO announcements (subject, title, message, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [subject, title, message, createdBy]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      subject: row.subject,
      title: row.title,
      message: row.message,
      createdBy: row.created_by,
      createdAt: row.created_at,
      isVisible: row.is_visible ?? true,
    };
  } finally {
    client.release();
  }
}

export async function updateAnnouncement(
  id: string,
  title: string,
  message: string
): Promise<Announcement> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'UPDATE announcements SET title = $1, message = $2 WHERE id = $3 RETURNING *',
      [title, message, id]
    );

    if (result.rows.length === 0) {
      throw new Error('Announcement not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      subject: row.subject,
      title: row.title,
      message: row.message,
      createdBy: row.created_by,
      createdAt: row.created_at,
      isVisible: row.is_visible ?? true,
    };
  } finally {
    client.release();
  }
}

export async function toggleAnnouncementVisibility(id: string): Promise<Announcement> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query(
      'UPDATE announcements SET is_visible = NOT is_visible WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('Announcement not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      subject: row.subject,
      title: row.title,
      message: row.message,
      createdBy: row.created_by,
      createdAt: row.created_at,
      isVisible: row.is_visible ?? true,
    };
  } finally {
    client.release();
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('DELETE FROM announcements WHERE id = $1', [id]);
  } finally {
    client.release();
  }
}

// -- LAB FEEDBACK OPERATIONS --

export async function getLabFeedback(
  labNumber: string,
  subject: string,
  studentId: string
): Promise<LabFeedback | undefined> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const res = await client.query(
      'SELECT * FROM lab_feedback WHERE lab_number = $1 AND subject = $2 AND student_id = $3',
      [labNumber, subject.toUpperCase(), studentId]
    );
    
    if (res.rowCount === 0) return undefined;

    const r = res.rows[0];
    return {
      id: r.id,
      labId: r.lab_id,
      labNumber: r.lab_number,
      subject: r.subject,
      studentId: r.student_id,
      adminComment: r.admin_comment,
      isVisibleToStudent: r.is_visible_to_student,
      createdAt: r.created_at.toString(),
      updatedAt: r.updated_at.toString(),
      createdBy: r.created_by
    };
  } finally {
    client.release();
  }
}

export async function getStudentLabFeedback(
  subject: string,
  studentId: string
): Promise<LabFeedback[]> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const res = await client.query(
      'SELECT * FROM lab_feedback WHERE subject = $1 AND student_id = $2 ORDER BY lab_number ASC',
      [subject.toUpperCase(), studentId]
    );
    
    return res.rows.map(r => ({
      id: r.id,
      labId: r.lab_id,
      labNumber: r.lab_number,
      subject: r.subject,
      studentId: r.student_id,
      adminComment: r.admin_comment,
      isVisibleToStudent: r.is_visible_to_student,
      createdAt: r.created_at.toString(),
      updatedAt: r.updated_at.toString(),
      createdBy: r.created_by
    }));
  } finally {
    client.release();
  }
}

export async function getVisibleLabFeedback(
  subject: string,
  studentId: string
): Promise<LabFeedback[]> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const res = await client.query(
      'SELECT * FROM lab_feedback WHERE subject = $1 AND student_id = $2 AND is_visible_to_student = TRUE ORDER BY lab_number ASC',
      [subject.toUpperCase(), studentId]
    );
    
    return res.rows.map(r => ({
      id: r.id,
      labId: r.lab_id,
      labNumber: r.lab_number,
      subject: r.subject,
      studentId: r.student_id,
      adminComment: r.admin_comment,
      isVisibleToStudent: r.is_visible_to_student,
      createdAt: r.created_at.toString(),
      updatedAt: r.updated_at.toString(),
      createdBy: r.created_by
    }));
  } finally {
    client.release();
  }
}

export async function getSubjectFeedback(
  subject: string
): Promise<LabFeedback[]> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const res = await client.query(
      'SELECT * FROM lab_feedback WHERE subject = $1 ORDER BY student_id ASC, lab_number ASC',
      [subject.toUpperCase()]
    );
    
    return res.rows.map(r => ({
      id: r.id,
      labId: r.lab_id,
      labNumber: r.lab_number,
      subject: r.subject,
      studentId: r.student_id,
      adminComment: r.admin_comment,
      isVisibleToStudent: r.is_visible_to_student,
      createdAt: r.created_at.toString(),
      updatedAt: r.updated_at.toString(),
      createdBy: r.created_by
    }));
  } finally {
    client.release();
  }
}

export async function upsertLabFeedback(
  labNumber: string,
  subject: string,
  studentId: string,
  adminComment: string,
  isVisibleToStudent: boolean,
  createdBy: string
): Promise<LabFeedback> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const res = await client.query(
      `INSERT INTO lab_feedback (lab_number, subject, student_id, admin_comment, is_visible_to_student, created_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (lab_number, subject, student_id)
       DO UPDATE SET 
         admin_comment = $4,
         is_visible_to_student = $5,
         created_by = $6,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [labNumber, subject.toUpperCase(), studentId, adminComment, isVisibleToStudent, createdBy]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      labId: r.lab_id,
      labNumber: r.lab_number,
      subject: r.subject,
      studentId: r.student_id,
      adminComment: r.admin_comment,
      isVisibleToStudent: r.is_visible_to_student,
      createdAt: r.created_at.toString(),
      updatedAt: r.updated_at.toString(),
      createdBy: r.created_by
    };
  } finally {
    client.release();
  }
}

export async function updateLabFeedbackVisibility(
  labNumber: string,
  subject: string,
  studentId: string,
  isVisibleToStudent: boolean
): Promise<LabFeedback | undefined> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const res = await client.query(
      `UPDATE lab_feedback 
       SET is_visible_to_student = $4, updated_at = CURRENT_TIMESTAMP
       WHERE lab_number = $1 AND subject = $2 AND student_id = $3
       RETURNING *`,
      [labNumber, subject.toUpperCase(), studentId, isVisibleToStudent]
    );

    if (res.rowCount === 0) return undefined;

    const r = res.rows[0];
    return {
      id: r.id,
      labId: r.lab_id,
      labNumber: r.lab_number,
      subject: r.subject,
      studentId: r.student_id,
      adminComment: r.admin_comment,
      isVisibleToStudent: r.is_visible_to_student,
      createdAt: r.created_at.toString(),
      updatedAt: r.updated_at.toString(),
      createdBy: r.created_by
    };
  } finally {
    client.release();
  }
}

export async function deleteLabFeedback(
  labNumber: string,
  subject: string,
  studentId: string
): Promise<boolean> {
  await init();
  const pool = getPool();
  const client = await pool.connect();

  try {
    const upperSubject = subject.toUpperCase();
    
    const res = await client.query(
      'DELETE FROM lab_feedback WHERE lab_number = $1 AND subject = $2 AND student_id = $3',
      [labNumber, upperSubject, studentId]
    );
    const deleted = res.rowCount !== null && res.rowCount > 0;
    
    return deleted;
  } catch (err) {
    console.error('[deleteLabFeedback] Error:', err);
    throw err;
  } finally {
    client.release();
  }
}
