"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { ArrowLeft, Download, RefreshCw, Users, Table as TableIcon, Filter, X, MessageSquare, Trash2 } from "lucide-react"
import { getGradientStyleProps } from "@/lib/colors"
import { FeedbackModal } from "@/components/FeedbackModal"
import { AlertDialog } from "@/components/AlertDialog"

interface StudentScore {
  [key: string]: any
  username?: string
  ID?: string
  studentId?: string
  name?: string
  Name?: string
  surname?: string
  Surname?: string
  Section?: string
  section?: string
}

interface FeedbackModalState {
  isOpen: boolean
  studentId: string
  studentName: string
  labNumber: string
  labTitle: string
}

interface ScoreCellProps {
  readonly student: StudentScore
  readonly columnName: string
  readonly displayValue: string
  readonly cellClasses: string
  readonly onOpenFeedback: (student: StudentScore, columnName: string) => void
  readonly feedbackComment?: string
  readonly onDeleteClick?: (studentId: string, labNumber: string, columnName: string) => void
}

function ScoreCell({ student, columnName, displayValue, cellClasses, onOpenFeedback, feedbackComment, onDeleteClick }: ScoreCellProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const cellRef = useRef<HTMLTableCellElement>(null)
  const hasFeedback = feedbackComment && feedbackComment.trim().length > 0
  
  const handleMouseEnter = () => {
    if (hasFeedback && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect()
      setTooltipPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2
      })
      setShowTooltip(true)
    }
  }
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const labNum = /:Lab\s*(\d+)/i.exec(columnName)?.[1] || /(\d+)/.exec(columnName)?.[1]
    if (labNum && onDeleteClick) {
      onDeleteClick(student.username || student.ID || student.studentId || '', labNum, columnName)
    }
  }

  return (
    <td 
      ref={cellRef}
      className={`${cellClasses} relative group`}
      onClick={() => onOpenFeedback(student, columnName)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {displayValue}
      
      {/* Triangle indicator for feedback - top right corner */}
      {hasFeedback && (
        <div className="absolute top-0 right-0 w-0 h-0 border-l-8 border-b-8 border-l-transparent border-b-red-500 dark:border-b-red-400 rounded-tl-sm animate-pulse"></div>
      )}
      
      {/* Delete button on hover */}
      {hasFeedback && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded bg-red-600 hover:bg-red-700 text-white shadow-lg z-40 hover:scale-110 active:scale-95 duration-150"
          title="Delete feedback"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}

      {/* Fade-in/out tooltip on hover with animation - using fixed positioning to avoid clipping */}
      {showTooltip && hasFeedback && (
        <div className="fixed z-50 bg-slate-900 dark:bg-slate-950 text-white dark:text-slate-100 text-xs rounded-lg p-3 max-w-xs whitespace-normal break-words shadow-xl border border-slate-700 dark:border-slate-600 pointer-events-none animate-fade-in-slide"
          style={{ 
            animation: 'fadeInSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            left: `${tooltipPos.left}px`,
            top: `${tooltipPos.top}px`,
            transform: 'translate(-50%, -100%)'
          }}>
          {feedbackComment}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-950"></div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translate(-50%, calc(-100% - 8px));
          }
          to {
            opacity: 1;
            transform: translate(-50%, -100%);
          }
        }
      `}</style>
    </td>
  )
}

export default function StudentScorePage() {
  const params = useParams()
  const subjectCode = typeof params?.subject === 'string' ? params.subject.toUpperCase() : ''
  
  const [students, setStudents] = useState<StudentScore[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subjectConfig, setSubjectConfig] = useState<any>(null)
  const [labs, setLabs] = useState<any[]>([])
  const [feedback, setFeedback] = useState<{ [key: string]: string }>({}) // student-lab feedback map
  const [columnFilter, setColumnFilter] = useState<'All' | 'Lab' | 'Challenge'>('All')
  const [studentIdFilter, setStudentIdFilter] = useState('')
  const [exportMode, setExportMode] = useState<'full' | 'summary'>('full')
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
    isOpen: false,
    studentId: '',
    studentName: '',
    labNumber: '',
    labTitle: '',
  })
  
  const [deleteAlert, setDeleteAlert] = useState<{ isOpen: boolean; studentId: string; labNumber: string }>({
    isOpen: false,
    studentId: '',
    labNumber: '',
  })

  useEffect(() => {
    if (subjectCode) {
      // Fetch subject config first
      fetch(`/api/subjects?code=${subjectCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.subjects && data.subjects.length > 0) {
            setSubjectConfig(data.subjects[0])
          }
        })
        .catch(err => console.error("Failed to fetch subject config", err))
      
      // Fetch labs data
      fetch(`/api/labs?subject=${subjectCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.labs) {
            setLabs(data.labs)
          }
        })
        .catch(err => console.error("Failed to fetch labs", err))
      
      // Fetch all feedback for this subject
      fetch(`/api/feedback?subject=${subjectCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.feedback) {
            // Build a map of student-lab -> comment (normalize lab numbers with padding)
            const feedbackMap: { [key: string]: string } = {}
            data.feedback.forEach((fb: any) => {
              const paddedLabNumber = String(fb.labNumber).padStart(2, '0')
              const key = `${fb.studentId}-${paddedLabNumber}`
              feedbackMap[key] = fb.adminComment
            })
            setFeedback(feedbackMap)
          }
        })
        .catch(err => console.error("Failed to fetch feedback", err))
      
      // Load student scores
      loadScores(true)
    }
  }, [subjectCode])

  const loadScores = async (initial = false) => {
    if (initial) setLoading(true)
    else setIsRefreshing(true)
    setError(null)

    try {
      const realtimeToken = Date.now()
      const res = await fetch(
        `/api/scores?subject=${subjectCode}&action=list_all&bypassCache=true&t=${realtimeToken}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.students) {
          setStudents(data.students)
        } else {
          setError(data.error || "Failed to fetch student scores")
        }
      } else {
        setError("Failed to fetch student scores")
      }
    } catch (e) {
      console.error('Failed to load scores:', e)
      setError("An error occurred while fetching scores")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const findSystemLabByColumn = (columnName: string) => {
    const labNumber = extractLabNumber(columnName)
    if (Number.isNaN(labNumber)) return undefined

    return labs.find((l: any) => {
      const systemLabNumber = Number.parseInt(String(l.labNumber), 10)
      return !Number.isNaN(systemLabNumber) && systemLabNumber === labNumber
    })
  }

  const extractLabNumber = (columnName: string): number => {
    const patterns = [
      /^(?:Lab\s*|L)(\d+)(?:\s*\(.*\))?$/i,
      /^(?:W|Week)\s*(\d+)$/i,
      /^(?:Ch\s*|Challenge\s*)(\d+)(?:\s*\(.*\))?$/i,
      /^l\s*(\d+)\s*-\s*q\s*\d+$/i,
      /(?:Lab|Challenge|Ch|W)\s*(\d+)/i
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(columnName)
      if (match?.[1]) {
        const parsed = Number.parseInt(match[1], 10)
        if (!Number.isNaN(parsed)) return parsed
      }
    }

    return Number.NaN
  }

  const isLabQuestionColumn = (columnName: string) => /^l\s*\d+\s*-\s*q\s*\d+$/i.test(columnName)

  const isLabLikeColumn = (columnName: string) => {
    const lowerKey = columnName.toLowerCase()
    if (lowerKey.startsWith('lab') || lowerKey.startsWith('challenge') || lowerKey.startsWith('ch ') || lowerKey.startsWith('w ')) {
      return true
    }

    return isLabQuestionColumn(columnName) || !Number.isNaN(extractLabNumber(columnName))
  }

  // Get all column keys from ALL students (not just first one)
  const getScoreColumns = () => {
    if (students.length === 0) return []

    // Collect ALL unique keys from ALL students
    const allKeysSet = new Set<string>()
    students.forEach((student: StudentScore) => {
      Object.keys(student).forEach(key => allKeysSet.add(key))
    })

    const allKeys = Array.from(allKeysSet)

    // Debug: log all columns
    console.log('All columns from all students:', allKeys)

    // Only include columns that start with Lab, Challenge, Quiz, or other score-related terms
    const scoreKeys = allKeys.filter(key => {
      const lowerKey = key.toLowerCase()
      return lowerKey.startsWith('lab') ||
             lowerKey.startsWith('challenge') ||
             lowerKey.startsWith('ch ') ||
             lowerKey.startsWith('w ') ||
             lowerKey.startsWith('week') ||
             lowerKey.startsWith('quiz') ||
             lowerKey.startsWith('exam') ||
             lowerKey.startsWith('midterm') ||
             lowerKey.startsWith('final') ||
             isLabQuestionColumn(key)
    })

    // Keep only score columns that exist in both spreadsheet and system for lab-like columns.
    // Non-lab score columns (quiz/exam/midterm/final) are kept as-is.
    const validatedScoreKeys = scoreKeys.filter((key) => {
      const isLabLike = isLabLikeColumn(key)
      if (!isLabLike) return true

      return !!findSystemLabByColumn(key)
    }).sort((a, b) => {
      // Sort by lab/challenge number for proper ordering
      const aMatch = /\d+/.exec(a)
      const bMatch = /\d+/.exec(b)
      if (aMatch && bMatch) {
        return parseInt(aMatch[0]) - parseInt(bMatch[0])
      }
      return a.localeCompare(b)
    })

    console.log('Filtered score columns:', validatedScoreKeys)
    return validatedScoreKeys
  }

  const allScoreColumns = getScoreColumns()
  
  // Filter columns based on dropdown selection
  const scoreColumns = allScoreColumns.filter(col => {
    if (columnFilter === 'All') return true
    if (columnFilter === 'Lab') return col.toLowerCase().startsWith('lab') || col.toLowerCase().startsWith('w ') || col.toLowerCase().startsWith('week') || isLabQuestionColumn(col)
    if (columnFilter === 'Challenge') return col.toLowerCase().startsWith('challenge') || col.toLowerCase().startsWith('ch ')
    if (columnFilter === 'Bonus') return col.toLowerCase().startsWith('bonus') || col.toLocaleLowerCase().startsWith('b ') 
    return true
  })
  
  // Filter students based on ID search
  const filteredStudents = students.filter((student: StudentScore) => {
    if (!studentIdFilter.trim()) return true
    const studentId = (student.username || student.ID || student.studentId || '').toString().toLowerCase()
    return studentId.includes(studentIdFilter.toLowerCase().trim())
  })

  // Get gradient style
  const gradientProps = subjectConfig?.color 
    ? getGradientStyleProps(subjectConfig.color) 
    : getGradientStyleProps("from-blue-500 to-indigo-500")

    const openFeedbackModal = (studentId: string, studentName: string, labNumber: string, labTitle: string) => {
      setFeedbackModal({
        isOpen: true,
        studentId,
        studentName,
        labNumber,
        labTitle,
      })
    }

    const closeFeedbackModal = () => {
      setFeedbackModal({
        isOpen: false,
        studentId: '',
        studentName: '',
        labNumber: '',
        labTitle: '',
      })
      // Refresh feedback after closing modal
      refreshFeedback()
    }

    const refreshFeedback = async () => {
      try {
        const res = await fetch(`/api/feedback?subject=${subjectCode}`)
        const data = await res.json()
        if (data.success && data.feedback) {
          const feedbackMap: { [key: string]: string } = {}
          data.feedback.forEach((fb: any) => {
            const paddedLabNumber = String(fb.labNumber).padStart(2, '0')
            const key = `${fb.studentId}-${paddedLabNumber}`
            feedbackMap[key] = fb.adminComment
          })
          setFeedback(feedbackMap)
        }
      } catch (err) {
        console.error("Failed to refresh feedback", err)
      }
    }

    const handleScoreCellClick = (student: StudentScore, columnName: string) => {
      const labNum = extractLabNumber(columnName)
      if (Number.isNaN(labNum)) return

      const lab = labs.find((item) => Number.parseInt(String(item.labNumber), 10) === labNum)
      if (!lab) return

      openFeedbackModal(
        student.username || student.ID || student.studentId || '',
        `${student.name || student.Name || ''} ${student.surname || student.Surname || ''}`.trim(),
        lab.labNumber,
        lab.title
      )
    }

    const handleDeleteFeedbackClick = (studentId: string, labNumber: string, columnName: string) => {
      setDeleteAlert({ isOpen: true, studentId, labNumber })
    }

    const confirmDeleteFeedback = async () => {
      const paddedLabNumber = String(deleteAlert.labNumber).padStart(2, '0')
      console.log('Deleting feedback for student:', deleteAlert.studentId, 'lab:', paddedLabNumber)
      try {
        const response = await fetch(`/api/feedback?labNumber=${paddedLabNumber}&subject=${subjectCode}&studentId=${deleteAlert.studentId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || 'Failed to delete feedback')
        }

        // Refresh feedback from server
        const feedbackRes = await fetch(`/api/feedback?subject=${subjectCode}`)
        const feedbackData = await feedbackRes.json()
        if (feedbackData.success && feedbackData.feedback) {
          const feedbackMap: { [key: string]: string } = {}
          feedbackData.feedback.forEach((fb: any) => {
            const paddedLabNumber = String(fb.labNumber).padStart(2, '0')
            const key = `${fb.studentId}-${paddedLabNumber}`
            feedbackMap[key] = fb.adminComment
          })
          setFeedback(feedbackMap)
        }

        console.log('✓ Feedback deleted successfully')
        setDeleteAlert({ isOpen: false, studentId: '', labNumber: '' })
      } catch (error: any) {
        console.error('Error deleting feedback:', error)
        alert('Failed to delete feedback: ' + error.message)
        setDeleteAlert({ isOpen: false, studentId: '', labNumber: '' })
      }
    }

  // Calculate score totals for a student
  const calculateStudentTotals = (student: StudentScore, columns: string[]) => {
    let labTotal = 0
    let labMax = 0
    let challengeTotal = 0
    let challengeMax = 0
    
    columns.forEach(col => {
      const value = student[col]
      const numValue = (value !== null && value !== undefined && value !== '') ? parseFloat(String(value)) : 0
      
      if (!isNaN(numValue)) {
        // Determine if it's a lab or challenge column
        if (col.toLowerCase().includes('challenge') || col.toLowerCase().startsWith('ch ')) {
          challengeTotal += numValue
          const maxScore = getLabTotalScore(col) || 2
          challengeMax += maxScore
        } else if ((col.toLowerCase().includes('lab') || col.toLowerCase().startsWith('w ')) && !isLabQuestionColumn(col)) {
          labTotal += numValue
          const maxScore = getLabTotalScore(col) || 2
          labMax += maxScore
        }
      }
    })
    
    // Calculate percentages based on subject config
    const labWeight = subjectConfig?.grading?.labWeight || 20
    const labPercentage = labMax > 0 ? (labTotal / labMax) * labWeight : 0
    const challengePercentage = challengeMax > 0 ? (challengeTotal / challengeMax) * labWeight : 0

    return {
      labTotal,
      labMax,
      labPercentage,
      challengeTotal,
      challengeMax,
      challengePercentage,
      hasChallenges: challengeMax > 0
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    if (filteredStudents.length === 0) return

    let headers: string[]
    let rows: any[][]

    if (exportMode === 'summary') {
      // Summary export: ID, Name, Surname, Total Lab, Total Challenge (if applicable)
      const allColumns = allScoreColumns
      const sampleTotals = calculateStudentTotals(filteredStudents[0] || {}, allColumns)
      
      headers = [
        "ID",
        "Name",
        "Surname",
        "Total Lab Score",
        "Lab %"
      ]
      
      if (sampleTotals.hasChallenges) {
        headers.push("Total Challenge Score", "Challenge %")
      }

      rows = filteredStudents.map((student: StudentScore) => {
        const totals = calculateStudentTotals(student, allColumns)
        const row = [
          student.username || student.ID || student.studentId || '',
          student.name || student.Name || '',
          student.surname || student.Surname || '',
          `${totals.labTotal}/${totals.labMax}`,
          totals.labPercentage.toFixed(2) + '%'
        ]
        
        if (totals.hasChallenges) {
          row.push(
            `${totals.challengeTotal}/${totals.challengeMax}`,
            totals.challengePercentage.toFixed(2) + '%'
          )
        }
        
        return row
      })
    } else {
      // Full export with all columns
      headers = [
        "No.",
        "ID",
        "Name",
        "Surname",
        "Section",
        ...scoreColumns
      ]

      rows = filteredStudents.map((student: StudentScore, index: number) => [
        index + 1,
        student.username || student.ID || student.studentId || '',
        student.name || student.Name || '',
        student.surname || student.Surname || '',
        student.Section || student.section || '',
        ...scoreColumns.map(col => {
          const value = student[col]
          return (value !== null && value !== undefined && value !== '') ? value : '0'
        })
      ])
    }

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = globalThis.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const mode = exportMode === 'summary' ? 'summary' : 'full'
    a.download = `${subjectCode.toLowerCase()}-${mode}-scores-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    globalThis.URL.revokeObjectURL(url)
  }

  // Helper function to get lab total score from column name
  const getLabTotalScore = (columnName: string): number | undefined => {
    const lab = findSystemLabByColumn(columnName)
    return lab?.totalScore
  }

  // Get cell color based on score value and lab's total score
  const getCellColor = (value: any, columnName: string) => {
    if (value === null || value === undefined || value === '') {
      return 'bg-gray-50 dark:bg-gray-800 text-gray-400'
    }
    
    const strValue = String(value)
    
    // Check if it's a fractional score (e.g., "2/2", "1/2", "1/1")
    if (strValue.includes('/')) {
      const parts = strValue.split('/')
      const score = Number.parseFloat(parts[0].trim())
      const total = Number.parseFloat(parts[1].trim())
      
      if (!Number.isNaN(score) && !Number.isNaN(total)) {
        if (score >= total) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold' // Full score
        if (score > 0) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' // Partial score
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' // Zero or wrong
      }
    }

    // Parse as number for numeric values
    const numValue = typeof value === 'number' ? value : Number.parseFloat(strValue)
    
    if (Number.isNaN(numValue)) {
      return 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'
    }

    // Get the lab's total score to determine if it's full score
    const labTotalScore = getLabTotalScore(columnName)
    
    if (labTotalScore && labTotalScore > 0) {
      if (numValue >= labTotalScore) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold' // Full score
      if (numValue > 0) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' // Partial score
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' // Zero
    }

    // Fallback: assume max score is 2
    if (numValue >= 2) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold'
    if (numValue > 0) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  }

  if (!subjectCode) {
    return <div className="min-h-screen flex items-center justify-center">Invalid Subject</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute top-0 -left-4 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-10 animate-float ${gradientProps.className}`}
          style={gradientProps.style}
        ></div>
        <div 
          className={`absolute bottom-0 -right-4 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-10 animate-float ${gradientProps.className}`}
          style={{ ...gradientProps.style, animationDelay: "3s" }}
        ></div>
      </div>

      {/* Header */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/20 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto max-w-[95%] flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/${subjectCode.toLowerCase()}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-500 hover:text-white transition-all shadow-sm hover:shadow-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {subjectCode} - All Student Scores
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Spreadsheet view of all student lab scores
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadScores(false)}
              disabled={isRefreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ${
                isRefreshing
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            {/* Export Mode Selector */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium">
              <button
                onClick={() => setExportMode('full')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  exportMode === 'full'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Full
              </button>
              <button
                onClick={() => setExportMode('summary')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  exportMode === 'summary'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Summary
              </button>
            </div>
            
            <button
              onClick={exportToCSV}
              disabled={students.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <ModeToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto max-w-[95%] px-4 py-8 relative z-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${gradientProps.className} text-white`}>
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Students</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{filteredStudents.length}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${gradientProps.className} text-white`}>
                <TableIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Columns</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{scoreColumns.length}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${gradientProps.className} text-white`}>
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Last Updated</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isRefreshing ? 'Refreshing...' : new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Student Scores Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Student Score Spreadsheet
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Scroll horizontally to view all lab scores
                </p>
              </div>
              
              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <select
                    value={columnFilter}
                    onChange={(e) => setColumnFilter(e.target.value as 'All' | 'Lab' | 'Challenge')}
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All</option>
                    <option value="Lab">Lab</option>
                    <option value="Challenge">Challenge</option>
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    value={studentIdFilter}
                    onChange={(e) => setStudentIdFilter(e.target.value)}
                    placeholder="Search by Student ID..."
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {(() => {
            if (loading) {
              return (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-800 border-t-slate-600 dark:border-t-slate-400"></div>
                    <p className="text-slate-600 dark:text-slate-400 mt-4 font-medium">Loading student scores...</p>
                  </div>
                </div>
              )
            }
            
            if (error) {
              return (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                    <button
                      onClick={() => loadScores(true)}
                      className="mt-4 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )
            }
            
            if (students.length === 0) {
              return (
                <div className="flex items-center justify-center py-16">
                  <p className="text-slate-600 dark:text-slate-400">No student data found</p>
                </div>
              )
            }
            
            if (filteredStudents.length === 0) {
              return (
                <div className="flex items-center justify-center py-16">
                  <p className="text-slate-600 dark:text-slate-400">No students match the filter criteria</p>
                </div>
              )
            }
            
            return (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border border-slate-300 dark:border-slate-600 whitespace-nowrap bg-slate-100 dark:bg-slate-800/50">
                      No.
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border border-slate-300 dark:border-slate-600 whitespace-nowrap bg-slate-100 dark:bg-slate-800/50">
                      ID
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border border-slate-300 dark:border-slate-600 whitespace-nowrap bg-slate-100 dark:bg-slate-800/50">
                      Name
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border border-slate-300 dark:border-slate-600 whitespace-nowrap bg-slate-100 dark:bg-slate-800/50">
                      Surname
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border border-slate-300 dark:border-slate-600 whitespace-nowrap bg-slate-100 dark:bg-slate-800/50">
                      Section
                    </th>
                    {scoreColumns.map((col, idx) => (
                      <th key={col} className="px-3 py-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border border-slate-300 dark:border-slate-600 min-w-[90px] whitespace-nowrap bg-slate-100 dark:bg-slate-800/50">
                        {col}
                      </th>
                    ))}
                    {/* Total Score Columns */}
                    {(() => {
                      const allColumns = allScoreColumns
                      const sampleStudent = filteredStudents[0] || {}
                      const totals = calculateStudentTotals(sampleStudent, allColumns)
                      
                      return (
                        <>
                          <th className="px-3 py-3 text-center text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider border border-orange-300 dark:border-orange-700 min-w-[120px] whitespace-nowrap bg-orange-50 dark:bg-orange-900/20">
                            Total Lab
                          </th>
                          <th className="px-3 py-3 text-center text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider border border-orange-300 dark:border-orange-700 min-w-[100px] whitespace-nowrap bg-orange-50 dark:bg-orange-900/20">
                            Lab %
                          </th>
                          {totals.hasChallenges && (
                            <>
                              <th className="px-3 py-3 text-center text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider border border-teal-300 dark:border-teal-700 min-w-[120px] whitespace-nowrap bg-teal-50 dark:bg-teal-900/20">
                                Total Challenge
                              </th>
                              <th className="px-3 py-3 text-center text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider border border-teal-300 dark:border-teal-700 min-w-[100px] whitespace-nowrap bg-teal-50 dark:bg-teal-900/20">
                                Challenge %
                              </th>
                            </>
                          )}
                        </>
                      )
                    })()}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900">
                  {filteredStudents.map((student, index) => {
                    const studentKey = student.username || student.ID || student.studentId || `student-${index}`
                    return (
                      <tr key={studentKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100 font-medium border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100 font-mono border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {student.username || student.ID || student.studentId || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {student.name || student.Name || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {student.surname || student.Surname || '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {student.Section || student.section || '-'}
                        </td>
                        {scoreColumns.map((col, idx) => {
                          const value = student[col]
                          const hasValue = (value !== null && value !== undefined && value !== '')
                          const studentId = student.username || student.ID || student.studentId || ''
                          const labNum = extractLabNumber(col)
                          const feedbackKey = `${studentId}-${String(labNum).padStart(2, '0')}`
                          const feedbackComment = feedback[feedbackKey] || ''
                          
                          // For Lab 0 or when value exists, show the value (or '0' for Lab 0)
                          // For other labs without data, show "no data"
                          let displayValue
                            let cellClasses = 'px-3 py-2 text-center border border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[90px] cursor-pointer hover:opacity-80 transition-opacity relative group'
                          
                          if (hasValue) {
                            displayValue = value
                            cellClasses += ` font-semibold ${getCellColor(displayValue, col)}`
                          } else if (col === 'Lab 0') {
                            displayValue = '0'
                            cellClasses += ` font-semibold ${getCellColor('0', col)}`
                          } else {
                            displayValue = '-'
                            cellClasses += ' text-slate-400 dark:text-slate-500'
                          }
                          
                          return (
                            <ScoreCell
                              key={col}
                              student={student}
                              columnName={col}
                              displayValue={displayValue}
                              cellClasses={cellClasses}
                              onOpenFeedback={handleScoreCellClick}
                              feedbackComment={feedbackComment}
                              onDeleteClick={handleDeleteFeedbackClick}
                            />
                          )
                        })}
                        
                        {/* Total Score Cells */}
                        {(() => {
                          const allColumns = allScoreColumns
                          const totals = calculateStudentTotals(student, allColumns)
                          
                          return (
                            <>
                              <td className="px-3 py-2 text-center font-bold text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700 whitespace-nowrap bg-orange-50 dark:bg-orange-900/10">
                                {totals.labTotal}/{totals.labMax}
                              </td>
                              <td className="px-3 py-2 text-center font-bold text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700 whitespace-nowrap bg-orange-50 dark:bg-orange-900/10">
                                {totals.labPercentage.toFixed(2)}%
                              </td>
                              {totals.hasChallenges && (
                                <>
                                  <td className="px-3 py-2 text-center font-bold text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-700 whitespace-nowrap bg-teal-50 dark:bg-teal-900/10">
                                    {totals.challengeTotal}/{totals.challengeMax}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-700 whitespace-nowrap bg-teal-50 dark:bg-teal-900/10">
                                    {totals.challengePercentage.toFixed(2)}%
                                  </td>
                                </>
                              )}
                            </>
                          )
                        })()}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            )
          })()}
        </div>

        {/* Legend */}
        {!loading && !error && students.length > 0 && (
          <div className="mt-6 glass-card p-4 rounded-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Color Legend:</h3>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"></div>
                <span className="text-slate-700 dark:text-slate-300">Full Score</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700"></div>
                <span className="text-slate-700 dark:text-slate-300">Partial Score</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700"></div>
                <span className="text-slate-700 dark:text-slate-300">Not Submit / Wrong (0)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700"></div>
                <span className="text-slate-700 dark:text-slate-300">No Data (-)</span>
              </div>
            </div>
          </div>
        )}

        <FeedbackModal
          isOpen={feedbackModal.isOpen}
          onClose={closeFeedbackModal}
          studentId={feedbackModal.studentId}
          studentName={feedbackModal.studentName}
          subject={subjectCode}
          labNumber={feedbackModal.labNumber}
          labTitle={feedbackModal.labTitle}
          onRefreshFeedback={refreshFeedback}
        />

        <AlertDialog
          isOpen={deleteAlert.isOpen}
          onOpenChange={(open) => {
            if (!open) setDeleteAlert({ isOpen: false, studentId: '', labNumber: '' })
          }}
          title="Delete Feedback?"
          description="This feedback comment will be permanently deleted and cannot be recovered."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          onConfirm={confirmDeleteFeedback}
        />
      </main>
    </div>
  )
}
