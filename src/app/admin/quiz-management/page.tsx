"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ClipboardList, Search, Filter, Eye, EyeOff, Trash2, Clock, CheckCircle, XCircle, Home, Plus, BookOpen } from "lucide-react"
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
  const [subjects, setSubjects] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSubject, setFilterSubject] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)

  // Create Quiz Lab state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createSubject, setCreateSubject] = useState<string>("")
  const [createLabNumber, setCreateLabNumber] = useState<string>("1")
  const [createTitle, setCreateTitle] = useState<string>("Quiz 1 - Check Your Understanding")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchQuizzes()
  }, [])

  async function fetchQuizzes() {
    try {
      const res = await fetch("/api/admin/quiz-management")
      const data = await res.json()
      if (data.quizzes) {
        setQuizzes(data.quizzes)
      }
      
      let fetchedSubjects: string[] = data.subjects || []

      // Also fetch from /api/subjects to get any subject configured for quiz management
      try {
        const subRes = await fetch("/api/subjects")
        const subData = await subRes.json()
        if (subData.subjects && Array.isArray(subData.subjects)) {
          const allCodes = subData.subjects.map((s: any) => s.code.toUpperCase())
          fetchedSubjects = Array.from(new Set([...fetchedSubjects, ...allCodes]))
        }
      } catch (e) {
        console.error("Failed to fetch subjects list", e)
      }

      setSubjects(fetchedSubjects)
      if (fetchedSubjects.length > 0 && !createSubject) {
        setCreateSubject(fetchedSubjects[0])
      }

      // Check URL search params for subject filter
      const params = new URLSearchParams(window.location.search)
      const subjectParam = params.get('subject')
      if (subjectParam) {
        setFilterSubject(subjectParam.toUpperCase())
        setCreateSubject(subjectParam.toUpperCase())
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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labId,
          quizEnabled: !currentStatus,
        }),
      })

      if (res.ok) {
        await fetchQuizzes()
      }
    } catch (error) {
      console.error("Failed to toggle quiz status:", error)
    } finally {
      setUpdating(null)
    }
  }

  async function removeQuiz(labId: string, deleteRecord: boolean = true) {
    const message = deleteRecord
      ? "Are you sure you want to PERMANENTLY DELETE this Quiz Lab? This will delete the lab assignment and all student scores."
      : "Are you sure you want to disable quiz and clear questions for this lab?"

    if (!confirm(message)) return

    setUpdating(labId)
    try {
      const res = await fetch(`/api/admin/quiz-management?labId=${labId}&deleteLab=${deleteRecord}`, {
        method: "DELETE",
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

  const handleCreateQuizLab = async () => {
    if (!createLabNumber.trim() || !createTitle.trim() || !createSubject) {
      alert("Subject, Quiz Number, and Title are required.")
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labNumber: createLabNumber.trim(),
          title: createTitle.trim(),
          subject: createSubject.toUpperCase(),
          labType: "Lab",
          isActive: true,
          fileName: `quiz_${createLabNumber.trim()}.html`
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        // Enable quiz automatically
        await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_settings",
            labNumber: createLabNumber.trim(),
            subject: createSubject.toUpperCase(),
            quizEnabled: true,
            quizTimeLimit: 0,
            quizTimeLimitEnabled: false
          })
        })

        await fetchQuizzes()
        setShowCreateModal(false)
        setCreateLabNumber("")
        setCreateTitle("")
      } else {
        alert(data.error || "Failed to create quiz lab")
      }
    } catch (err: any) {
      console.error("Failed to create quiz lab:", err)
      alert(err.message || "Failed to create quiz lab")
    } finally {
      setIsCreating(false)
    }
  }

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSubject = filterSubject === "all" || quiz.subject.toUpperCase() === filterSubject.toUpperCase()
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
            <button
              onClick={() => {
                setCreateLabNumber((quizzes.length + 1).toString())
                setCreateTitle(`Quiz ${quizzes.length + 1} - Check Your Understanding`)
                setShowCreateModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all text-sm"
            >
              <Plus className="w-4 h-4" /> Create New Quiz Lab
            </button>
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
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium font-mono">Total Labs</p>
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
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium font-mono">Enabled Quizzes</p>
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
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium font-mono">With Questions</p>
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
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium font-mono">Total Questions</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.totalQuestions}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Filter className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Actions Bar */}
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
                className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium"
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
                className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold"
              >
                <option value="all">All Subjects ({subjects.length})</option>
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
                className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="enabled">Enabled Only</option>
                <option value="disabled">Disabled Only</option>
                <option value="has-questions">Has Questions</option>
                <option value="no-questions">No Questions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quizzes Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-2 text-slate-500">Loading quizzes...</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <ClipboardList className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">No quiz labs found for {filterSubject === 'all' ? 'any subject' : filterSubject}</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">Click below to create a new quiz lab for this subject.</p>
            <button
              onClick={() => {
                if (filterSubject !== 'all') setCreateSubject(filterSubject);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-md text-sm"
            >
              <Plus className="w-4 h-4" /> Create New Quiz Lab
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map(quiz => (
              <div
                key={quiz.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                      {quiz.subject} - Lab {quiz.labNumber}
                    </span>
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        quiz.quizEnabled
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {quiz.quizEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 line-clamp-1">
                    {quiz.title}
                  </h3>

                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mt-4">
                    <div className="flex items-center justify-between">
                      <span>Questions:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-200 font-mono">
                        {quiz.questionCount} {quiz.questionCount === 1 ? 'question' : 'questions'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Time Limit:</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-200">
                        {quiz.timeLimitEnabled ? `${quiz.timeLimit} mins` : 'No limit'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggleQuiz(quiz.id, quiz.quizEnabled)}
                    disabled={updating === quiz.id}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      quiz.quizEnabled
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {quiz.quizEnabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {quiz.quizEnabled ? "Disable" : "Enable"}
                  </button>

                  <Link
                    href={`/admin/${quiz.subject.toLowerCase()}/quiz`}
                    className="flex-1 py-2 px-3 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center transition-all shadow-sm"
                  >
                    Edit Questions
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Create New Quiz Lab
                </h3>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Subject Code
                  </label>
                  <select
                    value={createSubject}
                    onChange={(e) => setCreateSubject(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-200 font-bold"
                  >
                    {subjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Quiz / Lab Number
                  </label>
                  <input
                    type="text"
                    value={createLabNumber}
                    onChange={(e) => setCreateLabNumber(e.target.value)}
                    placeholder="e.g. 1, 2, or Quiz 1"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-200 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Quiz 1 - Introduction to Variables"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-slate-200 font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQuizLab}
                  disabled={isCreating || !createLabNumber.trim() || !createTitle.trim()}
                  className="px-5 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Quiz Lab'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
