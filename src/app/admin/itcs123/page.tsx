"use client"

import type React from "react"

import LogoutButton from "@/components/LogoutButton"
import { useState, useEffect } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  const router = useRouter()
  const [labs, setLabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'LA' | 'Lecturer'>('LA')
  const [username, setUsername] = useState('')
  const [hasAccess, setHasAccess] = useState(false)

  const [studentId, setStudentId] = useState("")
  const [selectedLab, setSelectedLab] = useState("")
  const [labScore, setLabScore] = useState("0")
  const [challengeScore, setChallengeScore] = useState("0")
  const [showScoreDialog, setShowScoreDialog] = useState(false)
  const [gradingSuccess, setGradingSuccess] = useState(false)
  const [gradingError, setGradingError] = useState<string | null>(null)
  const [lastSubmittedStudentId, setLastSubmittedStudentId] = useState("")

  useEffect(() => {
    async function fetchLabs() {
      try {
        const res = await fetch("/api/labs?activeOnly=true&subject=ITCS123")
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
        // Check if user has access to ITCS123 (or is main admin)
        if (data.username === 'kanzaki_aito' || (data.permissions && data.permissions.itcs123)) {
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

  async function handleGradeSubmit(e: React.FormEvent, scoreType: 'lab' | 'challenge' | 'both') {
    e.preventDefault()
    setGradingError(null)
    setGradingSuccess(false)

    if (!showScoreDialog) {
      // Show dialog first
      setShowScoreDialog(true)
      return
    }

    // Submit based on score type
    try {
        const payload: any = {
            action: 'update',
            username: studentId,
            labNumber: selectedLab,
            subject: 'ITCS123'
        };

        // Add appropriate scores based on type
        if (scoreType === 'lab' || scoreType === 'both') {
            payload.labScore = parseInt(labScore);
        }
        if (scoreType === 'challenge' || scoreType === 'both') {
            payload.challengeScore = parseInt(challengeScore);
        }

        const res = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
             setLastSubmittedStudentId(studentId);
             setGradingSuccess(true);
             // Keep the form visible and attached - only clear student ID for next entry
             setStudentId("");
             // Keep the lab selected, score dialog open, and scores at their values
             // so the grader can quickly enter the next student
             setTimeout(() => setGradingSuccess(false), 5000);
        } else {
            const data = await res.json();
            setGradingError(data.error || "Failed to update score");
        }
    } catch (err: any) {
        setGradingError(err.message || "An unexpected error occurred");
    }
  }

  const [isFilling, setIsFilling] = useState(false);

  async function handleFillMissing() {
      if (!selectedLab) {
          alert("Please select a lab first.");
          return;
      }
      if (!confirm(`Are you sure you want to fill ALL missing scores for Lab ${selectedLab} with 0?`)) {
          return;
      }

      setIsFilling(true);
      try {
          const res = await fetch('/api/scores', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  action: 'fill_missing',
                  labNumber: selectedLab,
                  subject: 'ITCS123'
              })
          });

          const data = await res.json();
          if (data.success) {
              alert(data.message);
          } else {
              alert("Error: " + data.message);
          }
      } catch (e) {
          alert("Failed to fill scores.");
      } finally {
          setIsFilling(false);
      }
  }

  // Show loading while checking permissions
  if (!hasAccess && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-orange-200 dark:border-orange-800 border-t-orange-600 dark:border-t-orange-400"></div>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Checking permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
      {/* Animated Background - Further reduced opacity */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"></div>
        <div
          className="absolute bottom-0 -right-4 w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      {/* Glass Navbar */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/20 shadow-sm">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 text-white font-bold shadow-lg shadow-orange-500/30 text-xs">
                OOP
              </div>
              <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                ITCS123
              </span>
            </div>

            <div className="flex items-center gap-4 md:gap-6">
              <a
                 href="/admin/dashboard"
                 className="text-sm font-medium text-slate-500 hover:text-orange-600 transition-colors whitespace-nowrap"
              >
                &larr; <span className="hidden sm:inline">Hub</span>
              </a>
              <span
                className="text-sm font-medium text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400 h-16 flex items-center px-1 whitespace-nowrap"
              >
                Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-7xl px-4 py-8 flex flex-col lg:flex-row gap-8 relative z-10">
        {/* Main Content Column */}
        <div className="flex-1 space-y-8">
          {/* Welcome Section */}
          <div className="animate-slide-up">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">ITCS123 Dashboard</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">Welcome back. Here's what's happening today.</p>
          </div>

          {/* Grading Interface Section */}
          <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-300 border-white/40">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-orange-600 dark:text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                Student Lab Grader
              </h3>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g., 6488001"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 shadow-sm hover:border-orange-300 dark:hover:border-orange-600 transition-all font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">Ref: Column A2:A9999</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Lab Assignment
                  </label>
                  <select
                    value={selectedLab}
                    onChange={(e) => {
                      setSelectedLab(e.target.value)
                      if (e.target.value) {
                        setShowScoreDialog(true)
                      }
                    }}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 shadow-sm hover:border-orange-300 dark:hover:border-orange-600 transition-all"
                  >
                    <option value="">Select Lab</option>
                    {labs.filter(lab => (lab.labType || 'Lab') === 'Lab').map((lab) => (
                      <option key={lab.id} value={lab.labNumber}>
                        Lab {lab.labNumber}: {lab.title}
                      </option>
                    ))}
                  </select>
                </div>

                {showScoreDialog && selectedLab && (
                  <div className="col-span-1 md:col-span-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-orange-900 dark:text-orange-300 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Score Entry for Lab {selectedLab}
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Lab Score
                        </label>
                        <select
                          value={labScore}
                          onChange={(e) => setLabScore(e.target.value)}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 shadow-sm hover:border-orange-300 dark:hover:border-orange-600 transition-all"
                        >
                          <option value="0">0 - Not Submitted</option>
                          <option value="1">1 - Partial</option>
                          <option value="2">2 - Complete</option>
                        </select>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Column: Lab{selectedLab.padStart(2, '0')} (2)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Challenge Score
                        </label>
                        <select
                          value={challengeScore}
                          onChange={(e) => setChallengeScore(e.target.value)}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 shadow-sm hover:border-orange-300 dark:hover:border-orange-600 transition-all"
                        >
                          <option value="0">0 - Not Submitted</option>
                          <option value="1">1 - Partial</option>
                          <option value="2">2 - Complete</option>
                        </select>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Column: Ch{selectedLab.padStart(2, '0')} (2)</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={(e) => handleGradeSubmit(e, 'lab')}
                      className="px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-md shadow-blue-500/30 transition-all btn-hover-lift flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Add Lab Only
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleGradeSubmit(e, 'challenge')}
                      className="px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-xl shadow-md shadow-amber-500/30 transition-all btn-hover-lift flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Add Challenge Only
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleGradeSubmit(e, 'both')}
                      className="px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-xl shadow-md shadow-orange-500/30 transition-all btn-hover-lift flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Add Both Scores
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleFillMissing}
                    disabled={isFilling || !selectedLab}
                    className="px-6 py-3 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl border border-amber-200 dark:border-amber-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    title="Fill all empty cells in this lab column with 0"
                  >
                     {isFilling ? (
                         <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                     ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                     )}
                     Fill Missing (0)
                  </button>
              </div>

              {gradingSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <span className="font-semibold">Success!</span>
                    <p className="text-xs opacity-90 mt-0.5">
                       Lab & Challenge scores updated for Student {lastSubmittedStudentId} in ITCS123 Sheet.
                    </p>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Timeline / Labs Section */}
          <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-300 border-white/40">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-orange-600 dark:text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Active Labs
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1.5 bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-medium border border-orange-200 dark:border-orange-700 shadow-sm">
                  {labs.filter(lab => (lab.labType || 'Lab') === 'Lab').length} Active
                </span>
                {role === 'Lecturer' && (
                  <a href="/admin/itcs123/tests" className="px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-xs font-medium border border-orange-200 dark:border-orange-800 shadow-sm hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors">
                    Manage Test Cases
                  </a>
                )}
                {role === 'Lecturer' && (
                  <a href="/admin/labs" className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                     New Lab
                  </a>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-orange-200 dark:border-orange-800 border-t-orange-600 dark:border-t-orange-400"></div>
                <p className="text-slate-500 dark:text-slate-400 mt-4">Loading labs...</p>
              </div>
            ) : labs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-base font-medium">No active labs found</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Create a new lab to get started</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {labs.filter(lab => (lab.labType || 'Lab') === 'Lab').map((lab) => (
                  <div
                    key={lab.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-lg hover:shadow-orange-500/5 transition-all smooth-transition group"
                  >
                    <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
                      {lab.labNumber}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 mb-1 truncate">{lab.title}</h4>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {lab.deadline ? `Due: ${lab.deadline}` : "No deadline set"}
                      </p>
                    </div>
                    {(role === 'Lecturer' || username === 'kanzaki_aito') && (
                      <a
                        href="/admin/labs"
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-lg shadow-md shadow-orange-500/30 transition-all btn-hover-lift"
                      >
                        Manage
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          
        </div>


      </main>
    </div>
  )
}
