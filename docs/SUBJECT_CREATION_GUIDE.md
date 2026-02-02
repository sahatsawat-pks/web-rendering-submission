# Subject Creation Guide

This guide walks you through the complete process of adding a new subject to the Web Rendering Platform.

## Overview

Creating a new subject requires **two steps**:

1. **Database Entry** - Create subject via Admin UI (`/admin/subjects`)
2. **Frontend Configuration** - Add entry to `src/lib/subjectConfig.ts`

Both are required for a subject to function properly.

---

## Step 1: Create Database Entry

### Navigate to Admin UI

1. Login to the admin panel
2. Go to `/admin/subjects`
3. Click "Create Subject" button

### Fill in Basic Information

#### Required Fields

- **Subject Code**: Uppercase letters and numbers only (e.g., `ITCS999`)
  - ⚠️ Cannot be changed after creation
  - Must match exactly in config file (case-sensitive)
- **Subject Title**: Full name (e.g., "Advanced Web Development")

#### Optional Fields

- **Description**: Brief course description
- **Icon**: Choose from dropdown (Code, Database, Terminal, etc.)
- **Color Theme**: Select preset gradient or custom color
- **Visibility**: Toggle whether students can see this subject
- **Course Summary Link**: External link to course materials
- **Google Sheet ID**: For score integration

### Configure Grading Settings

#### Enable Grading Interface

Toggle this ON to enable the grading dashboard.

#### Select Grading Strategy

- **Lab & Challenge**: Default dual scoring system
- **Simple Score**: Manual 0-100 score entry
- **Python Automation**: Automated script execution
- **SQL Automation**: Database query validation
- **Java Automation**: JUnit test runner
- **Multi-Question Labs**: Multiple question inputs
- **Criteria Grading**: Ethics/Understanding/Reflection scoring

#### Additional Features

- **Quiz Management**: Enable quiz section
- **Test Cases**: Enable test runner for submissions

### Google Sheets Configuration

If using Google Sheets for scores:

- **Header Row**: Row number where column headers are (default: 1)
- **Column Pattern**: Regex to match lab columns (e.g., `^Lab\s*{labId}`)
- **Data Source Strategy**:
  - Single Sheet (default)
  - Tab per Section
  - Tab per Lab
- **Sheet Tabs**: Comma-separated tab names (if using tabs)

### Save

Click "Save" to create the subject in the database.

---

## Step 2: Add Frontend Configuration

After creating the database entry, you'll see a **warning modal** with a configuration template. Copy this template and add it to `src/lib/subjectConfig.ts`.

### Manual Configuration (if modal not available)

Open `src/lib/subjectConfig.ts` and add a new entry to the `subjectConfigs` object:

```typescript
'ITCS999': {
  code: 'ITCS999',
  title: 'Advanced Web Development',
  subtitle: 'Building Modern Applications',
  description: 'Learn to build scalable web applications',

  // Color Theme
  gradientFrom: 'from-blue-500',
  gradientTo: 'to-sky-500',
  bgGradient: 'from-blue-50 via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900',
  accentColor: 'text-blue-600 dark:text-blue-400',
  accentColorDark: 'text-blue-400',
  shadowColor: 'shadow-blue-500/30',
  iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
  iconColor: 'text-blue-600 dark:text-blue-400',

  // Blob Animation Colors
  blobColors: {
    one: 'bg-blue-300 dark:bg-blue-900',
    two: 'bg-sky-300 dark:bg-sky-900',
    three: 'bg-cyan-300 dark:bg-cyan-900'
  },

  // Features
  hasRendering: true,
  hasQuiz: true,
  hasTestRunner: false,
  testRunnerType: null,

  // Action Cards (customize based on your needs)
  cards: [
    {
      title: 'Viewing Submissions',
      subtitle: '',
      description: 'Browse and inspect web rendering submissions',
      icon: Monitor,
      href: '/itcs999/rendering',
      gradientFrom: 'from-blue-500/5',
      gradientTo: 'to-sky-500/5',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      shadowColor: 'shadow-blue-500/30'
    },
    {
      title: 'Check Lab Scores',
      subtitle: 'Lab Scores',
      description: 'View your grade status and feedback',
      href: '/itcs999/score',
      gradientFrom: 'from-teal-500/5',
      gradientTo: 'to-indigo-500/5',
      iconBg: 'bg-teal-500/10',
      iconColor: 'text-teal-600 dark:text-teal-400',
      shadowColor: 'shadow-teal-500/30'
    }
  ]
}
```

### Color Theme Guidelines

**Use consistent color families**:

- Same base color throughout (e.g., blue, purple, teal)
- Vary shades for visual hierarchy
- Ensure dark mode compatibility

**Standard Gradient Patterns**:

- `gradientFrom`: `from-{color}-500`
- `gradientTo`: `to-{color2}-500`
- Background: lighter shades with dark mode variants
- Accents: medium shades (600 for light, 400 for dark)

### Action Cards Configuration

Each card represents an action students can take:

**Common Cards**:

1. **Viewing Submissions** - Browse rendered submissions
2. **Check Lab Scores** - View grades (use teal-to-indigo gradient)
3. **Check Your Understanding** - Quiz section
4. **Run Test Cases** - For subjects with test runners

**Card Properties**:

- `title`: Main heading (can include `subtitle` for highlights)
- `subtitle`: Highlighted portion of title (optional)
- `description`: Brief explanation
- `icon`: Lucide icon component (import at top of file)
- `href`: Route path
- `gradientFrom/To`: Background gradient on hover
- `iconBg/Color`: Icon styling
- `shadowColor`: Hover shadow effect
- `isExternal`: Set `true` for external links

---

## Step 3: Verification

### Checklist

- [ ] Subject appears in `/admin/subjects` list
- [ ] Subject shows ✅ indicator (exists in both DB and config)
- [ ] Subject visible in admin dashboard (`/admin/dashboard`)
- [ ] Subject landing page loads (`/{subject-code}`)
- [ ] All action cards display correctly
- [ ] Colors and gradients render properly
- [ ] Dark mode looks good
- [ ] Grading interface works (if enabled)
- [ ] Test runner works (if enabled)

### Common Issues

**Subject not appearing on landing page**

- Check `isVisible` is `true` in database
- Verify code matches exactly (case-sensitive) between DB and config

**Colors not matching**

- Ensure `subjectConfig.ts` defines all color properties
- Check admin dashboard uses dynamic colors from config

**Cards not showing**

- Verify `hasRendering`, `hasQuiz`, etc. flags in config
- Check href paths are correct
- Ensure icons are imported

**Grading page empty**

- Verify `hasGradingInterface: true` in database
- Check grading type is set correctly
- Ensure Google Sheet ID is configured (if needed)

---

## Maintenance

### Updating a Subject

1. Edit database entry via `/admin/subjects` (for grading/visibility)
2. Edit `subjectConfig.ts` (for colors/cards/features)

### Deleting a Subject

1. Delete from `/admin/subjects` UI
2. Remove entry from `subjectConfig.ts`
3. Clear any associated lab data if needed

---

## Need Help?

- Check console for validation warnings in development mode
- Use "Copy Config Template" button in admin UI for quick setup
- Review existing subjects in `subjectConfig.ts` as examples
- Ensure subject codes match exactly between database and config
