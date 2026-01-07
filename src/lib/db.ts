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
  labType?: 'Lab' | 'Challenge'; // Type of lab
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

export async function updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
    await init();
    const client = await getPool().connect();
    try {
        const res = await client.query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, id]);
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
            labType: r.lab_type || 'Lab',
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
            createdAt: r.created_at.toString()
      };
  } finally {
      client.release();
  }
}

export async function getLabByNumber(labNumber: string): Promise<Lab | undefined> {
    await init();
    // This function is ambiguous without subject, but legacy signature used it. 
    // It might return the first match.
    const client = await getPool().connect();
    try {
        const res = await client.query('SELECT * FROM labs WHERE lab_number = $1 LIMIT 1', [labNumber]);
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
              labType: r.lab_type || 'Lab',
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
            labType: r.lab_type || 'Lab',
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
        if (updates.labType !== undefined) { fields.push(`lab_type = $${idx++}`); values.push(updates.labType); }

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
            labType: r.lab_type || 'Lab',
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
  createdAt: string;
  updatedAt: string;
}

export async function getSubjects(visibleOnly: boolean = false): Promise<Subject[]> {
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
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } finally {
    client.release();
  }
}

export async function updateSubjectVisibility(code: string, isVisible: boolean): Promise<void> {
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
