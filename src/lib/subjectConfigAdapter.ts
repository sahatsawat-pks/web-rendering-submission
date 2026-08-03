import { Subject } from "@/lib/db"
import { SubjectConfig, SubjectCard } from "@/lib/subjectConfig"
import { getIconByName } from "@/lib/iconMap"

/**
 * Maps Tailwind color names to RGB values for shadows
 */
const colorMap: Record<string, string> = {
  lime: '132, 204, 22',
  green: '34, 197, 94',
  blue: '59, 130, 246',
  indigo: '99, 102, 241',
  purple: '168, 85, 247',
  pink: '236, 72, 153',
  red: '239, 68, 68',
  orange: '249, 115, 22',
  amber: '245, 158, 11',
  yellow: '234, 179, 8',
  emerald: '16, 185, 129',
  teal: '20, 184, 166',
  cyan: '6, 182, 212',
  sky: '14, 165, 233',
  rose: '244, 63, 94',
  slate: '100, 116, 139',
  gray: '107, 114, 128',
  fuchsia: '217, 70, 239',
  violet: '139, 92, 246',
}

function getShadowColor(colorName: string, opacity: number = 0.2): string {
  const rgb = colorMap[colorName] || colorMap.blue
  return `rgba(${rgb}, ${opacity})`
}

function getBgGradient(baseColor: string, secondaryColor: string): string {
  const map: Record<string, string> = {
    blue: 'from-blue-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    purple: 'from-purple-50 via-white to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    orange: 'from-orange-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    teal: 'from-teal-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    indigo: 'from-indigo-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    emerald: 'from-emerald-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    rose: 'from-rose-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    slate: 'from-slate-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    fuchsia: 'from-fuchsia-50 via-white to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    violet: 'from-violet-50 via-white to-fuchsia-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    cyan: 'from-cyan-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    lime: 'from-lime-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    yellow: 'from-yellow-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
  }
  return map[baseColor] || `from-blue-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950`
}

function getIconBg(color: string): string {
  const map: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    purple: 'bg-purple-100 dark:bg-purple-900/30',
    orange: 'bg-orange-100 dark:bg-orange-900/30',
    teal: 'bg-teal-100 dark:bg-teal-900/30',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30',
    rose: 'bg-rose-100 dark:bg-rose-900/30',
    slate: 'bg-slate-100 dark:bg-slate-900/30',
    fuchsia: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
    violet: 'bg-violet-100 dark:bg-violet-900/30',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/30',
    lime: 'bg-lime-100 dark:bg-lime-900/30',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30',
    green: 'bg-green-100 dark:bg-green-900/30',
    sky: 'bg-sky-100 dark:bg-sky-900/30',
    amber: 'bg-amber-100 dark:bg-amber-900/30',
    red: 'bg-red-100 dark:bg-red-900/30',
    gray: 'bg-gray-100 dark:bg-gray-900/30',
    pink: 'bg-pink-100 dark:bg-pink-900/30',
  }
  return map[color] || 'bg-blue-100 dark:bg-blue-900/30'
}

function getIconColor(color: string): string {
  const map: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    teal: 'text-teal-600 dark:text-teal-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    rose: 'text-rose-600 dark:text-rose-400',
    slate: 'text-slate-600 dark:text-slate-400',
    fuchsia: 'text-fuchsia-600 dark:text-fuchsia-400',
    violet: 'text-violet-600 dark:text-violet-400',
    cyan: 'text-cyan-600 dark:text-cyan-400',
    lime: 'text-lime-600 dark:text-lime-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    green: 'text-green-600 dark:text-green-400',
    sky: 'text-sky-600 dark:text-sky-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    gray: 'text-gray-600 dark:text-gray-400',
    pink: 'text-pink-600 dark:text-pink-400',
  }
  return map[color] || 'text-blue-600 dark:text-blue-400'
}

