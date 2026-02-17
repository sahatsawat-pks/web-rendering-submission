import { ArrowLeft, BookOpen, Presentation, Code, Terminal, BarChart3, Layers, Database, Smartphone } from "lucide-react"

export interface SubjectConfig {
  code: string
  title: string
  subtitle: string
  description: string
  // UI Styling
  gradientFrom: string
  gradientTo: string
  bgGradient: string
  iconBg: string
  iconColor: string
  shadowColor: string
  accentColor: string
  accentColorDark: string
  // Features
  hasRendering: boolean
  hasTestRunner: boolean
  hasScoreCheck: boolean
  hasQuiz: boolean
  hasCourseSummary: boolean
  courseSummaryLink?: string
  testRunnerType?: 'python' | 'java' | 'sql' | null
  testRunnerLabel?: string
  testRunnerIcon?: any
  testRunnerDescription?: string
  // Card configurations
  cards: SubjectCard[]
  grading?: {
    showCumulativeScore: boolean
    labWeight: number // Percentage (e.g. 15 for 15%)
    labMaxScore?: number // Hardcoded max score if needed, otherwise summed from labs
    useUniformLabScore?: boolean // When true, force all labs to use max score of 2
    challengeWeight?: number
    hasChallenge?: boolean
  }
  blobColors?: {
    one: string
    two: string
    three: string
  }
}

export interface SubjectCard {
  title: string
  subtitle?: string
  description: string
  href: string
  icon: any
  iconBg: string
  iconColor: string
  gradientFrom: string
  gradientTo: string
  shadowColor: string
  isExternal?: boolean
}

