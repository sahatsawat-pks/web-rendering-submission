"use client"

import type React from "react"

import LogoutButton from "@/components/LogoutButton"
import { useState, useEffect } from "react"
import { ModeToggle } from "@/components/mode-toggle"

// Mock Data for "Recently Accessed"
const RECENT_TOOLS = [
  {
    title: "Lab Management",
    code: "MUICT_LABS",
    href: "/admin/labs",
    color: "from-blue-600 to-cyan-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
    description: "Manage lab assignments and file structures.",
  },
  {
    title: "Account Management",
    code: "ADMIN_USERS",
    href: "/admin/users",
    color: "from-purple-600 to-pink-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    description: "Manage system administrators and permissions.",
  },
  {
    title: "Submission Viewer",
    code: "VIEWER_SITE",
    href: "/",
    color: "from-teal-600 to-emerald-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
    description: "View student submissions and renders.",
  },
]

export default function AdminDashboard() {
  const [labs, setLabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [studentId, setStudentId] = useState("")
  const [selectedLab, setSelectedLab] = useState("")
  const [score, setScore] = useState("0")
  const [gradingSuccess, setGradingSuccess] = useState(false)
  const [gradingError, setGradingError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLabs() {
      try {
        const res = await fetch("/api/labs?activeOnly=true&subject=ITCS223")
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
  }, [])

  async function handleGradeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGradingError(null)
    setGradingSuccess(false)

    // Placeholder: This would connect to OneDrive/Excel API in production
    console.log("[v0] Grading submission:", { studentId, lab: selectedLab, score })

    // Simulate API call
    setTimeout(() => {
      setGradingSuccess(true)
      setStudentId("")
      setScore("0")
      setTimeout(() => setGradingSuccess(false), 3000)
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
      {/* Animated Background - Further reduced opacity */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"></div>
        <div
          className="absolute bottom-0 -right-4 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      {/* Glass Navbar */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/20 shadow-sm">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white font-bold shadow-lg shadow-teal-500/30 text-xs">
                ICT
              </div>
              <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                ITCS223
              </span>
            </div>

            <div className="flex items-center gap-4 md:gap-6">
              <a
                 href="/admin/dashboard"
                 className="text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors whitespace-nowrap"
              >
                &larr; <span className="hidden sm:inline">Hub</span>
              </a>
              <span
                className="text-sm font-medium text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 h-16 flex items-center px-1 whitespace-nowrap"
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
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">ITCS223 Dashboard</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">Welcome back. Here's what's happening today.</p>
          </div>

          {/* Grading Interface Section */}
          <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-teal-500/5 transition-all duration-300 border-white/40">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-teal-600 dark:text-teal-400"
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

            <form onSubmit={handleGradeSubmit} className="space-y-4">
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 shadow-sm hover:border-teal-300 dark:hover:border-teal-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Lab Assignment
                  </label>
                  <select
                    value={selectedLab}
                    onChange={(e) => setSelectedLab(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 shadow-sm hover:border-teal-300 dark:hover:border-teal-600 transition-all"
                  >
                    <option value="">Select Lab</option>
                    {labs.map((lab) => (
                      <option key={lab.id} value={lab.labNumber}>
                        Lab {lab.labNumber}: {lab.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Score</label>
                  <select
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 shadow-sm hover:border-teal-300 dark:hover:border-teal-600 transition-all"
                  >
                    <option value="0">0 - Not Submitted</option>
                    <option value="1">1 - Partial</option>
                    <option value="2">2 - Complete</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full md:w-auto px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 rounded-xl shadow-md shadow-teal-500/30 transition-all btn-hover-lift"
              >
                Update Score to Spreadsheet
              </button>

              {gradingSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm">
                  Score updated successfully! (Placeholder - will sync to OneDrive/Excel)
                </div>
              )}
            </form>
          </div>

          {/* Timeline / Labs Section */}
          <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-teal-500/5 transition-all duration-300 border-white/40">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-teal-600 dark:text-teal-400"
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
                <span className="px-3 py-1.5 bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 rounded-lg text-xs font-medium border border-teal-200 dark:border-teal-700 shadow-sm">
                  {labs.length} Active
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-teal-200 dark:border-teal-800 border-t-teal-600 dark:border-t-teal-400"></div>
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
                {labs.map((lab) => (
                  <div
                    key={lab.id}
                    className="flex items-center gap-5 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-lg hover:shadow-teal-500/5 transition-all smooth-transition group"
                  >
                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform duration-300">
                      {lab.labNumber}
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">{lab.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
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
                    <a
                      href="/admin/labs?subject=ITCS223"
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 rounded-lg shadow-md shadow-teal-500/30 transition-all btn-hover-lift"
                    >
                      Manage
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently Accessed Tools */}
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Quick Access</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {RECENT_TOOLS.map((tool) => (
                <a
                  key={tool.code}
                  href={tool.href}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all hover:shadow-2xl hover:shadow-teal-500/10 hover:border-teal-200 dark:hover:border-teal-700 smooth-transition h-full"
                >
                  <div className={`h-32 w-full relative overflow-hidden bg-gradient-to-br ${tool.color}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20"></div>
                    <div className="absolute bottom-4 left-4 text-white">{tool.icon}</div>
                    <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <div className="w-20 h-20 rounded-full border-4 border-white"></div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {tool.code}
                    </div>
                    <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
                      {tool.description}
                    </p>
                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                      <span>Open tool</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>


      </main>
    </div>
  )
}