function getAccentColorDark(color: string): string {
  const map: Record<string, string> = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    teal: 'text-teal-400',
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
    slate: 'text-slate-400',
    fuchsia: 'text-fuchsia-400',
    violet: 'text-violet-400',
    cyan: 'text-cyan-400',
    lime: 'text-lime-400',
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    sky: 'text-sky-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
    pink: 'text-pink-400',
  }
  return map[color] || 'text-blue-400'
}

function getGradientFrom5(color: string): string {
  const map: Record<string, string> = {
    blue: 'from-blue-500/5',
    purple: 'from-purple-500/5',
    orange: 'from-orange-500/5',
    teal: 'from-teal-500/5',
    indigo: 'from-indigo-500/5',
    emerald: 'from-emerald-500/5',
    rose: 'from-rose-500/5',
    slate: 'from-slate-500/5',
    fuchsia: 'from-fuchsia-500/5',
    violet: 'from-violet-500/5',
    cyan: 'from-cyan-500/5',
    lime: 'from-lime-500/5',
    yellow: 'from-yellow-500/5',
    green: 'from-green-500/5',
    sky: 'from-sky-500/5',
    amber: 'from-amber-500/5',
    red: 'from-red-500/5',
    gray: 'from-gray-500/5',
    pink: 'from-pink-500/5',
  }
  return map[color] || 'from-blue-500/5'
}

function getGradientTo5(color: string): string {
  const map: Record<string, string> = {
    blue: 'to-blue-500/5',
    purple: 'to-purple-500/5',
    orange: 'to-orange-500/5',
    teal: 'to-teal-500/5',
    indigo: 'to-indigo-500/5',
    emerald: 'to-emerald-500/5',
    rose: 'to-rose-500/5',
    slate: 'to-slate-500/5',
    fuchsia: 'to-fuchsia-500/5',
    violet: 'to-violet-500/5',
    cyan: 'to-cyan-500/5',
    lime: 'to-lime-500/5',
    yellow: 'to-yellow-500/5',
    green: 'to-green-500/5',
    sky: 'to-sky-500/5',
    amber: 'to-amber-500/5',
    red: 'to-red-500/5',
    gray: 'to-gray-500/5',
    pink: 'to-pink-500/5',
  }
  return map[color] || 'to-indigo-500/5'
}

function getBlobColors(baseColor: string, secondaryColor: string) {
  const mapOne: Record<string, string> = {
    blue: 'bg-blue-300 dark:bg-blue-900',
    purple: 'bg-purple-300 dark:bg-purple-900',
    orange: 'bg-orange-300 dark:bg-orange-900',
    teal: 'bg-teal-300 dark:bg-teal-900',
    indigo: 'bg-indigo-300 dark:bg-indigo-900',
    emerald: 'bg-emerald-300 dark:bg-emerald-900',
    rose: 'bg-rose-300 dark:bg-rose-900',
    slate: 'bg-slate-300 dark:bg-slate-900',
    fuchsia: 'bg-fuchsia-300 dark:bg-fuchsia-900',
    violet: 'bg-violet-300 dark:bg-violet-900',
    cyan: 'bg-cyan-300 dark:bg-cyan-900',
    lime: 'bg-lime-300 dark:bg-lime-900',
    yellow: 'bg-yellow-300 dark:bg-yellow-900',
    green: 'bg-green-300 dark:bg-green-900',
    sky: 'bg-sky-300 dark:bg-sky-900',
    amber: 'bg-amber-300 dark:bg-amber-900',
    red: 'bg-red-300 dark:bg-red-900',
    gray: 'bg-gray-300 dark:bg-gray-900',
    pink: 'bg-pink-300 dark:bg-pink-900',
  }
  const mapThree: Record<string, string> = {
    blue: 'bg-blue-200 dark:bg-blue-800',
    purple: 'bg-purple-200 dark:bg-purple-800',
    orange: 'bg-orange-200 dark:bg-orange-800',
    teal: 'bg-teal-200 dark:bg-teal-800',
    indigo: 'bg-indigo-200 dark:bg-indigo-800',
    emerald: 'bg-emerald-200 dark:bg-emerald-800',
    rose: 'bg-rose-200 dark:bg-rose-800',
    slate: 'bg-slate-200 dark:bg-slate-800',
    fuchsia: 'bg-fuchsia-200 dark:bg-fuchsia-800',
    violet: 'bg-violet-200 dark:bg-violet-800',
    cyan: 'bg-cyan-200 dark:bg-cyan-800',
    lime: 'bg-lime-200 dark:bg-lime-800',
    yellow: 'bg-yellow-200 dark:bg-yellow-800',
    green: 'bg-green-200 dark:bg-green-800',
    sky: 'bg-sky-200 dark:bg-sky-800',
    amber: 'bg-amber-200 dark:bg-amber-800',
    red: 'bg-red-200 dark:bg-red-800',
    gray: 'bg-gray-200 dark:bg-gray-800',
    pink: 'bg-pink-200 dark:bg-pink-800',
  }

  return {
    one: mapOne[baseColor] || 'bg-blue-300 dark:bg-blue-900',
    two: mapOne[secondaryColor] || 'bg-sky-300 dark:bg-sky-900',
    three: mapThree[baseColor] || 'bg-blue-200 dark:bg-blue-800',
  }
}

