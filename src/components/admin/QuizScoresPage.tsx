"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { ArrowLeft, Download, RefreshCw, Trophy, TrendingUp, Users, BarChart2, Trash2 } from "lucide-react"

interface QuizScore {
  id: string
  studentId: string
  subject: string
  labNumber: string
  score: number
  totalQuestions: number
  correctAnswers: number
  submittedAt: string
}

interface StudentStats {
  studentId: string
  totalAttempts: number
  averageScore: number
  highestScore: number
  lowestScore: number
  lastAttempt: string
}

interface QuizScoresPageProps {
  subjectCode: string
  colorTheme?: {
    gradient: string
    primary: string
    secondary: string
    accent: string
  }
}

export default function QuizScoresPage({
  subjectCode,
  colorTheme = {
    gradient: "from-purple-50 via-white to-pink-50",
    primary: "text-purple-600",
    secondary: "bg-purple-600",
    accent: "purple"
  }
}: QuizScoresPageProps) {
  const [scores, setScores] = useState<QuizScore[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedLab, setSelectedLab] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "score" | "student">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null)
  const [modalQuestions, setModalQuestions] = useState<any[]>([])
  const [loadingModalQuestions, setLoadingModalQuestions] = useState(false)

  const handleViewAnswers = async (scoreRecord: any) => {
    setSelectedSubmission(scoreRecord)
    setLoadingModalQuestions(true)
    try {
      const res = await fetch(`/api/quiz?labNumber=${scoreRecord.labNumber}&subject=${subjectCode}`)
      if (res.ok) {
        const data = await res.json()
        setModalQuestions(data.questions || [])
      }
    } catch (e) {
      console.error('Failed to load lab questions for submission modal:', e)
    } finally {
      setLoadingModalQuestions(false)
    }
  }

  useEffect(() => {
    loadScores(true)
  }, [])

  const loadScores = async (initial = false) => {
    if (initial) setLoading(true)
    else setIsRefreshing(true)

    try {
      const res = await fetch(`/api/quiz/scores?subject=${subjectCode}`)
      if (res.ok) {
        const data = await res.json()
        setScores(data.scores || [])
      }
    } catch (e) {
      console.error('Failed to load scores:', e)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleClearAllAttempts = async () => {
    const targetLabel = selectedLab === "all" ? `ALL quiz attempts for ${subjectCode}` : `quiz attempts for Lab ${selectedLab} in ${subjectCode}`
    if (!confirm(`Are you sure you want to PERMANENTLY CLEAR ${targetLabel}? This will reset all student quiz scores to 0.`)) {
      return
    }

    try {
      const url = `/api/quiz/scores?subject=${subjectCode}${selectedLab !== "all" ? `&labNumber=${selectedLab}` : ''}`
      const res = await fetch(url, { method: 'DELETE' })
      if (res.ok) {
        await loadScores(false)
        alert('Quiz attempts cleared successfully!')
      } else {
        alert('Failed to clear quiz attempts')
      }
    } catch (e) {
      console.error('Failed to clear quiz scores:', e)
      alert('Error clearing quiz attempts')
    }
  }

  // Get unique lab numbers
  const labNumbers = Array.from(new Set(scores.map(s => s.labNumber))).sort()

  // Filter scores
  const filteredScores = selectedLab === "all"
    ? scores
    : scores.filter(s => s.labNumber === selectedLab)

  // Sort scores
  const sortedScores = [...filteredScores].sort((a, b) => {
    let comparison = 0
    
    if (sortBy === "date") {
      comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    } else if (sortBy === "score") {
      comparison = a.score - b.score
    } else if (sortBy === "student") {
      comparison = a.studentId.localeCompare(b.studentId)
    }

    return sortOrder === "asc" ? comparison : -comparison
  })

  // Calculate statistics
  const calculateStudentStats = (): StudentStats[] => {
    const studentMap = new Map<string, QuizScore[]>()
    
    filteredScores.forEach(score => {
      if (!studentMap.has(score.studentId)) {
        studentMap.set(score.studentId, [])
      }
      studentMap.get(score.studentId)!.push(score)
    })

    const stats: StudentStats[] = []
    studentMap.forEach((studentScores, studentId) => {
      const scores = studentScores.map(s => s.score)
      stats.push({
        studentId,
        totalAttempts: studentScores.length,
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        lastAttempt: studentScores.sort((a, b) => 
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        )[0].submittedAt
      })
    })

    return stats.sort((a, b) => b.averageScore - a.averageScore)
  }

  const studentStats = calculateStudentStats()

  // Calculate overall statistics
  const overallStats = {
    totalAttempts: filteredScores.length,
    totalStudents: new Set(filteredScores.map(s => s.studentId)).size,
    averageScore: filteredScores.length > 0
      ? Math.round(filteredScores.reduce((sum, s) => sum + s.score, 0) / filteredScores.length)
      : 0,
    highestScore: filteredScores.length > 0
      ? Math.max(...filteredScores.map(s => s.score))
      : 0,
    passRate: filteredScores.length > 0
      ? Math.round((filteredScores.filter(s => s.score >= 60).length / filteredScores.length) * 100)
      : 0
  }

  // Build histogram buckets: 0-9, 10-19, ..., 90-100
  const histogramBuckets = Array.from({ length: 10 }, (_, i) => {
    const min = i * 10
    const max = i === 9 ? 100 : min + 9
    const label = i === 9 ? "90-100" : `${min}-${max}`
    const count = filteredScores.filter(s => s.score >= min && s.score <= max).length
    return { label, min, max, count }
  })
  const histogramMax = Math.max(...histogramBuckets.map(b => b.count), 1)

  const getBucketColor = (min: number) => {
    if (min >= 90) return { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" }
    if (min >= 70) return { bar: "bg-green-400", text: "text-green-700 dark:text-greenald-400", bg: "bg-green-50 dark:bg-green-900/30" }
    if (min >= 60) return { bar: "bg-yellow-400", text: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/30" }
    if (min >= 40) return { bar: "bg-orange-400", text: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30" }
    return { bar: "bg-red-400", text: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" }
  }

  const exportToCSV = () => {
    const headers = ["Student ID", "Lab Number", "Score (%)", "Correct Answers", "Total Questions", "Submitted At"]
    const rows = sortedScores.map(s => [
      s.studentId,
      s.labNumber,
      s.score,
      s.correctAnswers,
      s.totalQuestions,
      new Date(s.submittedAt).toLocaleString()
    ])

    const csv = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n")

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${subjectCode.toLowerCase()}-quiz-scores-${selectedLab}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
    if (score >= 80) return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"
    if (score >= 60) return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20"
    return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colorTheme.gradient} dark:from-gray-900 dark:via-gray-800 dark:to-gray-950`}>
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/admin/${subjectCode.toLowerCase()}`}
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:${colorTheme.secondary} hover:text-white transition-all`}
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-200">
                  {subjectCode} Quiz Scores
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View and manage student quiz performance
                </p>
              </div>
            </div>
            <ModeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overall Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 bg-${colorTheme.accent}-100 dark:bg-${colorTheme.accent}-900/40 rounded-lg`}>
                <Users className={`w-5 h-5 ${colorTheme.primary} dark:text-${colorTheme.accent}-400`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Students</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{overallStats.totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Attempts</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{overallStats.totalAttempts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Avg Score</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{overallStats.averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Highest</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{overallStats.highestScore}%</p>
              </div>
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${
                overallStats.passRate >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/40' :
                overallStats.passRate >= 60 ? 'bg-green-100 dark:bg-green-900/40' :
                'bg-orange-100 dark:bg-orange-900/40'
              }`}>
                <BarChart2 className={`w-5 h-5 ${
                  overallStats.passRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                  overallStats.passRate >= 60 ? 'text-green-600 dark:text-green-400' :
                  'text-orange-600 dark:text-orange-400'
                }`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pass Rate (≥60%)</p>
                <p className={`text-2xl font-bold ${
                  overallStats.passRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                  overallStats.passRate >= 60 ? 'text-green-600 dark:text-green-400' :
                  'text-orange-600 dark:text-orange-400'
                }`}>{overallStats.passRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Filter by Lab
              </label>
              <select
                value={selectedLab}
                onChange={(e) => setSelectedLab(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-slate-200"
              >
                <option value="all">All Labs</option>
                {labNumbers.map(lab => (
                  <option key={lab} value={lab}>Lab {lab}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-slate-200"
              >
                <option value="date">Submission Date</option>
                <option value="score">Score</option>
                <option value="student">Student ID</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-slate-200"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => loadScores(false)}
                disabled={isRefreshing}
                className={`px-4 py-2 ${colorTheme.secondary} text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-70 text-sm font-bold`}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handleClearAllAttempts}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
                title="Clear All Student Attempts and Reset Scores"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Attempts
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className={`inline-block animate-spin rounded-full h-10 w-10 border-4 border-${colorTheme.accent}-200 dark:border-${colorTheme.accent}-800 border-t-${colorTheme.accent}-600`}></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading scores...</p>
          </div>
        ) : (
          <>
            {/* Score Distribution Histogram */}
            {filteredScores.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                    <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200">Score Distribution</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">How many students scored in each range</p>
                  </div>
                </div>

                {/* Histogram bars */}
                <div className="flex items-end gap-1 md:gap-2 h-48 px-2">
                  {histogramBuckets.map((bucket) => {
                    const pct = histogramMax > 0 ? (bucket.count / histogramMax) * 100 : 0
                    const colors = getBucketColor(bucket.min)
                    const scorePct = filteredScores.length > 0
                      ? Math.round((bucket.count / filteredScores.length) * 100)
                      : 0
                    return (
                      <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1 group">
                        {/* Tooltip */}
                        <div className="relative w-full flex flex-col items-center">
                          {bucket.count > 0 && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 left-1/2 -translate-x-1/2 z-10 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg pointer-events-none">
                              <div className="font-bold">{bucket.count} {bucket.count === 1 ? 'student' : 'students'}</div>
                              <div className="text-gray-300">{scorePct}% of class</div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                            </div>
                          )}
                          {/* Bar */}
                          <div
                            className={`w-full rounded-t-md transition-all duration-500 ${colors.bar} relative`}
                            style={{ height: `${Math.max(pct * 1.6, bucket.count > 0 ? 8 : 2)}px`, minHeight: '2px' }}
                          >
                            {bucket.count > 0 && (
                              <div className="absolute -top-6 left-0 right-0 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
                                {bucket.count}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Label */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1 font-medium" style={{ fontSize: '0.6rem' }}>
                          {bucket.label}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {[
                    { label: 'Excellent (90-100)', color: 'bg-emerald-500' },
                    { label: 'Good (70-89)', color: 'bg-green-400' },
                    { label: 'Passing (60-69)', color: 'bg-yellow-400' },
                    { label: 'Below avg (40-59)', color: 'bg-orange-400' },
                    { label: 'Failing (0-39)', color: 'bg-red-400' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-sm ${item.color}`} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Score range summary row */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-4">
                  {[
                    { label: 'Excellent', range: [90, 100], color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' },
                    { label: 'Good', range: [70, 89], color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' },
                    { label: 'Passing', range: [60, 69], color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400' },
                    { label: 'Below Avg', range: [40, 59], color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400' },
                    { label: 'Failing', range: [0, 39], color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' },
                  ].map(item => {
                    const cnt = filteredScores.filter(s => s.score >= item.range[0] && s.score <= item.range[1]).length
                    const pct = filteredScores.length > 0 ? Math.round((cnt / filteredScores.length) * 100) : 0
                    return (
                      <div key={item.label} className={`rounded-lg border px-3 py-2 text-center ${item.color}`}>
                        <div className="text-lg font-bold">{cnt}</div>
                        <div className="text-xs font-medium">{item.label}</div>
                        <div className="text-xs opacity-70">{pct}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Student Statistics Table */}
            {studentStats.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">Student Performance Summary</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Student ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Attempts
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Average
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Highest
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Lowest
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Last Attempt
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {studentStats.map((stat) => (
                        <tr key={stat.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-200">
                            {stat.studentId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {stat.totalAttempts}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(stat.averageScore)}`}>
                              {stat.averageScore}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(stat.highestScore)}`}>
                              {stat.highestScore}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(stat.lowestScore)}`}>
                              {stat.lowestScore}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {new Date(stat.lastAttempt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* All Submissions Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">All Submissions ({sortedScores.length})</h2>
              </div>
              {sortedScores.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400">No quiz submissions yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Student ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Lab
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Correct / Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Submitted At
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {sortedScores.map((score) => (
                        <tr key={score.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-200 font-mono">
                            {score.studentId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700 dark:text-gray-300">
                            Lab {score.labNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(score.score)}`}>
                              {score.score}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-semibold">
                            {score.correctAnswers} / {score.totalQuestions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400 font-medium">
                            {new Date(score.submittedAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => handleViewAnswers(score)}
                              className="px-3 py-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 font-bold rounded-lg text-xs hover:bg-purple-200 transition-colors inline-flex items-center gap-1"
                            >
                              👁️ View Answers
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* View Detailed Answers Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-in">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  📜 Answering Breakdown for <span className="font-mono text-purple-600 dark:text-purple-400">{selectedSubmission.studentId}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Lab {selectedSubmission.labNumber} | Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()} | Score: <strong className="text-purple-600">{selectedSubmission.score}%</strong> ({selectedSubmission.correctAnswers}/{selectedSubmission.totalQuestions})
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {loadingModalQuestions ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                <p className="mt-3 text-xs text-slate-500 font-medium">Loading question details...</p>
              </div>
            ) : modalQuestions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No question definitions available for Lab {selectedSubmission.labNumber}.
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  let rawAnswers = selectedSubmission.answers
                  if (typeof rawAnswers === 'string') {
                    try { rawAnswers = JSON.parse(rawAnswers) } catch { rawAnswers = {} }
                  }
                  const hasAnswersPayload = rawAnswers && Object.keys(rawAnswers).length > 0

                  return (
                    <>
                      {!hasAnswersPayload && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-medium mb-4">
                          ℹ️ <strong>Legacy Attempt Note:</strong> Exact individual choice selections were not recorded for this specific attempt, but the total score (<strong>{selectedSubmission.score}%</strong>) and correct count (<strong>{selectedSubmission.correctAnswers}/{selectedSubmission.totalQuestions}</strong>) are saved.
                        </div>
                      )}

                      {modalQuestions.map((q, idx) => {
                        const userAns = rawAnswers?.[q.id]
                        const isCorrect = Array.isArray(q.correctAnswer)
                          ? Array.isArray(userAns) && userAns.length === q.correctAnswer.length && userAns.every((v: any) => q.correctAnswer.includes(String(v)))
                          : String(userAns || '').trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase()

                        return (
                          <div key={q.id || idx} className={`p-4 rounded-xl border ${hasAnswersPayload ? (isCorrect ? 'bg-green-50/60 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-red-50/60 border-red-200 dark:bg-red-900/10 dark:border-red-800') : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex justify-between items-start mb-2 gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                Q{idx + 1}. {q.question?.replace(/<[^>]*>?/gm, '') || q.question}
                              </span>
                              {hasAnswersPayload && (
                                <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${isCorrect ? 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                  {isCorrect ? '✓ Correct' : '✕ Incorrect'}
                                </span>
                              )}
                            </div>

                            <div className="text-xs space-y-1 mt-2">
                              <p className="text-slate-700 dark:text-slate-300 font-medium">
                                <strong>Student Selected:</strong> <span className={hasAnswersPayload ? (isCorrect ? 'text-green-700 dark:text-green-300 font-bold' : 'text-red-700 dark:text-red-300 font-bold') : 'text-slate-500 italic'}>
                                  {hasAnswersPayload ? (Array.isArray(userAns) ? userAns.join(', ') : (userAns || 'No Answer')) : 'Not recorded (Legacy Attempt)'}
                                </span>
                              </p>
                              <p className="text-slate-500 dark:text-slate-400">
                                <strong>Correct Answer:</strong> <span className="text-green-600 dark:text-green-400 font-bold">
                                  {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                                </span>
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )
                })()}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 transition-colors text-xs"
              >
                Close History Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
