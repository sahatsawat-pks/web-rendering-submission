import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { join } from "path";
import { hashPassword } from "./password";

export interface User {
  id: string;
  username: string;
  password: string;
  createdAt: string;
}

export interface Lab {
  id: string;
  labNumber: string;
  title: string;
  fileName: string;
  subject: string; // e.g. 'ITGE162', 'ITCS227'
  isActive: boolean;
  deadline?: string;
  createdAt: string;
}

interface Database {
  users: User[];
  labs: Lab[];
}

let db: Low<Database> | null = null;

export async function getDb(): Promise<Low<Database>> {
  if (db) {
    return db;
  }

  // Database file stored in project root
  const file = join(process.cwd(), "database.json");
  const adapter = new JSONFile<Database>(file);
  db = new Low(adapter, { users: [], labs: [] });

  await db.read();

  // Initialize/Update users based on specific requirements
  const targetUsername = "kanzaki_aito";
  const targetUserExists = db.data.users.some(u => u.username === targetUsername);

  if (!targetUserExists) {
    const hashedPassword = await hashPassword("aito1472*");
    db.data.users.push({
      id: Date.now().toString(),
      username: targetUsername,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    });
    console.log(`✅ Created specific user: ${targetUsername}`);
    await db.write();
  }

  // Remove default admin if it exists
  const adminIndex = db.data.users.findIndex(u => u.username === "admin");
  if (adminIndex !== -1) {
    db.data.users.splice(adminIndex, 1);
    await db.write();
    console.log("❌ Removed default admin account");
  }

  return db;
}

// User operations
export async function findUserByUsername(
  username: string
): Promise<User | undefined> {
  const database = await getDb();
  return database.data.users.find((user) => user.username === username);
}

export async function createUser(
  username: string,
  password: string
): Promise<User> {
  const database = await getDb();
  const hashedPassword = await hashPassword(password);

  const newUser: User = {
    id: Date.now().toString(),
    username,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  };

  database.data.users.push(newUser);
  await database.write();

  return newUser;
}

// Lab operations
export async function getAllLabs(activeOnly: boolean = false, subject?: string): Promise<Lab[]> {
  const database = await getDb();
  let labs = database.data.labs;
  
  if (activeOnly) {
    labs = labs.filter((lab) => lab.isActive);
  }

  if (subject) {
      labs = labs.filter((lab) => lab.subject === subject);
  }

  return labs;
}

export async function getLabById(id: string): Promise<Lab | undefined> {
  const database = await getDb();
  return database.data.labs.find((lab) => lab.id === id);
}

export async function getLabByNumber(
  labNumber: string
): Promise<Lab | undefined> {
  const database = await getDb();
  return database.data.labs.find((lab) => lab.labNumber === labNumber);
}

export async function createLab(
  labNumber: string,
  title: string,
  fileName: string = "index.html",
  subject: string = "ITGE162",
  isActive: boolean = true,
  deadline?: string
): Promise<Lab> {
  const database = await getDb();

  const newLab: Lab = {
    id: Date.now().toString(),
    labNumber,
    title,
    fileName,
    subject,
    isActive,
    deadline,
    createdAt: new Date().toISOString(),
  };

  database.data.labs.push(newLab);
  await database.write();

  return newLab;
}

export async function updateLab(
  id: string,
  updates: Partial<Omit<Lab, "id" | "createdAt">>
): Promise<Lab | null> {
  const database = await getDb();
  const labIndex = database.data.labs.findIndex((lab) => lab.id === id);

  if (labIndex === -1) {
    return null;
  }

  database.data.labs[labIndex] = {
    ...database.data.labs[labIndex],
    ...updates,
  };

  await database.write();
  return database.data.labs[labIndex];
}

export async function deleteLab(id: string): Promise<boolean> {
  const database = await getDb();
  const initialLength = database.data.labs.length;
  database.data.labs = database.data.labs.filter((lab) => lab.id !== id);

  if (database.data.labs.length < initialLength) {
    await database.write();
    return true;
  }

  return false;
}
