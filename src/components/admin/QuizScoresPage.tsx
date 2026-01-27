"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { ArrowLeft, Download, RefreshCw, Trophy, TrendingUp, Users } from "lucide-react"

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
  const [selectedLab, setSelectedLab] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"date" | "score" | "student">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    loadScores()
  }, [])

  const loadScores = async () => {
    setLoading(true)
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
      : 0
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 bg-${colorTheme.accent}-100 dark:bg-${colorTheme.accent}-900 rounded-lg`}>
                <Users className={`w-6 h-6 ${colorTheme.primary} dark:text-${colorTheme.accent}-400`} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{overallStats.totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Attempts</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{overallStats.totalAttempts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{overallStats.averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Highest Score</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-slate-200">{overallStats.highestScore}%</p>
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
                onClick={loadScores}
                className={`px-4 py-2 ${colorTheme.secondary} text-white rounded-lg hover:opacity-90 transition-colors flex items-center gap-2`}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
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
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {sortedScores.map((score) => (
                        <tr key={score.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-200">
                            {score.studentId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            Lab {score.labNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(score.score)}`}>
                              {score.score}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {score.correctAnswers} / {score.totalQuestions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {new Date(score.submittedAt).toLocaleString()}
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
    </div>
  )
}
