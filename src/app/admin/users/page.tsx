"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import { Shield, CheckCircle2, XCircle, Key, Edit } from "lucide-react"

interface User {
  id: string
  username: string
  createdAt: string
  role: 'LA' | 'Lecturer'
  permissions?: {
    [key: string]: boolean
  }
}

interface Subject {
  code: string
  name: string
  color: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<string>("")
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "LA" as 'LA' | 'Lecturer',
  })

  // Password change state
  const [selectedUserForPasswordChange, setSelectedUserForPasswordChange] = useState<{id: string, username: string} | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)
  const [passwordChangeMessage, setPasswordChangeMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  
  // Username change state
  const [showUsernameChangeDialog, setShowUsernameChangeDialog] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [usernameChangeLoading, setUsernameChangeLoading] = useState(false)
  const [usernameChangeMessage, setUsernameChangeMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [selectedUserForUsernameChange, setSelectedUserForUsernameChange] = useState<{id: string, username: string} | null>(null)
  
  // Add user dialog state
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchCurrentUser()
    fetchSubjects()
  }, [])

  async function fetchSubjects() {
    try {
      const response = await fetch("/api/subjects")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const mapped = data.subjects.map((s: any) => ({
            code: s.code.toLowerCase(),
            name: `${s.code} - ${s.title}`,
            color: s.color
          }))
          setSubjects(mapped)
        }
      }
    } catch (err) {
      console.error("Failed to fetch subjects", err)
    }
  }

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

      setFormData({ username: "", password: "", role: "LA" })
      setIsAddUserDialogOpen(false)
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

  async function handleRoleChange(userId: string, newRole: 'LA' | 'Lecturer') {
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          role: newRole,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update role")
      }

      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleUsernameChange(e: React.FormEvent) {
    e.preventDefault()
    setUsernameChangeMessage(null)
    
    const targetUser = selectedUserForUsernameChange || { username: currentUser, id: "" }
    
    if (!targetUser.username) {
      setUsernameChangeMessage({ type: 'error', text: 'User not found' })
      return
    }
    
    if (!newUsername || newUsername.trim() === '') {
      setUsernameChangeMessage({ type: 'error', text: 'Username cannot be empty' })
      return
    }
    
    if (newUsername.trim() === targetUser.username) {
      setUsernameChangeMessage({ type: 'error', text: 'New username must be different from current username' })
      return
    }
    
    setUsernameChangeLoading(true)
    
    try {
      const requestBody = selectedUserForUsernameChange 
        ? { id: selectedUserForUsernameChange.id, newUsername: newUsername.trim() }
        : { username: currentUser, newUsername: newUsername.trim() }
      
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to change username")
      }

      const isOwnUsername = !selectedUserForUsernameChange || selectedUserForUsernameChange.username === currentUser
      
      if (isOwnUsername) {
        setUsernameChangeMessage({ type: 'success', text: 'Username changed successfully! Please log in with your new username.' })
        // Redirect to login after 2 seconds for own username change
        setTimeout(() => {
          router.push("/admin/login")
        }, 2000)
      } else {
        setUsernameChangeMessage({ type: 'success', text: `Username changed successfully for ${targetUser.username}!` })
        // Refresh users list to show the updated username
        setTimeout(() => {
          fetchUsers()
          setShowUsernameChangeDialog(false)
          setSelectedUserForUsernameChange(null)
        }, 1500)
      }
      
      setNewUsername("")
    } catch (err: any) {
      setUsernameChangeMessage({ type: 'error', text: err.message })
    } finally {
      setUsernameChangeLoading(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordChangeMessage(null)
    
    if (!selectedUserForPasswordChange) {
      setPasswordChangeMessage({ type: 'error', text: 'No user selected' })
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordChangeMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordChangeMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    
    setPasswordChangeLoading(true)
    
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUserForPasswordChange.id,
          password: newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password")
      }

      setPasswordChangeMessage({ type: 'success', text: `Password changed successfully for ${selectedUserForPasswordChange.username}!` })
      setNewPassword("")
      setConfirmPassword("")
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setSelectedUserForPasswordChange(null)
        setPasswordChangeMessage(null)
      }, 2000)
    } catch (err: any) {
      setPasswordChangeMessage({ type: 'error', text: err.message })
    } finally {
      setPasswordChangeLoading(false)
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
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-200">User Permissions</span>
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
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="gradient-text">Account & Permission Management</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">Manage administrators and subject-specific access rights</p>
            </div>
            <button
              onClick={() => setIsAddUserDialogOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Account
            </button>
          </div>
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

        {/* Users List with Permissions */}
        {loading ? (
          <div className="animate-fade-in">
            <div className="glass-card overflow-hidden">
              <div className="px-8 py-12 text-center">
                <div className="inline-flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="text-lg text-slate-600 dark:text-slate-400">Loading users and permissions...</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className="animate-fade-in">
            <div className="glass-card overflow-hidden hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-300 border-white/40 dark:border-slate-700/40">
              <div className="px-8 py-6 border-b border-white/20 dark:border-slate-700/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
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
                      <th className="px-4 py-5 text-center text-sm font-semibold tracking-wide">Role</th>
                      {subjects.map(subject => (
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
                        <td className="px-8 py-5 text-sm font-medium text-slate-900 dark:text-slate-200 flex items-center gap-4">
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
                        <td className="px-4 py-5 text-center">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as 'LA' | 'Lecturer')}
                            disabled={!isMainAdmin || user.username === "kanzaki_aito"}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                              user.role === 'Lecturer'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            } ${!isMainAdmin || user.username === "kanzaki_aito" ? 'cursor-not-allowed opacity-50' : 'hover:shadow-md cursor-pointer'}`}
                          >
                            <option value="LA">LA</option>
                            <option value="Lecturer">Lecturer</option>
                          </select>
                        </td>
                        {subjects.map(subject => {
                          const hasPermission = user.permissions?.[subject.code] || user.username === "kanzaki_aito"
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
                          <div className="flex items-center justify-end gap-2">
                            {isMainAdmin && (
                              <button
                                onClick={() => {
                                  setSelectedUserForUsernameChange({ id: user.id, username: user.username })
                                  setNewUsername("")
                                  setUsernameChangeMessage(null)
                                  setShowUsernameChangeDialog(true)
                                }}
                                className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all"
                                title="Change Username"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {isMainAdmin && (
                              <button
                                onClick={() => setSelectedUserForPasswordChange({id: user.id, username: user.username})}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={user.username === "kanzaki_aito"}
                              className={`text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all ${
                                user.username === "kanzaki_aito" ? 'opacity-30 cursor-not-allowed' : ''
                              }`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center">
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
        )}
      </div>

      {/* Username Change Modal */}
      {showUsernameChangeDialog && isMainAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 max-w-md w-full animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">
                Change Username {selectedUserForUsernameChange ? `for ${selectedUserForUsernameChange.username}` : ''}
              </h3>
              <button
                onClick={() => {
                  setShowUsernameChangeDialog(false)
                  setNewUsername("")
                  setUsernameChangeMessage(null)
                  setSelectedUserForUsernameChange(null)
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {usernameChangeMessage && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
                usernameChangeMessage?.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}>
                {usernameChangeMessage?.text}
              </div>
            )}

            <form onSubmit={handleUsernameChange} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Current Username
                </label>
                <input
                  type="text"
                  value={selectedUserForUsernameChange?.username || currentUser}
                  disabled
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  New Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  placeholder="Enter new username"
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none shadow-sm hover:border-cyan-300 dark:hover:border-cyan-600 transition-all font-medium"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUsernameChangeDialog(false)
                    setNewUsername("")
                    setUsernameChangeMessage(null)
                    setSelectedUserForUsernameChange(null)
                  }}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-200 font-bold py-3 px-6 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={usernameChangeLoading}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {usernameChangeLoading ? 'Changing...' : 'Change Username'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {selectedUserForPasswordChange && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-8 max-w-md w-full animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">
                Change Password for {selectedUserForPasswordChange?.username}
              </h3>
              <button
                onClick={() => {
                  setSelectedUserForPasswordChange(null)
                  setNewPassword("")
                  setConfirmPassword("")
                  setPasswordChangeMessage(null)
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {passwordChangeMessage && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
                passwordChangeMessage?.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}>
                {passwordChangeMessage?.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all font-medium"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserForPasswordChange(null)
                    setNewPassword("")
                    setConfirmPassword("")
                    setPasswordChangeMessage(null)
                  }}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-200 font-bold py-3 px-6 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordChangeLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 disabled:cursor-not-allowed"
                >
                  {passwordChangeLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Dialog */}
      {isAddUserDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-card p-8 max-w-md w-full animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">Add New Admin</h3>
              </div>
              <button
                onClick={() => {
                  setIsAddUserDialogOpen(false)
                  setFormData({ username: "", password: "", role: "LA" })
                  setError(null)
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none shadow-sm hover:border-purple-300 dark:hover:border-purple-600 transition-all font-medium"
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
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none shadow-sm hover:border-purple-300 dark:hover:border-purple-600 transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'LA' | 'Lecturer' })}
                  required
                  className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none shadow-sm hover:border-purple-300 dark:hover:border-purple-600 transition-all font-medium"
                >
                  <option value="LA">LA (Learning Assistant)</option>
                  <option value="Lecturer">Lecturer</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddUserDialogOpen(false)
                    setFormData({ username: "", password: "", role: "LA" })
                    setError(null)
                  }}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-200 font-bold py-3 px-6 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40"
                >
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
