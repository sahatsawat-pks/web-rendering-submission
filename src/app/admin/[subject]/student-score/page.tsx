"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { ArrowLeft, Download, RefreshCw, Users, Table as TableIcon, Filter, X } from "lucide-react"
import { getGradientStyleProps } from "@/lib/colors"

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

export default function StudentScorePage() {
  const params = useParams()
  const subjectCode = typeof params?.subject === 'string' ? params.subject.toUpperCase() : ''
  
  const [students, setStudents] = useState<StudentScore[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subjectConfig, setSubjectConfig] = useState<any>(null)
  const [labs, setLabs] = useState<any[]>([])
  const [columnFilter, setColumnFilter] = useState<'All' | 'Lab' | 'Challenge'>('All')
  const [studentIdFilter, setStudentIdFilter] = useState('')
  const [exportMode, setExportMode] = useState<'full' | 'summary'>('full')
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
      
      // Load student scores
      loadScores(true)
    }
  }, [subjectCode])

  const loadScores = async (initial = false) => {
    if (initial) setLoading(true)
    else setIsRefreshing(true)
    setError(null)

    try {
      const res = await fetch(`/api/scores?subject=${subjectCode}&action=list_all&bypassCache=true`)
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

  // Get all column keys from ALL students (not just first one)
  const getScoreColumns = () => {
    if (students.length === 0) return []
    
    // Collect ALL unique keys from ALL students
    const allKeysSet = new Set<string>()
    students.forEach(student => {
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
             lowerKey.startsWith('quiz') ||
             lowerKey.startsWith('exam') ||
             lowerKey.startsWith('midterm') ||
             lowerKey.startsWith('final')
    }).sort((a, b) => {
      // Sort by lab/challenge number for proper ordering
      const aMatch = a.match(/\d+/)
      const bMatch = b.match(/\d+/)
      if (aMatch && bMatch) {
        return parseInt(aMatch[0]) - parseInt(bMatch[0])
      }
      return a.localeCompare(b)
    })
    
    console.log('Filtered score columns:', scoreKeys)
    return scoreKeys
  }

  const allScoreColumns = getScoreColumns()
  
  // Filter columns based on dropdown selection
  const scoreColumns = allScoreColumns.filter(col => {
    if (columnFilter === 'All') return true
    if (columnFilter === 'Lab') return col.toLowerCase().startsWith('lab')
    if (columnFilter === 'Challenge') return col.toLowerCase().startsWith('challenge') || col.toLowerCase().startsWith('ch ')
    return true
  })
  
  // Filter students based on ID search
  const filteredStudents = students.filter(student => {
    if (!studentIdFilter.trim()) return true
    const studentId = (student.username || student.ID || student.studentId || '').toString().toLowerCase()
    return studentId.includes(studentIdFilter.toLowerCase().trim())
  })

  // Get gradient style
  const gradientProps = subjectConfig?.color 
    ? getGradientStyleProps(subjectConfig.color) 
    : getGradientStyleProps("from-blue-500 to-indigo-500")

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
        } else if (col.toLowerCase().includes('lab') || col.toLowerCase().startsWith('w ')) {
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
      const allColumns = getScoreColumns()
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

      rows = filteredStudents.map((student) => {
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

      rows = filteredStudents.map((student, index) => [
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
    // Extract lab number from column name (e.g., "Lab 1", "Lab 01", "Challenge 1", "Ch 1", "W 1")
    const labMatch = columnName.match(/(?:Lab|Challenge|Ch|W)\s*(\d+)/i)
    if (labMatch) {
      const labNumber = labMatch[1]
      const lab = labs.find(l => 
        l.labNumber === labNumber || 
        l.labNumber === labNumber.padStart(2, '0') ||
        Number.parseInt(l.labNumber) === Number.parseInt(labNumber)
      )
      return lab?.totalScore
    }
    return undefined
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
                      const allColumns = getScoreColumns()
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
                          
                          // For Lab 0 or when value exists, show the value (or '0' for Lab 0)
                          // For other labs without data, show "no data"
                          let displayValue
                          let cellClasses = 'px-3 py-2 text-center border border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[90px]'
                          
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
                            <td key={col} className={cellClasses}>
                              {displayValue}
                            </td>
                          )
                        })}
                        
                        {/* Total Score Cells */}
                        {(() => {
                          const allColumns = getScoreColumns()
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
      </main>
    </div>
  )
}