const subjectConfigs: Record<string, SubjectConfig> = {
  ITCS223: {
    code: "ITCS223",
    title: "ITCS223",
    subtitle: "Introduction to Web Development",
    description: "Choose to view student rendering submissions or check your lab scores.",
    gradientFrom: "from-cyan-500",
    gradientTo: "to-blue-500",
    bgGradient: "from-cyan-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/30",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    shadowColor: "shadow-cyan-500/20",
    accentColor: "text-cyan-600 dark:text-cyan-400",
    accentColorDark: "text-cyan-400",
    hasRendering: true,
    hasTestRunner: false,
    hasScoreCheck: true,
    hasQuiz: true,
    hasCourseSummary: false,
    cards: [
      {
        title: "Viewing Submissions",
        description: "Browse and inspect active web rendering submissions from students.",
        href: "/itcs223/rendering",
        icon: Presentation,
        iconBg: "bg-cyan-100 dark:bg-cyan-900/30",
        iconColor: "text-cyan-600 dark:text-cyan-400",
        gradientFrom: "from-cyan-500/5",
        gradientTo: "to-blue-500/5",
        shadowColor: "shadow-cyan-500/20"
      },
      {
        title: "Check Lab Scores",
        subtitle: "Lab Scores",
        description: "View your grade status, feedback, and lab completion progress.",
        href: "/itcs223/score",
        icon: BookOpen,
        iconBg: "bg-blue-100 dark:bg-blue-900/30",
        iconColor: "text-blue-600 dark:text-blue-400",
        gradientFrom: "from-teal-500/5",
        gradientTo: "to-indigo-500/5",
        shadowColor: "shadow-cyan-500/20"
      },
      {
        title: "Check Your Understanding",
        description: "Test your knowledge with quizzes for each lab.",
        href: "/itcs223/quiz",
        icon: null, // Will use SVG
        iconBg: "bg-teal-100 dark:bg-teal-900/30",
        iconColor: "text-teal-600 dark:text-teal-400",
        gradientFrom: "from-teal-500/5",
        gradientTo: "to-emerald-500/5",
        shadowColor: "shadow-teal-500/20"
      }
    ],
    grading: {
      showCumulativeScore: true,
      labWeight: 15,
      labMaxScore: 22
    },
    blobColors: {
      one: "bg-cyan-300 dark:bg-cyan-900",
      two: "bg-blue-300 dark:bg-blue-900",
      three: "bg-teal-300 dark:bg-teal-900"
    }
  },
  ITCS251: {
    code: "ITCS251",
    title: "ITCS251",
    subtitle: "Programming in Python",
    description: "Choose to run Python tests or check your lab scores.",
    gradientFrom: "from-blue-600",
    gradientTo: "to-sky-600",
    bgGradient: "from-blue-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    shadowColor: "shadow-blue-500/20",
    accentColor: "text-blue-600 dark:text-blue-400",
    accentColorDark: "text-blue-400",
    hasRendering: false,
    hasTestRunner: true,
    hasScoreCheck: true,
    hasQuiz: true,
    hasCourseSummary: false,
    testRunnerType: 'python',
    testRunnerLabel: "Python Test Runner",
    testRunnerIcon: Terminal,
    testRunnerDescription: "Execute and test your Python code with automated test cases.",
    cards: [
      {
        title: "Python Test Runner",
        description: "Execute and test your Python code with automated test cases.",
        href: "/itcs251/test-case",
        icon: Terminal,
        iconBg: "bg-blue-100 dark:bg-blue-900/30",
        iconColor: "text-blue-600 dark:text-blue-400",
        gradientFrom: "from-blue-500/5",
        gradientTo: "to-sky-500/5",
        shadowColor: "shadow-blue-500/20"
      },
      {
        title: "Check Lab Scores",
        subtitle: "Lab Scores",
        description: "View your grade status, feedback, and lab completion progress.",
        href: "/itcs251/score",
        icon: BookOpen,
        iconBg: "bg-red-100 dark:bg-red-900/30",
        iconColor: "text-red-600 dark:text-red-400",
        gradientFrom: "from-teal-500/5",
        gradientTo: "to-indigo-500/5",
        shadowColor: "shadow-blue-500/20"
      },
      {
        title: "Check Your Understanding",
        description: "Test your knowledge with quizzes for each lab.",
        href: "/itcs251/quiz",
        icon: null,
        iconBg: "bg-purple-100 dark:bg-purple-900/30",
        iconColor: "text-purple-600 dark:text-purple-400",
        gradientFrom: "from-purple-500/5",
        gradientTo: "to-pink-500/5",
        shadowColor: "shadow-purple-500/20"
      }
    ],
    grading: {
      showCumulativeScore: false,
      labWeight: 0
    },
    blobColors: {
      one: "bg-blue-300 dark:bg-blue-900",
      two: "bg-sky-300 dark:bg-sky-900",
      three: "bg-indigo-300 dark:bg-indigo-900"
    }
  },
  ITCS123: {
    code: "ITCS123",
    title: "ITCS123",
    subtitle: "Object Oriented Programming",
    description: "Choose to run Java tests or check your lab scores.",
    gradientFrom: "from-orange-600",
    gradientTo: "to-amber-600",
    bgGradient: "from-orange-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    iconColor: "text-orange-600 dark:text-orange-400",
    shadowColor: "shadow-orange-500/20",
    accentColor: "text-orange-600 dark:text-orange-400",
    accentColorDark: "text-orange-400",
    hasRendering: false,
    hasTestRunner: true,
    hasScoreCheck: true,
    hasQuiz: true,
    hasCourseSummary: true,
    courseSummaryLink: "https://kanzaki-aito.notion.site/ICT-1st-Year-2nd-2025-499db3618b5049a4aa2abb96188ee4ca",
    testRunnerType: 'java',
    testRunnerLabel: "Java Test Runner",
    testRunnerIcon: Terminal,
    testRunnerDescription: "Compile and run JUnit tests for your Java lab submissions.",
    cards: [
      {
        title: "Java Test Runner",
        description: "Compile and run JUnit tests for your Java lab submissions.",
        href: "/itcs123/test-case",
        icon: Terminal,
        iconBg: "bg-orange-100 dark:bg-orange-900/30",
        iconColor: "text-orange-600 dark:text-orange-400",
        gradientFrom: "from-orange-500/5",
        gradientTo: "to-amber-500/5",
        shadowColor: "shadow-orange-500/20"
      },
      {
        title: "Check Lab Scores",
        subtitle: "Lab Scores",
        description: "View your grade status, feedback, and lab completion progress.",
        href: "/itcs123/score",
        icon: BookOpen,
        iconBg: "bg-red-100 dark:bg-red-900/30",
        iconColor: "text-red-600 dark:text-red-400",
        gradientFrom: "from-teal-500/5",
        gradientTo: "to-indigo-500/5",
        shadowColor: "shadow-orange-500/20"
      },
      {
        title: "Check Your Understanding",
        description: "Test your knowledge with quizzes for each lab.",
        href: "/itcs123/quiz",
        icon: null,
        iconBg: "bg-purple-100 dark:bg-purple-900/30",
        iconColor: "text-purple-600 dark:text-purple-400",
        gradientFrom: "from-purple-500/5",
        gradientTo: "to-pink-500/5",
        shadowColor: "shadow-purple-500/20"
      },
      {
        title: "Course Summary",
        description: "Access course materials, notes, and summaries on Notion.",
        href: "https://kanzaki-aito.notion.site/ICT-1st-Year-2nd-2025-499db3618b5049a4aa2abb96188ee4ca",
        icon: Code,
        iconBg: "bg-blue-100 dark:bg-blue-900/30",
        iconColor: "text-blue-600 dark:text-blue-400",
        gradientFrom: "from-blue-500/5",
        gradientTo: "to-purple-500/5",
        shadowColor: "shadow-orange-500/20",
        isExternal: true
      }
    ],
    grading: {
      showCumulativeScore: true,
      labWeight: 20,
      hasChallenge: true
    },
    blobColors: {
      one: "bg-orange-300 dark:bg-orange-900",
      two: "bg-amber-300 dark:bg-amber-900",
      three: "bg-red-300 dark:bg-red-900"
    }
  },
  ITCS255: {
    code: "ITCS255",
    title: "ITCS255",
    subtitle: "Structured Query Language Essentials",
    description: "Choose to run SQL tests or check your lab scores.",
    gradientFrom: "from-purple-600",
    gradientTo: "to-pink-600",
    bgGradient: "from-purple-50 via-white to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
    shadowColor: "shadow-purple-500/20",
    accentColor: "text-purple-600 dark:text-purple-400",
    accentColorDark: "text-purple-400",
    hasRendering: false,
    hasTestRunner: true,
    hasScoreCheck: true,
    hasQuiz: true,
    hasCourseSummary: false,
    testRunnerType: 'sql',
    testRunnerLabel: "SQL Test Runner",
    testRunnerIcon: Database,
    testRunnerDescription: "Execute and validate SQL queries against test databases.",
    cards: [
      {
        title: "SQL Test Runner",
        description: "Execute and validate SQL queries against test databases.",
        href: "/itcs255/test-case",
        icon: Database,
        iconBg: "bg-purple-100 dark:bg-purple-900/30",
        iconColor: "text-purple-600 dark:text-purple-400",
        gradientFrom: "from-purple-500/5",
        gradientTo: "to-pink-500/5",
        shadowColor: "shadow-purple-500/20"
      },
      {
        title: "Check Lab Scores",
        subtitle: "Lab Scores",
        description: "View your grade status, feedback, and lab completion progress.",
        href: "/itcs255/score",
        icon: BookOpen,
        iconBg: "bg-blue-100 dark:bg-blue-900/30",
        iconColor: "text-blue-600 dark:text-blue-400",
        gradientFrom: "from-teal-500/5",
        gradientTo: "to-indigo-500/5",
        shadowColor: "shadow-purple-500/20"
      },
      {
        title: "Check Your Understanding",
        description: "Test your knowledge with quizzes for each lab.",
        href: "/itcs255/quiz",
        icon: null,
        iconBg: "bg-pink-100 dark:bg-pink-900/30",
        iconColor: "text-pink-600 dark:text-pink-400",
        gradientFrom: "from-pink-500/5",
        gradientTo: "to-rose-500/5",
        shadowColor: "shadow-purple-500/20"
      }
    ],
    grading: {
      showCumulativeScore: false,
      labWeight: 0
    },
    blobColors: {
      one: "bg-purple-300 dark:bg-purple-900",
      two: "bg-pink-300 dark:bg-pink-900",
      three: "bg-indigo-300 dark:bg-indigo-900"
    }
  },
  ITCS227: {
    code: "ITCS227",
    title: "ITCS227",
    subtitle: "Introduction to Data Science",
    description: "Check your lab scores and track your progress.",
    gradientFrom: "from-indigo-600",
    gradientTo: "to-violet-600",
    bgGradient: "from-teal-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    shadowColor: "shadow-indigo-500/20",
    accentColor: "text-indigo-600 dark:text-indigo-400",
    accentColorDark: "text-indigo-400",
    hasRendering: false,
    hasTestRunner: false,
    hasScoreCheck: true,
    hasQuiz: true,
    hasCourseSummary: false,
    cards: [
      {
        title: "Check Lab Scores",
        subtitle: "Lab Scores",
        description: "View your grade status, feedback, and lab completion progress.",
        href: "/itcs227/score",
        icon: BookOpen,
        iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        gradientFrom: "from-teal-500/5",
        gradientTo: "to-indigo-500/5",
        shadowColor: "shadow-indigo-500/20"
      },
      {
        title: "Check Your Understanding",
        description: "Test your knowledge with quizzes for each lab.",
        href: "/itcs227/quiz",
        icon: null,
        iconBg: "bg-purple-100 dark:bg-purple-900/30",
        iconColor: "text-purple-600 dark:text-purple-400",
        gradientFrom: "from-purple-500/5",
        gradientTo: "to-pink-500/5",
        shadowColor: "shadow-purple-500/20"
      }
    ],
    grading: {
      showCumulativeScore: true,
      labWeight: 20
    },
    blobColors: {
      one: "bg-teal-300 dark:bg-teal-900",
      two: "bg-cyan-300 dark:bg-cyan-900",
      three: "bg-blue-300 dark:bg-blue-900"
    }
  },
  ITGE162: {
    code: "ITGE162",
    title: "ITGE162",
    subtitle: "Physical Science and Computation",
    description: "Check your lab scores and track your progress.",
    gradientFrom: "from-emerald-600",
    gradientTo: "to-green-600",
    bgGradient: "from-emerald-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    shadowColor: "shadow-emerald-500/20",
    accentColor: "text-emerald-600 dark:text-emerald-400",
    accentColorDark: "text-emerald-400",
    hasRendering: false,
    hasTestRunner: false,
    hasScoreCheck: true,
    hasQuiz: true,
    hasCourseSummary: false,
    cards: [
      {
        title: "Check Lab Scores",
        subtitle: "Lab Scores",
        description: "View your grade status, feedback, and lab completion progress.",
        href: "/itge162/score",
        icon: BookOpen,
        iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        gradientFrom: "from-teal-500/5",
        gradientTo: "to-indigo-500/5",
        shadowColor: "shadow-emerald-500/20"
      },
      {
        title: "Check Your Understanding",
        description: "Test your knowledge with quizzes for each lab.",
        href: "/itge162/quiz",
        icon: null,
        iconBg: "bg-purple-100 dark:bg-purple-900/30",
        iconColor: "text-purple-600 dark:text-purple-400",
        gradientFrom: "from-purple-500/5",
        gradientTo: "to-pink-500/5",
        shadowColor: "shadow-purple-500/20"
      }
    ],
    grading: {
      showCumulativeScore: true,
      labWeight: 20
    },
    blobColors: {
      one: "bg-emerald-300 dark:bg-emerald-900",
      two: "bg-green-300 dark:bg-green-900",
      three: "bg-teal-300 dark:bg-teal-900"
    }
  },
  ITDS283: {
    code: "ITDS283",
    title: "ITDS283",
    subtitle: "Mobile Application Development",
    description: "Check your lab scores and track your progress.",
    gradientFrom: "from-rose-600",
    gradientTo: "to-red-600",
    bgGradient: "from-rose-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-600 dark:text-rose-400",
    shadowColor: "shadow-rose-500/20",
    accentColor: "text-rose-600 dark:text-rose-400",
    accentColorDark: "text-rose-400",
    hasRendering: false,
    hasTestRunner: false,
    hasScoreCheck: true,
    hasQuiz: true,
    hasCourseSummary: false,
    cards: [
      {
        title: "Check Lab Scores",
        subtitle: "Lab Scores",
        description: "View your grade status, feedback, and lab completion progress.",
        href: "/itds283/score",
        icon: BookOpen,
        iconBg: "bg-rose-100 dark:bg-rose-900/30",
        iconColor: "text-rose-600 dark:text-rose-400",
        gradientFrom: "from-teal-500/5",
        gradientTo: "to-indigo-500/5",
        shadowColor: "shadow-rose-500/20"
      },
      {
        title: "Check Your Understanding",
        description: "Test your knowledge with quizzes for each lab.",
        href: "/itds283/quiz",
        icon: null,
        iconBg: "bg-purple-100 dark:bg-purple-900/30",
        iconColor: "text-purple-600 dark:text-purple-400",
        gradientFrom: "from-purple-500/5",
        gradientTo: "to-pink-500/5",
        shadowColor: "shadow-purple-500/20"
      }
    ],
    grading: {
      showCumulativeScore: true,
      labWeight: 20,
      hasChallenge: true
    },
    blobColors: {
      one: "bg-rose-300 dark:bg-rose-900",
      two: "bg-red-300 dark:bg-red-900",
      three: "bg-pink-300 dark:bg-pink-900"
    }
  },
  ITCS113: {
    code: "ITCS113",
    title: "ITCS113",
    subtitle: "Programming Fundamentals",
    description: "Choose to run Python tests or check your lab scores.",
    gradientFrom: "from-yellow-500",
    gradientTo: "to-orange-500",
    bgGradient: "from-yellow-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    shadowColor: "shadow-yellow-500/20",
    accentColor: "text-yellow-600 dark:text-yellow-400",
    accentColorDark: "text-yellow-400",
    hasRendering: false,
    hasTestRunner: true,
    hasScoreCheck: true,
    hasQuiz: true,
    hasCourseSummary: false,
    testRunnerType: 'python',
    testRunnerLabel: "Python Test Runner",
    testRunnerIcon: Terminal,
    testRunnerDescription: "Execute and test your Python code with automated test cases.",
    cards: [
      {
        title: "Python Test Runner",
        description: "Execute and test your Python code with automated test cases.",
        href: "/itcs113/test-case",
        icon: Terminal,
        iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
        iconColor: "text-yellow-600 dark:text-yellow-400",
        gradientFrom: "from-yellow-500/5",
        gradientTo: "to-orange-500/5",
        shadowColor: "shadow-yellow-500/20"
      },
      {
        title: "Check Lab Scores",
        subtitle: "Lab Scores",
        description: "View your grade status, feedback, and lab completion progress.",
        href: "/itcs113/score",
        icon: BookOpen,
        iconBg: "bg-orange-100 dark:bg-orange-900/30",
        iconColor: "text-orange-600 dark:text-orange-400",
        gradientFrom: "from-orange-500/5",
        gradientTo: "to-amber-500/5",
        shadowColor: "shadow-yellow-500/20"
      },
      {
        title: "Check Your Understanding",
        description: "Test your knowledge with quizzes for each lab.",
        href: "/itcs113/quiz",
        icon: null,
        iconBg: "bg-amber-100 dark:bg-amber-900/30",
        iconColor: "text-amber-600 dark:text-amber-400",
        gradientFrom: "from-amber-500/5",
        gradientTo: "to-yellow-500/5",
        shadowColor: "shadow-yellow-500/20"
      }
    ],
    grading: {
      showCumulativeScore: false,
      labWeight: 0
    },
    blobColors: {
      one: "bg-yellow-300 dark:bg-yellow-900",
      two: "bg-orange-300 dark:bg-orange-900",
      three: "bg-amber-300 dark:bg-amber-900"
    }
  }
}

