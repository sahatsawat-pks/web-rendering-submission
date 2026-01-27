"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ClipboardList, Search, Filter, Eye, EyeOff, Trash2, Clock, CheckCircle, XCircle, Home } from "lucide-react"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import Footer from "@/components/Footer"

interface Quiz {
  id: string
  labNumber: string
  title: string
  subject: string
  quizEnabled: boolean
  hasQuestions: boolean
  questionCount: number
  hasCategories: boolean
  timeLimit: number
  timeLimitEnabled: boolean
  isActive: boolean
}

export default function QuizManagement() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSubject, setFilterSubject] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)

  const subjects = ["ITCS123", "ITCS223", "ITCS227", "ITCS251", "ITCS255", "ITDS283", "ITGE162"]

  useEffect(() => {
    // Check for subject parameter in URL
    const params = new URLSearchParams(window.location.search)
    const subjectParam = params.get('subject')
    if (subjectParam && subjects.includes(subjectParam)) {
      setFilterSubject(subjectParam)
    }
    
    fetchQuizzes()
  }, [])

  async function fetchQuizzes() {
    try {
      const res = await fetch("/api/admin/quiz-management")
      const data = await res.json()
      if (data.quizzes) {
        setQuizzes(data.quizzes)
      }
    } catch (error) {
      console.error("Failed to fetch quizzes:", error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleQuiz(labId: string, currentStatus: boolean) {
    setUpdating(labId)
    try {
      const res = await fetch("/api/admin/quiz-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labId, quizEnabled: !currentStatus })
      })

      if (res.ok) {
        await fetchQuizzes()
      }
    } catch (error) {
      console.error("Failed to toggle quiz:", error)
    } finally {
      setUpdating(null)
    }
  }

  async function removeQuiz(labId: string) {
    if (!confirm("Are you sure you want to remove all quiz data for this lab? This action cannot be undone.")) {
      return
    }

    setUpdating(labId)
    try {
      const res = await fetch(`/api/admin/quiz-management?labId=${labId}`, {
        method: "DELETE"
      })

      if (res.ok) {
        await fetchQuizzes()
      }
    } catch (error) {
      console.error("Failed to remove quiz:", error)
    } finally {
      setUpdating(null)
    }
  }

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSubject = filterSubject === "all" || quiz.subject === filterSubject
    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "enabled" && quiz.quizEnabled) ||
      (filterStatus === "disabled" && !quiz.quizEnabled) ||
      (filterStatus === "has-questions" && quiz.hasQuestions) ||
      (filterStatus === "no-questions" && !quiz.hasQuestions)
    const matchesSearch = 
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.labNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.subject.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSubject && matchesStatus && matchesSearch
  })

  const stats = {
    total: quizzes.length,
    enabled: quizzes.filter(q => q.quizEnabled).length,
    hasQuestions: quizzes.filter(q => q.hasQuestions).length,
    totalQuestions: quizzes.reduce((sum, q) => sum + q.questionCount, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"></div>
        <div
          className="absolute bottom-0 -right-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/20 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white transition-all shadow-sm hover:shadow-lg" title="Back to Main Page">
              <Home className="h-5 w-5" />
            </Link>
            <Link href="/admin/dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white transition-all shadow-sm hover:shadow-lg" title="Back to Dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg">
              <ClipboardList className="h-5 w-5" />
            </div>
            <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-200 hidden sm:inline">
              Quiz Management
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <ModeToggle />
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-7xl px-4 py-8 animate-slide-up">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Labs</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-200 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Enabled Quizzes</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.enabled}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">With Questions</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.hasQuestions}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Questions</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.totalQuestions}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Filter className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Search className="w-4 h-4 inline mr-2" />
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, lab number, or subject..."
                className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Filter className="w-4 h-4 inline mr-2" />
                Subject
              </label>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              >
                <option value="all">All Status</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
                <option value="has-questions">Has Questions</option>
                <option value="no-questions">No Questions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quiz List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading quizzes...</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <ClipboardList className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-lg text-slate-600 dark:text-slate-400">No quizzes found</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        quiz.subject === "ITCS123" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                        quiz.subject === "ITCS223" ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" :
                        quiz.subject === "ITCS227" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" :
                        quiz.subject === "ITCS251" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        quiz.subject === "ITCS255" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                        quiz.subject === "ITDS283" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      }`}>
                        {quiz.subject}
                      </span>
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {quiz.labNumber}
                      </span>
                      {!quiz.isActive && (
                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200 mb-2">
                      {quiz.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        {quiz.hasQuestions ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-slate-600 dark:text-slate-400">
                              {quiz.questionCount} {quiz.questionCount === 1 ? 'question' : 'questions'}
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                            <span className="text-slate-500 dark:text-slate-500">No questions</span>
                          </>
                        )}
                      </div>
                      {quiz.timeLimitEnabled && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-slate-600 dark:text-slate-400">
                            {quiz.timeLimit} min limit
                          </span>
                        </div>
                      )}
                      {quiz.hasCategories && (
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-slate-600 dark:text-slate-400">Categorized</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleQuiz(quiz.id, quiz.quizEnabled)}
                      disabled={updating === quiz.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
                        quiz.quizEnabled
                          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      {quiz.quizEnabled ? (
                        <>
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">Enabled</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4" />
                          <span className="hidden sm:inline">Disabled</span>
                        </>
                      )}
                    </button>

                    {quiz.hasQuestions && (
                      <button
                        onClick={() => removeQuiz(quiz.id)}
                        disabled={updating === quiz.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-all disabled:opacity-50"
                        title="Remove all quiz data"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
