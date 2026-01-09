# Subject Route Template Generator

## Overview
After creating a new subject in the system, you need to create route folders for both student-facing pages and admin dashboard pages. This guide provides templates and scripts to automate this process.

## Required Routes

For a subject with code `ITCS999`, you need to create:

### 1. Student Routes
- `/src/app/itcs999/` - Main student page
- `/src/app/itcs999/rendering/` - Lab test runner
- `/src/app/itcs999/score/` - Score display page

### 2. Admin Routes
- `/src/app/admin/itcs999/` - Admin dashboard
- `/src/app/admin/itcs999/tests/` - Test case management

## Manual Creation Steps

### Step 1: Create Student Route Structure

```bash
# Replace {SUBJECT_CODE_LOWER} with lowercase subject code (e.g., itcs999)
mkdir -p src/app/{SUBJECT_CODE_LOWER}/rendering
mkdir -p src/app/{SUBJECT_CODE_LOWER}/score
```

### Step 2: Create Student Pages

#### `src/app/{SUBJECT_CODE_LOWER}/layout.tsx`
```typescript
export default function SubjectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

#### `src/app/{SUBJECT_CODE_LOWER}/page.tsx`
```typescript
"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ModeToggle } from "@/components/mode-toggle"

export default function SubjectPage() {
  const router = useRouter()
  const [labs, setLabs] = useState<any[]>([])

  useEffect(() => {
    fetchLabs()
  }, [])

  async function fetchLabs() {
    try {
      const res = await fetch("/api/labs?activeOnly=true&subject={SUBJECT_CODE_UPPER}")
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setLabs(data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber)))
        }
      }
    } catch (e) {
      console.error("Failed to load labs", e)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <a href="/" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              ← Back
            </a>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br {GRADIENT_COLORS} text-white font-bold shadow-lg">
              {SUBJECT_CODE_UPPER}
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {SUBJECT_TITLE}
            </span>
          </div>
          <ModeToggle />
        </div>
      </nav>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">
          Available Labs
        </h1>
        
        <div className="grid gap-4">
          {labs.map(lab => (
            <div key={lab.id} className="glass-card p-6 rounded-xl hover:shadow-xl transition-all">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Lab {lab.labNumber}: {lab.title}
              </h3>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => router.push(`/{SUBJECT_CODE_LOWER}/rendering?lab=${lab.labNumber}`)}
                  className="px-4 py-2 bg-gradient-to-r {GRADIENT_COLORS} text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Start Lab
                </button>
                <button
                  onClick={() => router.push(`/{SUBJECT_CODE_LOWER}/score?lab=${lab.labNumber}`)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  View Scores
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
```

**Replace these placeholders:**
- `{SUBJECT_CODE_LOWER}` → lowercase code (e.g., `itcs999`)
- `{SUBJECT_CODE_UPPER}` → uppercase code (e.g., `ITCS999`)
- `{SUBJECT_TITLE}` → full title (e.g., `Advanced Web Development`)
- `{GRADIENT_COLORS}` → gradient class (e.g., `from-blue-500 to-sky-500`)

#### `src/app/{SUBJECT_CODE_LOWER}/rendering/page.tsx`
Copy and adapt from existing subject (e.g., ITCS123, ITCS251, or ITCS255) based on your subject type:
- **Java/Code Testing**: Use ITCS123 as template
- **Python**: Use ITCS251 as template  
- **SQL/Database**: Use ITCS255 as template
- **Web/HTML**: Use ITCS223 as template

#### `src/app/{SUBJECT_CODE_LOWER}/score/page.tsx`
Copy from any existing subject (they're mostly identical), just update the subject code references.

### Step 3: Create Admin Route Structure

```bash
mkdir -p src/app/admin/{SUBJECT_CODE_LOWER}/tests
```

#### `src/app/admin/{SUBJECT_CODE_LOWER}/layout.tsx`
```typescript
export default function AdminSubjectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

#### `src/app/admin/{SUBJECT_CODE_LOWER}/page.tsx`
```typescript
"use client"

import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"

export default function AdminSubjectDashboard() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <a href="/admin/dashboard" className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              ← Dashboard
            </a>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br {GRADIENT_COLORS} text-white font-bold shadow-lg">
              {SUBJECT_CODE_UPPER}
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {SUBJECT_TITLE} Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">
          {SUBJECT_CODE_UPPER} Management
        </h1>
        
        <div className="grid gap-4">
          <button
            onClick={() => router.push('/admin/{SUBJECT_CODE_LOWER}/tests')}
            className="glass-card p-6 rounded-xl hover:shadow-xl transition-all text-left"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Test Case Management
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Create and manage test cases for labs
            </p>
          </button>
        </div>
      </main>
    </div>
  )
}
```

#### `src/app/admin/{SUBJECT_CODE_LOWER}/tests/page.tsx`
Copy from existing admin test management page based on subject type:
- **Java**: Use `/admin/itcs123/tests/page.tsx`
- **Python**: Use `/admin/itcs251/tests/page.tsx`
- **SQL**: Use `/admin/itcs255/tests/page.tsx`
- **General**: Use any as template

### Step 4: Update Admin Dashboard Links

Add the new subject to `/src/app/admin/dashboard/page.tsx`:

```typescript
// In the subjects array, add:
{
  code: "{SUBJECT_CODE_UPPER}",
  title: "{SUBJECT_TITLE}",
  description: "{DESCRIPTION}",
  color: "{GRADIENT_COLORS}",
  href: "/admin/{SUBJECT_CODE_LOWER}"
}
```

## Automated Script (Optional)

Create a script to generate routes automatically:

### `scripts/create-subject-routes.js`
```javascript
const fs = require('fs');
const path = require('path');

const SUBJECT_CODE = process.argv[2]?.toUpperCase();
const SUBJECT_TITLE = process.argv[3];
const GRADIENT_COLORS = process.argv[4] || 'from-blue-500 to-sky-500';

if (!SUBJECT_CODE || !SUBJECT_TITLE) {
  console.error('Usage: node scripts/create-subject-routes.js ITCS999 "Subject Title" "from-blue-500 to-sky-500"');
  process.exit(1);
}

const SUBJECT_CODE_LOWER = SUBJECT_CODE.toLowerCase();

// Create directories
const dirs = [
  `src/app/${SUBJECT_CODE_LOWER}`,
  `src/app/${SUBJECT_CODE_LOWER}/rendering`,
  `src/app/${SUBJECT_CODE_LOWER}/score`,
  `src/app/admin/${SUBJECT_CODE_LOWER}`,
  `src/app/admin/${SUBJECT_CODE_LOWER}/tests`,
];

dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`✓ Created ${dir}`);
});

// Create layout files
const layouts = [
  { path: `src/app/${SUBJECT_CODE_LOWER}/layout.tsx`, type: 'student' },
  { path: `src/app/admin/${SUBJECT_CODE_LOWER}/layout.tsx`, type: 'admin' },
];

layouts.forEach(({ path: filePath, type }) => {
  const content = `export default function ${type === 'admin' ? 'Admin' : ''}SubjectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}`;
  fs.writeFileSync(filePath, content);
  console.log(`✓ Created ${filePath}`);
});

console.log(`\n✅ Route structure created for ${SUBJECT_CODE}!`);
console.log(`\nNext steps:`);
console.log(`1. Copy page.tsx templates from similar subjects`);
console.log(`2. Update subject code references in copied files`);
console.log(`3. Add permissions for users in Account Management`);
console.log(`4. Configure labs in Lab Management`);
```

**Usage:**
```bash
node scripts/create-subject-routes.js ITCS999 "Advanced Web Development" "from-blue-500 to-sky-500"
```

## Post-Creation Checklist

After creating routes:

- [ ] Test student pages load correctly
- [ ] Test admin pages load correctly  
- [ ] Add subject permissions to users in Account Management
- [ ] Create lab configurations in Lab Management
- [ ] Test lab rendering pages work
- [ ] Test score pages display correctly
- [ ] Test admin test case management works
- [ ] Update navigation menus if needed
- [ ] Test authentication and authorization

## Template Selection Guide

| Subject Type | Use Template From | Notes |
|--------------|-------------------|-------|
| Programming (Java, C++, etc.) | ITCS123 | JUnit-style testing |
| Python | ITCS251 | Python-specific execution |
| SQL/Database | ITCS255 | SQL runner with multi-phase tests |
| Web Development | ITCS223 | HTML/CSS/JS rendering |
| Data Science | ITCS227 | Score tracking focus |
| General | Any | Basic lab structure |

## Troubleshooting

**Routes not loading:**
- Check file naming (lowercase folder names)
- Ensure layout.tsx and page.tsx exist in each folder
- Clear Next.js cache: `rm -rf .next && npm run dev`

**Permission errors:**
- Verify subject code in database matches route folder name (case-sensitive)
- Check user permissions in Account Management page
- Ensure subject is marked as visible in Subject Management

**Test cases not working:**
- Update API endpoint calls to use correct subject code
- Check test case structure matches subject type
- Verify database has proper test case schema for subject

## Additional Configuration

### Adding to Navigation Menu

If you have a main navigation menu, update it in `/src/components/` or wherever your navigation is defined.

### Adding Icons

The icon name from subject creation (e.g., 'Code', 'Database') should match Lucide React icon names. Import them in your page:

```typescript
import { Code, Database, Terminal, /* etc */ } from "lucide-react"
```

### Custom Styling

Each subject can have custom styling by using the gradient colors defined during subject creation. These are Tailwind CSS gradient classes that work with `bg-gradient-to-r`, `bg-gradient-to-br`, etc.

## Support

For issues or questions:
1. Check existing subject implementations as references
2. Verify database schema matches your needs
3. Review API endpoints for proper subject filtering
4. Check authentication middleware for route protection
