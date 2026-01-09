# Subject Management System - Quick Reference

## ✅ Completed Features

### 1. **Create New Subjects**
- **Location**: Admin → Subject Management
- **Button**: "Create Subject" (top right)
- **Features**:
  - Subject code validation (uppercase letters/numbers only)
  - Title and description
  - Icon selection (12 options)
  - Color gradient selection (8 presets)
  - Visibility toggle
  - Automatic display order assignment

### 2. **Dynamic Permissions**
- **Location**: Admin → Account Management
- **Features**:
  - Automatically displays all subjects from database
  - Toggle permissions per user per subject
  - Works with any newly created subject
  - Main admin (kanzaki_aito) has all permissions by default

### 3. **Dynamic Lab Management**
- **Location**: Admin → Lab Management
- **Features**:
  - Subject dropdown loads all subjects from database
  - Filters available subjects based on user permissions
  - Lecturers only see subjects they have edit permissions for
  - Main admin sees all subjects

### 4. **Database Schema**
Added to `subjects` table:
```sql
- id (SERIAL PRIMARY KEY)
- code (VARCHAR UNIQUE)
- title (VARCHAR)
- description (TEXT)
- icon (VARCHAR)
- color (VARCHAR)
- is_visible (BOOLEAN)
- display_order (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 5. **Database Functions** (`/src/lib/db.ts`)
- `createSubject()` - Create new subject
- `updateSubject()` - Update subject details
- `deleteSubject()` - Remove subject
- `getSubjects()` - List all subjects (with optional visibility filter)
- `updateSubjectVisibility()` - Toggle visibility
- `updateSubjectOrder()` - Change display order

### 6. **API Endpoints** (`/src/app/api/subjects/route.ts`)
- **GET** `/api/subjects` - Fetch all subjects
- **POST** `/api/subjects` - Create new subject (admin only)
- **PATCH** `/api/subjects` - Update visibility/order (admin only)

## 🎯 How to Create a New Subject

### Step 1: Create in System
1. Go to **Admin → Subject Management**
2. Click **"Create Subject"** button
3. Fill in details:
   - Code (e.g., ITCS999)
   - Title (e.g., "Advanced Web Development")
   - Description (optional)
   - Icon (select from dropdown)
   - Color Gradient (select from swatches)
   - Visibility (toggle on/off)
4. Click **"Create Subject"**

### Step 2: Create Route Folders
Follow instructions in `SUBJECT_ROUTE_TEMPLATES.md`:

```bash
# Student routes
mkdir -p src/app/{subject_lower}/rendering
mkdir -p src/app/{subject_lower}/score

# Admin routes
mkdir -p src/app/admin/{subject_lower}/tests
```

Then copy page templates from similar existing subjects.

### Step 3: Add Permissions
1. Go to **Admin → Account Management**
2. New subject automatically appears in columns
3. Toggle permissions for each user/lecturer

### Step 4: Create Labs
1. Go to **Admin → Lab Management**
2. New subject appears in dropdown
3. Create labs as normal

## 📋 Subject Types & Templates

| Subject Type | Best Template | Example |
|--------------|---------------|---------|
| Java/OOP | ITCS123 | Object-Oriented Programming |
| Python | ITCS251 | Programming in Python |
| SQL/Database | ITCS255 | Database Systems |
| Web Development | ITCS223 | Web Development |
| Data Science | ITCS227 | Data Science |
| General Labs | Any | Generic lab structure |

## 🎨 Available Icons
Code, Code2, Database, Terminal, Smartphone, Layers, BarChart3, Server, Globe, BookOpen, Cpu, Binary

## 🌈 Color Gradients
- Blue-Sky: `from-blue-500 to-sky-500`
- Purple-Pink: `from-purple-500 to-pink-500`
- Orange-Amber: `from-orange-500 to-amber-500`
- Teal-Cyan: `from-teal-500 to-cyan-500`
- Indigo-Violet: `from-indigo-500 to-violet-500`
- Emerald-Green: `from-emerald-500 to-green-500`
- Rose-Red: `from-rose-500 to-red-500`
- Slate-Gray: `from-slate-500 to-gray-500`

## 🔐 Permissions Model

### Main Admin (kanzaki_aito)
- Can create subjects
- Can manage all subjects
- Can edit all labs
- Can manage all users
- Sees all subjects everywhere

### Lecturers with Permissions
- Can only see subjects they have permissions for
- Can create/edit labs for permitted subjects
- Can manage test cases for permitted subjects
- Cannot create subjects or manage users

### Learning Assistants (LA)
- Cannot access admin panel
- Can only view/submit labs as students

## 🚀 Workflow Example

**Creating a new "ITDS999 - Machine Learning" subject:**

1. **Create Subject** (Admin → Subject Management)
   - Code: ITDS999
   - Title: Machine Learning
   - Description: ML algorithms and implementations
   - Icon: Cpu
   - Color: Indigo-Violet
   - Visible: Yes

2. **Create Routes**
   ```bash
   mkdir -p src/app/itds999/rendering src/app/itds999/score
   mkdir -p src/app/admin/itds999/tests
   ```
   Copy templates from ITCS251 (Python) since ML uses Python

3. **Grant Permissions**
   - Go to Account Management
   - Give "Dr. Smith" edit permission for ITDS999
   - Give "TA_John" view permission

4. **Create First Lab**
   - Go to Lab Management
   - Select ITDS999 from dropdown
   - Create "Lab 1: Linear Regression"
   - Add test cases in Admin → ITDS999 → Tests

5. **Verify**
   - Student visits `/itds999` → sees Lab 1
   - Dr. Smith visits `/admin/itds999` → can edit tests
   - TA_John cannot access admin (LA role)

## 📁 File Structure

```
src/
├── lib/
│   └── db.ts (✅ Updated with subject CRUD)
├── app/
│   ├── {subject_lower}/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── rendering/page.tsx
│   │   └── score/page.tsx
│   ├── admin/
│   │   ├── subjects/
│   │   │   └── page.tsx (✅ Create dialog added)
│   │   ├── users/
│   │   │   └── page.tsx (✅ Dynamic permissions)
│   │   ├── labs/
│   │   │   └── page.tsx (✅ Dynamic subjects)
│   │   └── {subject_lower}/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       └── tests/page.tsx
│   └── api/
│       └── subjects/
│           └── route.ts (✅ POST/GET/PATCH)
```

## 🐛 Troubleshooting

### Subject doesn't appear in permissions
- Refresh the page
- Check if subject was created successfully in database
- Verify API call to `/api/subjects` returns the subject

### Can't create subject - "Unauthorized"
- Only kanzaki_aito (main admin) can create subjects
- Check if logged in as correct user

### Subject code already exists error
- Subject codes must be unique
- Choose a different code

### Permissions not working
- Ensure subject code matches exactly (case-sensitive)
- Check user_permissions table has correct entries
- Verify canEdit is set to true

### Labs not showing for new subject
- Ensure lab was created with correct subject code
- Check if lab is marked as active
- Verify API filtering is working

## 📝 Notes

- Subject codes are **case-sensitive** in database (stored as uppercase)
- Subject codes must be **unique**
- Deleting a subject doesn't delete associated labs (manual cleanup needed)
- Route folders must be created **manually** after subject creation
- Main admin (kanzaki_aito) bypasses all permission checks

## 🔗 Related Documentation

- [ITCS255 SQL Testing Guide](ITCS255_SQL_TESTING_GUIDE.md)
- [Subject Route Templates](SUBJECT_ROUTE_TEMPLATES.md)
- [Testing Guide](TESTING_GUIDE.md)
