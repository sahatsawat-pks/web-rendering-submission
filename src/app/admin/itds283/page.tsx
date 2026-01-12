"use client"

import type React from "react"
import { Smartphone } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ITDS283AdminPage() {
  const router = useRouter()
  const [labs, setLabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'LA' | 'Lecturer'>('LA')
  const [username, setUsername] = useState('')
  const [hasAccess, setHasAccess] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [selectedLab, setSelectedLab] = useState("")
  const [score, setScore] = useState("0")
  const [gradingSuccess, setGradingSuccess] = useState(false)
  const [gradingError, setGradingError] = useState<string | null>(null)
  const [togglingQuiz, setTogglingQuiz] = useState<number | null>(null)

  // New Lab Dialog state
  const [showNewLabDialog, setShowNewLabDialog] = useState(false)
  const [newLabData, setNewLabData] = useState({
    labNumber: "",
    title: "",
    fileName: "index.html",
    isActive: true,
    deadline: "",
    totalScore: ""
  })
  const [creatingLab, setCreatingLab] = useState(false)

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    async function fetchLabs() {
      try {
        const res = await fetch("/api/labs?activeOnly=true&subject=ITDS283")
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setLabs(data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber)))
          }
        }
      } catch (e) {
        console.error("Failed to fetch labs", e)
      } finally {
        setLoading(false)
      }
    }
    fetchLabs()

    // Fetch user role and permissions
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.role) {
          setRole(data.role)
        }
        if (data.username) {
          setUsername(data.username)
        }
        // Check if user has access to ITDS283 (or is main admin)
        if (data.username === 'kanzaki_aito' || (data.permissions && data.permissions.itds283)) {
          setHasAccess(true)
        } else {
          // Redirect to admin dashboard if no access
          router.push('/admin/dashboard')
        }
      })
      .catch(err => {
        console.error("Failed to fetch user role", err)
        router.push('/admin/dashboard')
      })
  }, [])

  async function handleGradeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGradingError(null)
    setGradingSuccess(false)

    if (!studentId || !selectedLab) {
      setGradingError("Please fill all fields")
      return
    }

    try {
        const res = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                username: studentId,
                labNumber: selectedLab,
                subject: 'ITDS283',
                labScore: parseInt(score)
            })
        })

        if (res.ok) {
             setGradingSuccess(true)
             setStudentId("")
             setTimeout(() => setGradingSuccess(false), 5000)
        } else {
            const data = await res.json()
            setGradingError(data.error || "Failed to update score")
        }
    } catch (err: any) {
        setGradingError(err.message || "An unexpected error occurred")
    }
  }

  async function toggleQuiz(labId: number, currentStatus: boolean) {
    setTogglingQuiz(labId)
    try {
      const res = await fetch('/api/admin/quiz-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId, enabled: !currentStatus })
      })
      const data = await res.json()
      if (data.success) {
        // Refresh lab list
        const labsRes = await fetch("/api/labs?activeOnly=true&subject=ITDS283")
        if (labsRes.ok) {
          const labsData = await labsRes.json()
          if (labsData.success) {
            setLabs(labsData.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber)))
          }
        }
      }
    } catch (e) {
      console.error("Failed to toggle quiz", e)
    } finally {
      setTogglingQuiz(null)
    }
  }

  async function handleCreateLab(e: React.FormEvent) {
    e.preventDefault()
    setCreatingLab(true)
    
    try {
      const response = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLabData,
          subject: "ITDS283",
          totalScore: newLabData.totalScore ? parseInt(newLabData.totalScore) : undefined
        })
      })
      
      if (response.ok) {
        setNewLabData({
          labNumber: "",
          title: "",
          fileName: "index.html",
          isActive: true,
          deadline: "",
          totalScore: ""
        })
        setShowNewLabDialog(false)
        
        const labsRes = await fetch("/api/labs?activeOnly=true&subject=ITDS283")
        if (labsRes.ok) {
          const data = await labsRes.json()
          if (data.success) {
            setLabs(data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber)))
          }
        }
      } else {
        const data = await response.json()
        alert(data.error || "Failed to create lab")
      }
    } catch (error) {
      console.error("Failed to create lab:", error)
      alert("Failed to create lab")
    } finally {
      setCreatingLab(false)
    }
  }

  // Show loading screen while checking access
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-rose-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Checking access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-rose-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"></div>
        <div
          className="absolute bottom-0 -right-4 w-96 h-96 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-8">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-red-600 text-white font-bold shadow-lg">
                <Smartphone className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <span className="text-base md:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                ITDS283 Admin
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4 md:gap-6">
              <Link
                href="/admin/dashboard"
                className="text-sm font-medium text-slate-500 hover:text-rose-700 dark:hover:text-rose-300 transition-colors whitespace-nowrap"
              >
                &larr; Back to Dashboard
              </Link>
              <span
                className="text-sm font-medium text-rose-600 dark:text-rose-400 border-b-2 border-rose-600 dark:border-rose-400 h-16 flex items-center px-1 whitespace-nowrap"
              >
                Dashboard
              </span>
              <Link
                href="/admin/quiz-management?subject=ITDS283"
                className="text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors whitespace-nowrap"
              >
                Quiz Management
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <ModeToggle />
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg">
            <div className="container mx-auto max-w-7xl px-4 py-4 space-y-2">
              <Link
                href="/admin/dashboard"
                className="block px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
              >
                &larr; Back to Dashboard
              </Link>
              <div className="block px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                Dashboard
              </div>
              <Link
                href="/admin/quiz-management?subject=ITDS283"
                className="block px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
              >
                Quiz Management
              </Link>
              <div className="sm:hidden pt-2 border-t border-slate-200 dark:border-slate-700">
                <LogoutButton />
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="container mx-auto max-w-6xl px-4 py-8 relative z-10">
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              ITDS283 - Mobile Development
            </h1>
            <div className="flex gap-2">
              {role === 'Lecturer' && (
                <a href="/admin/itds283/quiz" className="px-4 py-2 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg text-sm font-medium border border-pink-200 dark:border-pink-800 shadow-sm hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors">
                  Manage Quiz
                </a>
              )}
              {role === 'Lecturer' && (
                <button onClick={() => setShowNewLabDialog(true)} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   New Lab
                </button>
              )}
            </div>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Mobile dev labs score management and grading system
          </p>
        </div>

        <div className="glass-card p-8 rounded-2xl animate-scale-in hover:shadow-2xl hover:shadow-rose-500/5 transition-all duration-300">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Grade Lab Submission</h2>
          
          {gradingSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 p-4 rounded-xl mb-6 animate-fade-in">
              ✓ Score updated successfully!
            </div>
          )}

          {gradingError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 animate-fade-in">
              {gradingError}
            </div>
          )}

          <form onSubmit={handleGradeSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Student ID</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                placeholder="Enter student ID"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Lab</label>
              <select
                value={selectedLab}
                onChange={(e) => setSelectedLab(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                required
              >
                <option value="">Select Lab</option>
                {labs.map(lab => (
                  <option key={lab.id} value={lab.labNumber}>Lab {lab.labNumber}: {lab.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Score</label>
              <select
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                <option value="0">0 - No Submission</option>
                <option value="1">1 - Incomplete</option>
                <option value="2">2 - Complete</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold py-4 px-6 rounded-xl shadow-xl shadow-rose-500/20 transition-all btn-hover-lift"
            >
              Submit Grade
            </button>
          </form>
        </div>
      </main>

      {/* New Lab Dialog */}
      {showNewLabDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create New Lab</h3>
              <button
                onClick={() => setShowNewLabDialog(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateLab} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Lab Number *
                </label>
                <input
                  type="text"
                  required
                  value={newLabData.labNumber}
                  onChange={(e) => setNewLabData({...newLabData, labNumber: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g., Lab01"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={newLabData.title}
                  onChange={(e) => setNewLabData({...newLabData, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g., Mobile App Basics"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={newLabData.fileName}
                  onChange={(e) => setNewLabData({...newLabData, fileName: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="index.html"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Total Score
                </label>
                <input
                  type="number"
                  value={newLabData.totalScore}
                  onChange={(e) => setNewLabData({...newLabData, totalScore: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  value={newLabData.deadline}
                  onChange={(e) => setNewLabData({...newLabData, deadline: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newLabData.isActive}
                  onChange={(e) => setNewLabData({...newLabData, isActive: e.target.checked})}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-2 focus:ring-rose-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Active Lab
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewLabDialog(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLab}
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-lg shadow-rose-500/30 transition-all disabled:opacity-50"
                >
                  {creatingLab ? "Creating..." : "Create Lab"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
