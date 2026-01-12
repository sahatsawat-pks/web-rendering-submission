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

// Singleton Pool
let pool: Pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing in environment variables");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Neon typically requires this
      }
    });
  }
  return pool;
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
        
        // Ensure all existing subjects have quiz_section_enabled set to TRUE (if NULL)
        await client.query(`
            UPDATE subjects 
            SET quiz_section_enabled = TRUE 
            WHERE quiz_section_enabled IS NULL;
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Create credentials table
        await client.query(`
            CREATE TABLE IF NOT EXISTS credentials (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(50) NOT NULL,
                credential VARCHAR(10) NOT NULL,
                subject VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id, subject)
            );
        `);
        
        // Seed subjects if table is empty
        const subjectsCount = await client.query('SELECT COUNT(*) FROM subjects');
        if (parseInt(subjectsCount.rows[0].count) === 0) {
            await client.query(`
                INSERT INTO subjects (code, title, description, icon, color, is_visible, display_order) VALUES
                ('ITCS223', 'Introduction to Web Development', 'Full-stack web submission rendering & testing.', 'Code2', 'from-teal-500 to-cyan-500', true, 1),
                ('ITCS227', 'Introduction to Data Science', 'Lab score tracking and grading system.', 'BarChart3', 'from-indigo-500 to-violet-500', true, 2),
                ('ITGE162', 'Physical Science and Computation', 'Lab score tracking and grading system.', 'Layers', 'from-emerald-500 to-green-500', true, 3),
                ('ITCS123', 'Object Oriented Programming', 'Java JUnit test runner and code validator.', 'Terminal', 'from-orange-500 to-amber-500', true, 4),
                ('ITDS283', 'Mobile Application Development', 'Mobile app project submissions and testing.', 'Smartphone', 'from-rose-500 to-red-500', true, 5),
                ('ITCS251', 'Programming in Python', 'Python code execution and test validation.', 'Code', 'from-blue-500 to-sky-500', true, 6),
                ('ITCS255', 'Structured Query Language Essentials', 'SQL query execution and validation.', 'Database', 'from-purple-500 to-pink-500', true, 7);
            `);
            console.log('✅ Seeded subjects table');
        }

        
        // Seed initial admin if needed
        const targetUsername = "kanzaki_aito";
        const res = await client.query('SELECT * FROM users WHERE username = $1', [targetUsername]);
        if (res.rowCount === 0) {
            const hashed = await hashPassword("aito1472*");
            await client.query(`
                INSERT INTO users (username, password)
                VALUES ($1, $2)
            `, [targetUsername, hashed]);
            console.log(`✅ Created seed user: ${targetUsername}`);
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
            createdAt: r.created_at.toString()
      };
  } finally {
      client.release();
  }
}

export async function getLabByNumber(labNumber: string, subject?: string): Promise<Lab | undefined> {
    await init();
    const client = await getPool().connect();
    try {
        let query = 'SELECT * FROM labs WHERE lab_number = $1';
        const params: any[] = [labNumber];
        
        if (subject) {
            query += ' AND subject = $2';
            params.push(subject);
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
  labType: 'Lab' | 'Challenge' = 'Lab'
): Promise<Lab> {
    await init();
    const client = await getPool().connect();
    try {
        const res = await client.query(`
            INSERT INTO labs (lab_number, title, file_name, subject, is_active, deadline, test_cases, lab_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [labNumber, title, fileName, subject, isActive, deadline || null, testCases || null, labType]);
        
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
  createdAt: string;
  updatedAt: string;
}

export async function getSubjects(visibleOnly: boolean = false): Promise<Subject[]> {
  await init();
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
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } finally {
    client.release();
  }
}

export async function updateSubjectVisibility(code: string, isVisible: boolean): Promise<void> {
  await init();
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
}

export async function updateSubjectOrder(code: string, displayOrder: number): Promise<void> {
  await init();
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
}

export async function updateSubjectQuizSection(code: string, enabled: boolean): Promise<boolean> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    console.log('🔄 Updating subject quiz section:', { code, enabled });
    
    const result = await client.query(`
      UPDATE subjects 
      SET quiz_section_enabled = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE code = $2
      RETURNING quiz_section_enabled
    `, [enabled, code]);
    
    console.log('📊 Query result:', { rowCount: result.rows.length, rows: result.rows });
    
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
  courseSummaryLink?: string
): Promise<Subject> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      INSERT INTO subjects (code, title, description, icon, color, is_visible, display_order, 
        create_score_check_placeholder, create_lab_runner_placeholder, course_summary_link)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [code, title, description, icon, color, isVisible, displayOrder, 
        createScoreCheckPlaceholder, createLabRunnerPlaceholder, courseSummaryLink || null]);
    
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
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } finally {
    client.release();
  }
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

export async function getCredentials(subject?: string, credential?: string): Promise<Credential[]> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    let query = 'SELECT * FROM credentials WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (subject) {
      query += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }
    
    if (credential) {
      query += ` AND credential = $${paramIndex}`;
      params.push(credential);
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

export async function saveCredentials(credentials: { studentId: string; credential: string }[], subject: string): Promise<number> {
  await init();
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete existing credentials for this subject
    await client.query('DELETE FROM credentials WHERE subject = $1', [subject]);
    
    // Insert new credentials
    for (const cred of credentials) {
      await client.query(
        `INSERT INTO credentials (student_id, credential, subject) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (student_id, subject) 
         DO UPDATE SET credential = $2, updated_at = CURRENT_TIMESTAMP`,
        [cred.studentId, cred.credential, subject]
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
