"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import { Shield, CheckCircle2, XCircle } from "lucide-react"

interface User {
  id: string
  username: string
  createdAt: string
  permissions?: {
    itcs223: boolean
    itcs227: boolean
    itge162: boolean
    itcs123: boolean
  }
}

const SUBJECTS = [
  { code: "itcs223", name: "ITCS223 - Web Development", color: "from-teal-500 to-cyan-500" },
  { code: "itcs227", name: "ITCS227 - Data Science", color: "from-indigo-500 to-violet-500" },
  { code: "itge162", name: "ITGE162 - Physical Science", color: "from-emerald-500 to-green-500" },
  { code: "itcs123", name: "ITCS123 - OOP", color: "from-orange-500 to-amber-500" },
]

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<string>("")
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  useEffect(() => {
    fetchUsers()
    fetchCurrentUser()
  }, [])

  async function fetchCurrentUser() {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.username || "")
      }
    } catch (err) {
      console.error("Failed to fetch current user", err)
    }
  }

  async function fetchUsers() {
    try {
      const response = await fetch("/api/users")
      if (response.status === 401) {
        router.push("/admin/login")
        return
      }
      const data = await response.json()
      setUsers(data.users || [])
      setLoading(false)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user")
      }

      setFormData({ username: "", password: "" })
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      })

      if (response.status === 401) {
        router.push("/admin/login")
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete user")
      }

      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handlePermissionToggle(userId: string, subjectCode: string, currentValue: boolean) {
    try {
      const response = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          subjectCode,
          canEdit: !currentValue,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update permission")
      }

      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const isMainAdmin = currentUser === "kanzaki_aito"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-teal-200 dark:border-teal-800 border-t-teal-600 dark:border-t-teal-400"></div>
          <p className="text-slate-600 dark:text-slate-400 mt-4 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
      {/* Animated Background - Reduced opacity */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-5 dark:opacity-5 animate-float"></div>
        <div
          className="absolute bottom-0 -right-4 w-96 h-96 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-5 dark:opacity-5 animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      {/* Glass Navbar */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/20 dark:border-slate-700/50 shadow-sm">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold shadow-lg shadow-purple-500/30 text-xs">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">User Permissions</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin/dashboard"
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </a>
            <ModeToggle />
            <LogoutButton />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">Account & Permission Management</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">Manage administrators and subject-specific access rights</p>
          {!isMainAdmin && (
            <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl text-sm">
              <strong>Note:</strong> Only the main admin (kanzaki_aito) can modify user permissions.
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-xl mb-6 flex items-start gap-3 animate-slide-up">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Add User Form */}
          <div className="lg:col-span-1 animate-scale-in">
            <div className="glass-card p-8 sticky top-24 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 border-white/40 dark:border-slate-700/40">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add New Admin</h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    placeholder="Enter username"
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none shadow-sm hover:border-purple-300 dark:hover:border-purple-600 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    placeholder="Enter password"
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none shadow-sm hover:border-purple-300 dark:hover:border-purple-600 transition-all font-medium"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold tracking-wide py-4 px-6 rounded-2xl transition-all shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 btn-hover-lift mt-2"
                >
                  Create Admin
                </button>
              </form>
            </div>
          </div>

          {/* Users List with Permissions */}
          <div className="lg:col-span-2 animate-fade-in">
            <div className="glass-card overflow-hidden hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-300 border-white/40 dark:border-slate-700/40">
              <div className="px-8 py-6 border-b border-white/20 dark:border-slate-700/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Administrators & Permissions
                  <span className="ml-auto px-2.5 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold">
                    {users.length}
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <tr>
                      <th className="px-8 py-5 text-left text-sm font-semibold tracking-wide">User</th>
                      {SUBJECTS.map(subject => (
                        <th key={subject.code} className="px-4 py-5 text-center text-sm font-semibold tracking-wide">
                          {subject.code.toUpperCase()}
                        </th>
                      ))}
                      <th className="px-8 py-5 text-right text-sm font-semibold tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors group">
                        <td className="px-8 py-5 text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-purple-500/20">
                            {user.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold">{user.username}</div>
                            {user.username === "kanzaki_aito" && (
                              <div className="text-xs text-purple-600 dark:text-purple-400 font-bold">Main Admin</div>
                            )}
                          </div>
                        </td>
                        {SUBJECTS.map(subject => {
                          const hasPermission = user.permissions?.[subject.code as keyof typeof user.permissions] || user.username === "kanzaki_aito"
                          return (
                            <td key={subject.code} className="px-4 py-5 text-center">
                              <button
                                onClick={() => handlePermissionToggle(user.id, subject.code, hasPermission)}
                                disabled={!isMainAdmin || user.username === "kanzaki_aito"}
                                className={`p-2 rounded-lg transition-all ${
                                  hasPermission 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                                } ${!isMainAdmin || user.username === "kanzaki_aito" ? 'cursor-not-allowed opacity-50' : 'hover:scale-110'}`}
                              >
                                {hasPermission ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                              </button>
                            </td>
                          )
                        })}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={user.username === "kanzaki_aito"}
                            className={`text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ${
                              user.username === "kanzaki_aito" ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center text-slate-400 dark:text-slate-600">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                />
                              </svg>
                            </div>
                            <p className="text-base font-medium">No users found</p>
                            <p className="text-sm mt-1">Create your first admin to get started</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
