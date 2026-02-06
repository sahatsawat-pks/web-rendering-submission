import { Subject } from "@/lib/db"
import { SubjectConfig, SubjectCard } from "@/lib/subjectConfig"
import { getIconByName } from "@/lib/iconMap"

/**
 * Parses a color string (Tailwind classes or Hex) into gradient components
 */
function parseColorToComponents(color: string): {
  gradientFrom: string
  gradientTo: string
  baseColor: string
  secondaryColor: string
} {
  // If it's already a Tailwind gradient class
  if (color && color.includes('from-') && color.includes('to-')) {
    const fromMatch = color.match(/from-(\w+)-(\d+)/)
    const toMatch = color.match(/to-(\w+)-(\d+)/)
    
    // Default fallback if regex fails but basic structure exists
    const baseColor = fromMatch ? fromMatch[1] : 'blue'
    const secondaryColor = toMatch ? toMatch[1] : 'indigo'
    
    return {
      gradientFrom: fromMatch ? `from-${fromMatch[1]}-${fromMatch[2]}` : 'from-blue-500',
      gradientTo: toMatch ? `to-${toMatch[1]}-${toMatch[2]}` : 'to-indigo-500',
      baseColor,
      secondaryColor
    }
  }
  
  // If it's a hex color (simple fallback mapping)
  if (color && color.startsWith('#')) {
    // Simplified mapping for common hexes or default blue
    return {
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-sky-500',
      baseColor: 'blue',
      secondaryColor: 'sky'
    }
  }
  
  // Default fallback
  return {
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-sky-500',
    baseColor: 'blue',
    secondaryColor: 'sky'
  }
}

/**
 * Adapts a Database Subject object to the SubjectConfig interface
 * used by the frontend components.
 */
