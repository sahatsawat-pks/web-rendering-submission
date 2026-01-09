"use client"

import { useState, useEffect } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import { Eye, EyeOff, ArrowUp, ArrowDown, Plus, X, FolderPlus } from "lucide-react"

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

const ICON_OPTIONS = [
  'Code', 'Code2', 'Database', 'Terminal', 'Smartphone', 'Layers', 
  'BarChart3', 'Server', 'Globe', 'BookOpen', 'Cpu', 'Binary'
]

const COLOR_OPTIONS = [
  { name: 'Blue-Sky', value: 'from-blue-500 to-sky-500' },
  { name: 'Purple-Pink', value: 'from-purple-500 to-pink-500' },
  { name: 'Orange-Amber', value: 'from-orange-500 to-amber-500' },
  { name: 'Teal-Cyan', value: 'from-teal-500 to-cyan-500' },
  { name: 'Indigo-Violet', value: 'from-indigo-500 to-violet-500' },
  { name: 'Emerald-Green', value: 'from-emerald-500 to-green-500' },
  { name: 'Rose-Red', value: 'from-rose-500 to-red-500' },
  { name: 'Slate-Gray', value: 'from-slate-500 to-gray-500' }
]

export default function SubjectManagementPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newSubject, setNewSubject] = useState({
    code: '',
    title: '',
    description: '',
    icon: 'Code',
    color: 'from-blue-500 to-indigo-500',
    isVisible: true
  })

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

  async function handleCreateSubject() {
    if (!newSubject.code || !newSubject.title) {
      alert("Please fill in required fields (Code and Title)")
      return
    }

    // Validate code format (uppercase letters and numbers only)
    if (!/^[A-Z0-9]+$/.test(newSubject.code)) {
      alert("Subject code must contain only uppercase letters and numbers")
      return
    }

    setSaving('creating')
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSubject,
          displayOrder: subjects.length
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          alert(`Subject ${newSubject.code} created successfully!\n\nNext steps:\n1. Add permissions for users in Account Management\n2. Create route folders: /src/app/${newSubject.code.toLowerCase()} and /src/app/admin/${newSubject.code.toLowerCase()}\n3. Add lab configurations in Lab Management`)
          setShowCreateDialog(false)
          setNewSubject({
            code: '',
            title: '',
            description: '',
            icon: 'Code',
            color: 'from-blue-500 to-indigo-500',
            isVisible: true
          })
          await fetchSubjects()
        } else {
          alert(data.error || "Failed to create subject")
        }
      } else {
        const data = await res.json()
        alert(data.error || "Failed to create subject")
      }
    } catch (e) {
      alert("An error occurred while creating subject")
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
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
              Subject Modules
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Control which subjects appear on the main landing page. Drag to reorder display sequence.
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Create Subject</span>
          </button>
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

      {/* Create Subject Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                  <FolderPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create New Subject</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Add a new course to the system</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateDialog(false)}
                disabled={saving === 'creating'}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Subject Code */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Subject Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })}
                  placeholder="ITCS999"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={saving === 'creating'}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Uppercase letters and numbers only (e.g., ITCS123, CS101)
                </p>
              </div>

              {/* Subject Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Subject Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSubject.title}
                  onChange={(e) => setNewSubject({ ...newSubject, title: e.target.value })}
                  placeholder="Advanced Web Development"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={saving === 'creating'}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                  placeholder="Lab submission and automated testing system."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  disabled={saving === 'creating'}
                />
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Icon
                </label>
                <select
                  value={newSubject.icon}
                  onChange={(e) => setNewSubject({ ...newSubject, icon: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={saving === 'creating'}
                >
                  {ICON_OPTIONS.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Color Gradient
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewSubject({ ...newSubject, color: color.value })}
                      disabled={saving === 'creating'}
                      className={`px-4 py-3 rounded-lg border-2 transition-all ${
                        newSubject.color === color.value
                          ? 'border-green-500 dark:border-green-400'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-full h-8 bg-gradient-to-r ${color.value} rounded mb-2`}></div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{color.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Make Visible</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Show on main landing page</p>
                </div>
                <button
                  onClick={() => setNewSubject({ ...newSubject, isVisible: !newSubject.isVisible })}
                  disabled={saving === 'creating'}
                  className={`w-14 h-8 rounded-full transition-colors ${
                    newSubject.isVisible ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                    newSubject.isVisible ? 'translate-x-7' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateDialog(false)}
                  disabled={saving === 'creating'}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSubject}
                  disabled={saving === 'creating' || !newSubject.code || !newSubject.title}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving === 'creating' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Subject
                    </>
                  )}
                </button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">After Creating:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• Add user permissions in <strong>Account Management</strong></li>
                  <li>• Create route folders: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">/src/app/{newSubject.code.toLowerCase()}</code></li>
                  <li>• Create admin routes: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">/src/app/admin/{newSubject.code.toLowerCase()}</code></li>
                  <li>• Configure labs in <strong>Lab Management</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
