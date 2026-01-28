/**
 * Subject Configuration Template Generator
 * 
 * Generates TypeScript configuration templates for new subjects
 * based on their database configuration.
 */

interface Subject {
  id: number
  code: string
  title: string
  description: string
  icon: string
  color: string
  isVisible: boolean
  displayOrder: number
  hasGradingInterface: boolean
  hasQuizManagement: boolean
  hasTestCases: boolean
  gradingType: string | null
  courseSummaryLink?: string
  googleSheetId?: string
}

/**
 * Maps database color values to Tailwind gradient classes
 */
function parseColorToGradient(color: string): {
  gradientFrom: string
  gradientTo: string
  baseColor: string
  secondaryColor: string
} {
  // If it's already a Tailwind gradient class
  if (color.includes('from-') && color.includes('to-')) {
    const fromMatch = color.match(/from-(\w+)-(\d+)/)
    const toMatch = color.match(/to-(\w+)-(\d+)/)
    
    const baseColor = fromMatch ? fromMatch[1] : 'blue'
    const secondaryColor = toMatch ? toMatch[1] : 'indigo'
    
    return {
      gradientFrom: fromMatch ? `from-${fromMatch[1]}-${fromMatch[2]}` : 'from-blue-500',
      gradientTo: toMatch ? `to-${toMatch[1]}-${toMatch[2]}` : 'to-indigo-500',
      baseColor,
      secondaryColor
    }
  }
  
  // If it's a hex color, map to closest color family
  if (color.startsWith('#')) {
    const colorMapping: Record<string, {from: string, to: string, base: string, secondary: string}> = {
      '#3b82f6': { from: 'from-blue-500', to: 'to-sky-500', base: 'blue', secondary: 'sky' },
      '#8b5cf6': { from: 'from-purple-500', to: 'to-pink-500', base: 'purple', secondary: 'pink' },
      '#f97316': { from: 'from-orange-500', to: 'to-amber-500', base: 'orange', secondary: 'amber' },
      '#14b8a6': { from: 'from-teal-500', to: 'to-cyan-500', base: 'teal', secondary: 'cyan' },
      '#6366f1': { from: 'from-indigo-500', to: 'to-violet-500', base: 'indigo', secondary: 'violet' },
      '#10b981': { from: 'from-emerald-500', to: 'to-green-500', base: 'emerald', secondary: 'green' },
      '#f43f5e': { from: 'from-rose-500', to: 'to-red-500', base: 'rose', secondary: 'red' }
    }
    
    const mapped = colorMapping[color.toLowerCase()] || colorMapping['#3b82f6']
    return {
      gradientFrom: mapped.from,
      gradientTo: mapped.to,
      baseColor: mapped.base,
      secondaryColor: mapped.secondary
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
 * Generates action cards based on enabled features
 */
function generateCards(subject: Subject, colors: ReturnType<typeof parseColorToGradient>): string {
  const { code } = subject
  const { baseColor, secondaryColor } = colors
  const lowerCode = code.toLowerCase()
  
  const cards: string[] = []
  
  // Always include viewing submissions card (if rendering exists)
  cards.push(`    {
      title: 'Viewing Submissions',
      subtitle: '',
      description: 'Browse and inspect active web rendering submissions from students.',
      icon: Monitor,
      href: '/${lowerCode}/rendering',
      gradientFrom: 'from-${baseColor}-500/5',
      gradientTo: 'to-${secondaryColor}-500/5',
      iconBg: 'bg-${baseColor}-500/10',
      iconColor: 'text-${baseColor}-600 dark:text-${baseColor}-400',
      shadowColor: 'shadow-${baseColor}-500/30'
    }`)
  
  // Lab scores card (standard across all subjects)
  cards.push(`    {
      title: 'Check Lab Scores',
      subtitle: 'Lab Scores',
      description: 'View your grade status, feedback, and lab completion progress.',
      href: '/${lowerCode}/score',
      gradientFrom: 'from-teal-500/5',
      gradientTo: 'to-indigo-500/5',
      iconBg: 'bg-teal-500/10',
      iconColor: 'text-teal-600 dark:text-teal-400',
      shadowColor: 'shadow-teal-500/30'
    }`)
  
  // Quiz card (if quiz management enabled)
  if (subject.hasQuizManagement) {
    cards.push(`    {
      title: 'Check Your Understanding',
      subtitle: 'Your Understanding',
      description: 'Test your knowledge with quizzes for each lab.',
      href: '/${lowerCode}/quiz',
      gradientFrom: 'from-purple-500/5',
      gradientTo: 'to-pink-500/5',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400',
      shadowColor: 'shadow-purple-500/30'
    }`)
  }
  
  // Test runner card (if test cases enabled)
  if (subject.hasTestCases) {
    cards.push(`    {
      title: 'Run Test Cases',
      subtitle: 'Test Cases',
      description: 'Execute automated tests for your submissions.',
      icon: Play,
      href: '/${lowerCode}/test-case',
      gradientFrom: 'from-green-500/5',
      gradientTo: 'to-emerald-500/5',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-400',
      shadowColor: 'shadow-green-500/30'
    }`)
  }
  
  return cards.join(',\n')
}

/**
 * Generates the complete TypeScript configuration for a subject
 */
export function generateSubjectConfigTemplate(subject: Subject): string {
  const colors = parseColorToGradient(subject.color)
  const { baseColor, secondaryColor, gradientFrom, gradientTo } = colors
  const lowerCode = subject.code.toLowerCase()
  
  // Determine test runner configuration
  let testRunnerType = 'null'
  let testRunnerConfig = ''
  
  if (subject.hasTestCases && subject.gradingType) {
    const typeMap: Record<string, string> = {
      'python': "'python'",
      'sql': "'sql'",
      'java': "'java'"
    }
    testRunnerType = typeMap[subject.gradingType] || 'null'
    
    if (testRunnerType !== 'null') {
      testRunnerConfig = `
  // Test Runner Configuration
  testRunnerConfig: {
    showTestOutput: true,
    allowMultipleRuns: true,
    timeoutSeconds: 30
  },`
    }
  }
  
  const cards = generateCards(subject, colors)
  
  const template = `
  '${subject.code}': {
    code: '${subject.code}',
    title: '${subject.title}',
    subtitle: '${subject.description || 'Modern Development'}',
    description: '${subject.description || 'Choose to view student rendering submissions or check your lab scores.'}',
    
    // Color Theme
    gradientFrom: '${gradientFrom}',
    gradientTo: '${gradientTo}',
    bgGradient: 'from-${baseColor}-50 via-${secondaryColor}-50 to-${baseColor}-50 dark:from-slate-900 dark:via-${baseColor}-950 dark:to-slate-900',
    accentColor: 'text-${baseColor}-600 dark:text-${baseColor}-400',
    accentColorDark: 'text-${baseColor}-400',
    shadowColor: 'shadow-${baseColor}-500/30',
    iconBg: 'bg-${baseColor}-500/10 dark:bg-${baseColor}-500/20',
    iconColor: 'text-${baseColor}-600 dark:text-${baseColor}-400',
    
    // Blob Animation Colors
    blobColors: {
      one: 'bg-${baseColor}-300 dark:bg-${baseColor}-900',
      two: 'bg-${secondaryColor}-300 dark:bg-${secondaryColor}-900',
      three: 'bg-${baseColor}-200 dark:bg-${baseColor}-800'
    },
    
    // Features
    hasRendering: true,  // TODO: Verify if this subject has submission rendering
    hasQuiz: ${subject.hasQuizManagement},
    hasTestRunner: ${subject.hasTestCases},
    testRunnerType: ${testRunnerType},${testRunnerConfig}
    
    // Action Cards
    cards: [
${cards}
    ]
  }`.trim()
  
  return template
}

/**
 * Generates a simple copy-paste ready template with instructions
 */
export function generateQuickTemplate(subject: Subject): string {
  const config = generateSubjectConfigTemplate(subject)
  
  return `
// ==============================================
// Configuration for ${subject.code}
// Copy this into src/lib/subjectConfig.ts
// ==============================================

// 1. Add necessary icon imports at the top of the file (if not already present):
import { Monitor, Play } from 'lucide-react'

// 2. Add this entry to the subjectConfigs object:
${config}

// 3. Review and customize:
//    - Verify hasRendering flag
//    - Adjust card descriptions
//    - Add/remove cards as needed
//    - Test dark mode appearance
`.trim()
}

/**
 * Checks if a subject exists in the config
 */
export function checkSubjectInConfig(subjectCode: string, configCodes: string[]): boolean {
  return configCodes.includes(subjectCode.toUpperCase())
}

/**
 * Validates sync between database subjects and config
 */
export function validateSubjectSync(
  dbSubjects: Subject[],
  configCodes: string[]
): {
  inDbOnly: string[]
  inConfigOnly: string[]
  synced: string[]
} {
  const dbCodes = dbSubjects.map(s => s.code.toUpperCase())
  const configCodesUpper = configCodes.map(c => c.toUpperCase())
  
  return {
    inDbOnly: dbCodes.filter(code => !configCodesUpper.includes(code)),
    inConfigOnly: configCodesUpper.filter(code => !dbCodes.includes(code)),
    synced: dbCodes.filter(code => configCodesUpper.includes(code))
  }
}