function parseColorToComponents(color: string): {
  gradientFrom: string
  gradientTo: string
  baseColor: string
  secondaryColor: string
} {
  if (color && color.includes('from-') && color.includes('to-')) {
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
  
  if (color && color.startsWith('#')) {
    return {
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-sky-500',
      baseColor: 'blue',
      secondaryColor: 'sky'
    }
  }
  
  return {
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-sky-500',
    baseColor: 'blue',
    secondaryColor: 'sky'
  }
}

export function adaptSubjectConfig(subject: Subject): SubjectConfig {
  const { gradientFrom, gradientTo, baseColor, secondaryColor } = parseColorToComponents(subject.color)
  const codeLower = subject.code.toLowerCase()
  const displayCode = subject.displaySubjectId || subject.code
  
  const cards: SubjectCard[] = []
  const hasRendering = subject.code === 'ITCS223'

  if (hasRendering) {
    cards.push({
      title: "Viewing Submissions",
      description: "Browse and inspect active web rendering submissions from students.",
      href: `/${codeLower}/rendering`,
      icon: getIconByName('Presentation'),
      iconBg: getIconBg(baseColor),
      iconColor: getIconColor(baseColor),
      gradientFrom: getGradientFrom5(baseColor),
      gradientTo: getGradientTo5(secondaryColor),
      shadowColor: `[box-shadow:0_4px_14px_0_${getShadowColor(baseColor)}]`
    })
  }

  if (subject.hasTestCases) {
    const runnerIconName = subject.gradingType === 'sql' ? 'Database' : 'Terminal'
    
    if (subject.gradingType === 'lab_challenge') {
      cards.push({
        title: "Java Test Runner - Labs",
        description: "Compile and run JUnit tests for your Java lab submissions.",
        href: `/${codeLower}/test-case`,
        icon: getIconByName(runnerIconName),
        iconBg: getIconBg(baseColor),
        iconColor: getIconColor(baseColor),
        gradientFrom: getGradientFrom5(baseColor),
        gradientTo: getGradientTo5(secondaryColor),
        shadowColor: `[box-shadow:0_4px_14px_0_${getShadowColor(baseColor)}]`
      })
      
      cards.push({
        title: "Java Test Runner - Challenges",
        description: "Test your advanced Java problem-solving skills.",
        href: `/${codeLower}/test-case`,
        icon: getIconByName(runnerIconName),
        iconBg: getIconBg(baseColor),
        iconColor: getIconColor(baseColor),
        gradientFrom: getGradientFrom5(baseColor),
        gradientTo: getGradientTo5(secondaryColor),
        shadowColor: `[box-shadow:0_4px_14px_0_${getShadowColor(baseColor)}]`
      })
    } else {
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
        iconBg: getIconBg(baseColor),
        iconColor: getIconColor(baseColor),
        gradientFrom: getGradientFrom5(baseColor),
        gradientTo: getGradientTo5(secondaryColor),
        shadowColor: `[box-shadow:0_4px_14px_0_${getShadowColor(baseColor)}]`
      })
    }
  }

  if (subject.hasGradingInterface) {
     cards.push({
      title: "Check Lab Scores",
      subtitle: "Lab Scores",
      description: "View your grade status, feedback, and lab completion progress.",
      href: `/${codeLower}/score`,
      icon: getIconByName('BookOpen'),
      iconBg: getIconBg(baseColor),
      iconColor: getIconColor(baseColor),
      gradientFrom: getGradientFrom5(baseColor),
      gradientTo: getGradientTo5(secondaryColor),
      shadowColor: `[box-shadow:0_4px_14px_0_${getShadowColor(baseColor)}]`
    })
  }

  if (subject.hasQuizManagement && subject.quizSectionEnabled) {
    cards.push({
        title: "Check Your Understanding",
        description: "Test your knowledge with quizzes for each lab.",
        href: `/${codeLower}/quiz`,
        icon: null,
        iconBg: getIconBg(secondaryColor),
        iconColor: getIconColor(secondaryColor),
        gradientFrom: getGradientFrom5(secondaryColor),
        gradientTo: getGradientTo5(baseColor),
        shadowColor: `[box-shadow:0_4px_14px_0_${getShadowColor(secondaryColor)}]`
    })
  }

  if (subject.courseSummaryLink) {
    cards.push({
        title: "Course Summary",
        description: "Access course materials, notes, and summaries.",
        href: subject.courseSummaryLink,
        icon: getIconByName('Code'),
        iconBg: getIconBg(baseColor),
        iconColor: getIconColor(baseColor),
        gradientFrom: getGradientFrom5(baseColor),
        gradientTo: getGradientTo5(secondaryColor),
        shadowColor: `[box-shadow:0_4px_14px_0_${getShadowColor(baseColor)}]`,
        isExternal: true
    })
  }

  return {
    code: displayCode,
    aliases: subject.aliases || [],
    title: subject.title,
    subtitle: subject.title,
    description: subject.description || 'Access your course materials and tools.',
    
    gradientFrom,
    gradientTo,
    bgGradient: getBgGradient(baseColor, secondaryColor),
    iconBg: getIconBg(baseColor),
    iconColor: getIconColor(baseColor),
    shadowColor: `[box-shadow:0_4px_14px_0_${getShadowColor(baseColor)}]`,
    accentColor: getIconColor(baseColor),
    accentColorDark: getAccentColorDark(baseColor),
    
    hasRendering,
    hasTestRunner: subject.hasTestCases,
    hasScoreCheck: true,
    hasQuiz: subject.hasQuizManagement,
    hasCourseSummary: !!subject.courseSummaryLink,
    courseSummaryLink: subject.courseSummaryLink,
    
    testRunnerType: subject.gradingType === 'lab_challenge' ? 'java' : subject.gradingType as any,
    testRunnerLabel: subject.gradingType === 'lab_challenge' 
      ? "Java Test Runner" 
      : subject.gradingType 
        ? `${subject.gradingType.charAt(0).toUpperCase() + subject.gradingType.slice(1)} Test Runner`
        : "Test Runner",
    testRunnerIcon: getIconByName(subject.gradingType === 'sql' ? 'Database' : 'Terminal'),
    
    cards,
    
    grading: {
      showCumulativeScore: true,
      labWeight: subject.labWeight || 20,
      labMaxScore: subject.labMaxScore || undefined,
      useUniformLabScore: subject.useUniformLabScore ?? true,
      hasChallenge: subject.gradingType === 'lab_challenge'
    },
    
    blobColors: getBlobColors(baseColor, secondaryColor)
  }
}