export function adaptSubjectConfig(subject: Subject): SubjectConfig {
  const { gradientFrom, gradientTo, baseColor, secondaryColor } = parseColorToComponents(subject.color)
  const codeLower = subject.code.toLowerCase()
  
  // Generate Cards
  const cards: SubjectCard[] = []

  // 1. Rendering / Submissions Card (if explicitly flagged or implied by subject logic if we had it)
  // Currently, `hasRendering` isn't a direct column in standard DB schema show in `generateSubjectConfigGenerator`,
  // but let's assume if it's ITCS223 it has it, or we rely on a flag if we added it.
  // The provided DB schema in `db.ts` doesn't strictly have `hasRendering`.
  // However, we can infer it or check if we added it.
  // For now, let's replicate the logic: ITCS223 has rendering. 
  // In a purely dynamic world, we might want a `has_rendering` column.
  // For now, hardcode based on code, OR check if we can add it to DB later.
  // SAFE FALLBACK: Check code.
  const hasRendering = subject.code === 'ITCS223'

  if (hasRendering) {
    cards.push({
      title: "Viewing Submissions",
      description: "Browse and inspect active web rendering submissions from students.",
      href: `/${codeLower}/rendering`,
      icon: getIconByName('Presentation'),
      iconBg: `bg-${baseColor}-100 dark:bg-${baseColor}-900/30`,
      iconColor: `text-${baseColor}-600 dark:text-${baseColor}-400`,
      gradientFrom: `from-${baseColor}-500/5`,
      gradientTo: `to-${secondaryColor}-500/5`,
      shadowColor: `shadow-${baseColor}-500/20`
    })
  }

  // 2. Test Runner Card
  if (subject.hasTestCases) {
    const runnerIconName = subject.gradingType === 'sql' ? 'Database' : 'Terminal'
    const runnerTitle = subject.gradingType === 'sql' 
      ? 'SQL Test Runner' 
      : subject.gradingType === 'java' 
      ? 'Java Test Runner' 
      : 'Python Test Runner'
    
    cards.push({
      title: runnerTitle,
      description: "Execute and test your code with automated test cases.",
      href: `/${codeLower}/test-case`,
      icon: getIconByName(runnerIconName),
      iconBg: `bg-${baseColor}-100 dark:bg-${baseColor}-900/30`,
      iconColor: `text-${baseColor}-600 dark:text-${baseColor}-400`,
      gradientFrom: `from-${baseColor}-500/5`,
      gradientTo: `to-${secondaryColor}-500/5`,
      shadowColor: `shadow-${baseColor}-500/20`
    })
  }

  // 3. Lab Scores Card (Always included if there is a grading interface)
  if (subject.hasGradingInterface) { // hasGradingInterface implies existence of scores
     cards.push({
      title: "Check Lab Scores",
      subtitle: "Lab Scores",
      description: "View your grade status, feedback, and lab completion progress.",
      href: `/${codeLower}/score`,
      icon: getIconByName('BookOpen'),
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      gradientFrom: "from-teal-500/5",
      gradientTo: "to-indigo-500/5",
      shadowColor: `shadow-${baseColor}-500/20`
    })
  }

  // 4. Quiz Card
  if (subject.hasQuizManagement || subject.quizSectionEnabled) {
    cards.push({
        title: "Check Your Understanding",
        description: "Test your knowledge with quizzes for each lab.",
        href: `/${codeLower}/quiz`,
        icon: null, // Component will use SVG fallback
        iconBg: "bg-purple-100 dark:bg-purple-900/30",
        iconColor: "text-purple-600 dark:text-purple-400",
        gradientFrom: "from-purple-500/5",
        gradientTo: "to-pink-500/5",
        shadowColor: "shadow-purple-500/20"
    })
  }

  // 5. Course Summary Card
  if (subject.courseSummaryLink) {
    cards.push({
        title: "Course Summary",
        description: "Access course materials, notes, and summaries.",
        href: subject.courseSummaryLink,
        icon: getIconByName('Code'),
        iconBg: "bg-orange-100 dark:bg-orange-900/30",
        iconColor: "text-orange-600 dark:text-orange-400",
        gradientFrom: "from-orange-500/5",
        gradientTo: "to-amber-500/5",
        shadowColor: "shadow-orange-500/20",
        isExternal: true
    })
  }

  return {
    code: subject.code,
    title: subject.title,
    subtitle: subject.title, // Map title (Name) to subtitle for display
    description: subject.description || 'Access your course materials and tools.',
    
    // UI Styling
    gradientFrom,
    gradientTo,
    bgGradient: `from-${baseColor}-50 via-white to-${secondaryColor}-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950`, // Approximate reconstruction
    iconBg: `bg-${baseColor}-100 dark:bg-${baseColor}-900/30`,
    iconColor: `text-${baseColor}-600 dark:text-${baseColor}-400`,
    shadowColor: `shadow-${baseColor}-500/20`,
    accentColor: `text-${baseColor}-600 dark:text-${baseColor}-400`,
    accentColorDark: `text-${baseColor}-400`,
    
    // Features
    hasRendering,
    hasTestRunner: subject.hasTestCases,
    hasScoreCheck: true, // Generally true
    hasQuiz: subject.hasQuizManagement,
    hasCourseSummary: !!subject.courseSummaryLink,
    courseSummaryLink: subject.courseSummaryLink,
    
    testRunnerType: subject.gradingType as any,
    testRunnerLabel: `${subject.gradingType} Runner`, // Simplification
    testRunnerIcon: getIconByName(subject.gradingType === 'sql' ? 'Database' : 'Terminal'),
    
    cards,
    
    // Grading - using database values or defaults
    grading: {
      showCumulativeScore: true,
      labWeight: subject.labWeight || 20, // Use database value or default
      labMaxScore: subject.labMaxScore || undefined, // Use database value or undefined for auto-calculate
      hasChallenge: subject.gradingType === 'lab_challenge' // Enable challenge grading for lab_challenge type
    },
    
    // Blob colors - deriving from base color
    blobColors: {
      one: `bg-${baseColor}-300 dark:bg-${baseColor}-900`,
      two: `bg-${secondaryColor}-300 dark:bg-${secondaryColor}-900`,
      three: `bg-${baseColor}-200 dark:bg-${baseColor}-800`
    }
  }
}
