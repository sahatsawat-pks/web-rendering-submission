"use client"

import { useState, useEffect } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import { Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react"

interface Subject {
  id: number
  code: string
  title: string
  description: string
  icon: string
  color: string
  isVisible: boolean
  displayOrder: number
}

export default function SubjectManagementPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchSubjects()
  }, [])

  async function fetchSubjects() {
    try {
      const res = await fetch("/api/subjects")
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setSubjects(data.subjects)
        }
      }
    } catch (e) {
      // Error handled by UI
    } finally {
      setLoading(false)
    }
  }

  async function toggleVisibility(code: string, currentValue: boolean) {
    setSaving(code)
    try {
      const res = await fetch("/api/subjects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, isVisible: !currentValue })
      })

      if (res.ok) {
        await fetchSubjects()
      } else {
        alert("Failed to update subject visibility")
      }
    } catch (e) {
      alert("An error occurred")
    } finally {
      setSaving(null)
    }
  }

  async function moveSubject(code: string, direction: "up" | "down") {
    const index = subjects.findIndex(s => s.code === code)
    if (index === -1) return
    
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= subjects.length) return

    const newSubjects = [...subjects]
    const [moved] = newSubjects.splice(index, 1)
    newSubjects.splice(targetIndex, 0, moved)

    // Update display orders
    const updates = newSubjects.map((s, i) => ({
      code: s.code,
      displayOrder: i
    }))

    setSaving(code)
    try {
      await Promise.all(
        updates.map(u =>
          fetch("/api/subjects", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(u)
          })
        )
      )
      await fetchSubjects()
    } catch (e) {
      alert("Failed to reorder subjects")
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white font-bold shadow-lg text-xs">
                SYS
              </div>
              <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Subject Management
              </span>
            </div>

            <div className="flex items-center gap-4 md:gap-6">
              <a
                href="/admin/dashboard"
                className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors whitespace-nowrap"
              >
                &larr; <span className="hidden sm:inline">Back to Dashboard</span>
              </a>
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
            Subject Modules
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Control which subjects appear on the main landing page. Drag to reorder display sequence.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-200 dark:border-slate-800 border-t-slate-600 dark:border-t-slate-400"></div>
            <p className="text-slate-500 dark:text-slate-400 mt-4">Loading subjects...</p>
          </div>
        ) : (
          <div className="glass-card p-6 rounded-2xl">
            <div className="space-y-3">
              {subjects.map((subject, index) => (
                <div
                  key={subject.code}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:shadow-lg transition-all"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveSubject(subject.code, "up")}
                      disabled={index === 0 || saving === subject.code}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveSubject(subject.code, "down")}
                      disabled={index === subjects.length - 1 || saving === subject.code}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-br ${subject.color} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                    {subject.code.substring(0, 4)}
                  </div>

                  <div className="flex-grow">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {subject.code}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{subject.title}</p>
                  </div>

                  <button
                    onClick={() => toggleVisibility(subject.code, subject.isVisible)}
                    disabled={saving === subject.code}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      subject.isVisible
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    } disabled:opacity-50`}
                  >
                    {saving === subject.code ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : subject.isVisible ? (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
