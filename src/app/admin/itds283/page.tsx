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
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-red-600 text-white font-bold shadow-lg">
                <Smartphone className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                ITDS283 Admin
              </span>
            </div>

            <div className="flex items-center gap-4 md:gap-6">
              <Link
                href="/admin/dashboard"
                className="text-sm font-medium text-slate-500 hover:text-rose-700 dark:hover:text-rose-300 transition-colors whitespace-nowrap"
              >
                &larr; <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
            ITDS283 - Mobile Development
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Mobile dev labs score management and grading system
          </p>
        </div>

        <div className="glass-card p-8 rounded-2xl">
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
              className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold py-4 px-6 rounded-xl shadow-xl shadow-rose-500/20 transition-all"
            >
              Submit Grade
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
