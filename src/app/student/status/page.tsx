"use client"

import type React from "react"

import { useState } from "react"
import { CheckCircle, Clock, XCircle, Github } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

interface LabStatus {
  labNumber: string
  title: string
  getAssignment: boolean
  submitted: boolean
  checked: boolean
  score?: number
}

export default function StudentStatus() {
  const [studentId, setStudentId] = useState("")
  const [labStatuses, setLabStatuses] = useState<LabStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Placeholder data generator
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Simulate API call - this would fetch real data from database
    console.log("[v0] Fetching status for student:", studentId)

    setTimeout(() => {
      // Placeholder: Generate sample data
      const sampleStatuses: LabStatus[] = [
        {
          labNumber: "01",
          title: "HTML Basics",
          getAssignment: true,
          submitted: true,
          checked: true,
          score: 2,
        },
        {
          labNumber: "02",
          title: "CSS Styling",
          getAssignment: true,
          submitted: true,
          checked: false,
        },
        {
          labNumber: "03",
          title: "JavaScript Fundamentals",
          getAssignment: true,
          submitted: false,
          checked: false,
        },
        {
          labNumber: "04",
          title: "Responsive Design",
          getAssignment: false,
          submitted: false,
          checked: false,
        },
      ]

      setLabStatuses(sampleStatuses)
      setSearched(true)
      setLoading(false)
    }, 800)
  }

  const getStatusIcon = (status: boolean, isPending = false) => {
    if (status) {
      return <CheckCircle className="w-5 h-5 text-emerald-500" />
    } else if (isPending) {
      return <Clock className="w-5 h-5 text-amber-500" />
    }
    return <XCircle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-teal-300 dark:bg-teal-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"></div>
        <div
          className="absolute top-0 -right-4 w-96 h-96 bg-cyan-300 dark:bg-cyan-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white font-bold shadow-lg shadow-teal-500/30">
              <Github className="h-6 w-6" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Student Status
              </span>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">Check Your Lab Progress</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/60"
            >
              Back to Viewer
            </a>
            <ModeToggle />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-5xl px-6 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-sm font-semibold mb-6">
            <Clock className="w-4 h-4" />
            Track Your Progress
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-4">
            Student <span className="gradient-text">Lab Status</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Enter your student ID to check your lab assignment status
          </p>
          <div className="mt-4 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-sm inline-block border border-amber-200 dark:border-amber-800">
            Placeholder - Demo data only
          </div>
        </div>

        {/* Search Form */}
        <div className="glass-card p-8 mb-8 animate-scale-in border-white/40">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter your Student ID (e.g., 6488001)"
                required
                className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base font-semibold focus:ring-4 focus:ring-teal-500/30 focus:border-teal-500 transition-all outline-none shadow-sm hover:border-teal-300 dark:hover:border-teal-600 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-xl shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/50 transition-all btn-hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Checking..." : "Check Status"}
            </button>
          </form>
        </div>

        {/* Results Table */}
        {searched && (
          <div className="glass-card overflow-hidden animate-fade-in border-white/40">
            <div className="px-8 py-6 border-b border-white/20 dark:border-slate-700/50 bg-gradient-to-r from-teal-50/50 dark:from-teal-900/20 to-cyan-50/50 dark:to-cyan-900/20">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Lab Status for Student {studentId}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Lab</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Title</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Get Assignment</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Submitted to GitHub</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">LAs Check</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {labStatuses.map((lab) => (
                    <tr key={lab.labNumber} className="hover:bg-teal-50/40 dark:hover:bg-teal-900/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center text-sm font-bold shadow-md">
                            {lab.labNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{lab.title}</td>
                      <td className="px-6 py-4 text-center">{getStatusIcon(lab.getAssignment)}</td>
                      <td className="px-6 py-4 text-center">
                        {getStatusIcon(lab.submitted, lab.getAssignment && !lab.submitted)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusIcon(lab.checked, lab.submitted && !lab.checked)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {lab.score !== undefined ? (
                          <span
                            className={`px-3 py-1 rounded-lg text-sm font-bold ${
                              lab.score === 2
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                : lab.score === 1
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {lab.score}/2
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-8 py-6 border-t border-white/20 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-400">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-slate-600 dark:text-slate-400">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  <span className="text-slate-600 dark:text-slate-400">Not Started</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