/**
 * Get subject configuration by code
 * @param code Subject code (e.g., 'ITCS223', 'itcs223')
 * @returns Subject configuration or null if not found
 */
export function getSubjectConfig(code: string): SubjectConfig | null {
  const upperCode = code.toUpperCase()
  return subjectConfigs[upperCode] || null
}

/**
 * Check if a subject code is valid (legacy sync version)
 * Checks only static config - use isValidSubjectAsync for dynamic subjects
 * @param code Subject code
 * @returns true if valid, false otherwise
 */
export function isValidSubject(code: string): boolean {
  return code.toUpperCase() in subjectConfigs
}

/**
 * Check if a subject code is valid (async version with database check)
 * Checks database first, then falls back to static config
 * @param code Subject code
 * @returns Promise<boolean> true if valid (exists in DB or static config)
 */
export async function isValidSubjectAsync(code: string): Promise<boolean> {
  const upperCode = code.toUpperCase()
  
  // First check static config (fast path)
  if (upperCode in subjectConfigs) {
    return true
  }
  
  // Then check database
  try {
    const response = await fetch(`/api/subjects?code=${upperCode}`)
    if (!response.ok) return false
    
    const data = await response.json()
    return data.success && data.subjects && data.subjects.length > 0
  } catch (error) {
    console.error(`Error checking subject validity for ${upperCode}:`, error)
    return false
  }
}

/**
 * Get all subject codes
 * @returns Array of subject codes
 */
export function getAllSubjectCodes(): string[] {
  return Object.keys(subjectConfigs)
}
