"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"

interface Lab {
  id: string
  labNumber: string
  title: string
  fileName: string
  isActive: boolean
  deadline?: string
  createdAt: string
  subject: string
  labType?: 'Lab' | 'Challenge'
}

export default function LabManagement() {
  const [labs, setLabs] = useState<Lab[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingLab, setEditingLab] = useState<Lab | null>(null)
  const [currentUser, setCurrentUser] = useState<string>("")
  const [userPermissions, setUserPermissions] = useState<{[key: string]: boolean}>({})
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState({
    labNumber: "",
    title: "",
    fileName: "index.html",
    isActive: true,
    deadline: "",
    subject: "", // Will be set from fetched subjects
    totalScore: "" // Add total score field
  })


  useEffect(() => {
    fetchSubjects()
    fetchCurrentUser()
    fetchLabs()
  }, [])

  async function fetchSubjects() {
    try {
      const response = await fetch("/api/subjects")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSubjects(data.subjects)
          // Set default subject if not set
          if (data.subjects.length > 0 && !formData.subject) {
            setFormData(prev => ({ ...prev, subject: data.subjects[0].code }))
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch subjects", err)
    }
  }

  // Update default subject when permissions change
  useEffect(() => {
    const isMainAdmin = currentUser === "kanzaki_aito"
    const allowedSubjects = isMainAdmin 
      ? subjects.map(s => s.code)
      : Object.keys(userPermissions)
          .filter(subject => userPermissions[subject])
          .map(subject => subject.toUpperCase())
    
    if (allowedSubjects.length > 0 && !allowedSubjects.includes(formData.subject)) {
      setFormData(prev => ({ ...prev, subject: allowedSubjects[0] }))
    }
  }, [userPermissions, currentUser, subjects])

  async function fetchCurrentUser() {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.username || "")
        // Fetch permissions for this user
        if (data.userId) {
          await fetchUserPermissions(data.userId)
        }
      }
    } catch (err) {
      console.error("Failed to fetch current user", err)
    }
  }

  async function fetchUserPermissions(userId: string) {
    try {
      const response = await fetch(`/api/admin/permissions?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        console.log("Permissions data:", data)
        // Convert array format to object format if needed
        if (Array.isArray(data.permissions)) {
          const permissionsObj: {[key: string]: boolean} = {}
          data.permissions.forEach((perm: any) => {
            if (perm.subjectCode && perm.canEdit) {
              permissionsObj[perm.subjectCode.toLowerCase()] = true
            }
          })
          console.log("Converted permissions:", permissionsObj)
          setUserPermissions(permissionsObj)
        } else {
          setUserPermissions(data.permissions || {})
        }
      }
    } catch (err) {
      console.error("Failed to fetch permissions", err)
    }
  }

  async function fetchLabs() {
    try {
      const response = await fetch("/api/labs")
      if (response.status === 401) {
        router.push("/admin/login")
        return
      }
      const data = await response.json()
      setLabs(data.labs || [])
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
      const url = "/api/labs"
      const method = editingLab ? "PUT" : "POST"
      
      // Prepare body with totalScore as number if provided
      const bodyData: any = {
        ...formData,
        totalScore: formData.totalScore ? parseInt(formData.totalScore) : undefined
      }
      
      const body = editingLab ? { id: editingLab.id, ...bodyData } : bodyData

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.status === 401) {
        router.push("/admin/login")
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Operation failed")
      }



      // Reset form and refresh
      setFormData({ labNumber: "", title: "", fileName: "index.html", isActive: true, deadline: "", subject: subjects[0]?.code || "", totalScore: "" })

      setEditingLab(null)
      fetchLabs()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this lab?")) {
      return
    }

    try {
      const response = await fetch(`/api/labs?id=${id}`, {
        method: "DELETE",
      })

      if (response.status === 401) {
        router.push("/admin/login")
        return
      }

      if (!response.ok) {
        throw new Error("Failed to delete lab")
      }

      fetchLabs()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function handleEdit(lab: Lab) {
    setEditingLab(lab)
    setFormData({
      labNumber: lab.labNumber,
      title: lab.title,
      fileName: lab.fileName,
      isActive: lab.isActive,
      deadline: lab.deadline || "",
      subject: lab.subject || subjects[0]?.code || "",
      totalScore: (lab as any).totalScore?.toString() || "",
    })
  }

  function handleCancelEdit() {
    setEditingLab(null)
    setFormData({ labNumber: "", title: "", fileName: "index.html", isActive: true, deadline: "", subject: subjects[0]?.code || "", totalScore: "" })
  }

  async function handleToggleActive(lab: Lab) {
    try {
      const response = await fetch("/api/labs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lab.id, isActive: !lab.isActive }),
      })

      if (response.status === 401) {
        router.push("/admin/login")
        return
      }

      if (!response.ok) {
        throw new Error("Failed to toggle status")
      }

      fetchLabs()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Check if user is main admin
  const isMainAdmin = currentUser === "kanzaki_aito"

  // Get allowed subjects based on permissions (normalize to uppercase)
  const allowedSubjects = isMainAdmin 
    ? subjects.map(s => s.code)
    : Object.keys(userPermissions)
        .filter(subject => userPermissions[subject])
        .map(subject => subject.toUpperCase())

  console.log("Current user:", currentUser)
  console.log("Is main admin:", isMainAdmin)
  console.log("User permissions:", userPermissions)
  console.log("Allowed subjects:", allowedSubjects)

  // Filter labs based on user permissions and sort by subject and lab number
  const filteredLabs = (isMainAdmin 
    ? labs 
    : labs.filter(lab => userPermissions[lab.subject.toLowerCase()]))
    .sort((a, b) => {
      // First sort by subject
      const subjectCompare = a.subject.localeCompare(b.subject)
      if (subjectCompare !== 0) return subjectCompare
      
      // Then sort by lab number (numeric sort for proper ordering)
      const aNum = parseInt(a.labNumber) || 0
      const bNum = parseInt(b.labNumber) || 0
      if (aNum !== bNum) return aNum - bNum
      
      // If numeric values are same, fall back to string comparison
      return a.labNumber.localeCompare(b.labNumber)
    })

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
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply filter blur-xl opacity-5 dark:opacity-10 animate-float"></div>
        <div
          className="absolute bottom-0 -right-4 w-96 h-96 bg-cyan-300 dark:bg-cyan-900 rounded-full mix-blend-multiply filter blur-xl opacity-5 dark:opacity-10 animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      {/* Glass Navbar */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/20 dark:border-slate-700/50 shadow-sm">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-bold shadow-lg shadow-blue-500/30 text-xs">
              ICT
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-200">
              Lab Management
            </span>
          </div>
          <a
            href="/admin/dashboard"
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-white/60 dark:hover:bg-slate-700/60 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </a>
          <div className="ml-4">
            <ModeToggle />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">Lab Management</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">Create and configure lab assignments</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-xl mb-6 flex items-start gap-3 animate-slide-up">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
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

        {/* No Permission Warning */}
        {!isMainAdmin && allowedSubjects.length === 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-6 py-4 rounded-xl mb-6 flex items-start gap-3 animate-slide-up">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold">No Subject Access</p>
              <p className="text-sm">You don't have permission to manage labs for any subject. Please contact the main admin (kanzaki_aito) to grant you access.</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Form */}
          <div className="lg:col-span-1 animate-scale-in">
            <div className="glass-card p-6 md:p-8 lg:sticky lg:top-24 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border-white/40 dark:border-slate-700/50">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        editingLab
                          ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          : "M12 4v16m8-8H4"
                      }
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">
                  {editingLab ? "Edit Lab" : "Add New Lab"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all mb-4"
                  >
                    {allowedSubjects.length > 0 ? (
                      allowedSubjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))
                    ) : (
                      <option value="" disabled>No subjects available</option>
                    )}
                  </select>

                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Lab Number
                  </label>
                  <input
                    type="text"
                    value={formData.labNumber}
                    onChange={(e) => setFormData({ ...formData, labNumber: e.target.value })}
                    required
                    placeholder="e.g., 01"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g., HTML Basics"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Deadline (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    placeholder="e.g., 2024-01-31"
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/90 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Total Score Field - Only for ITCS251 and ITCS255 */}
                {(formData.subject === 'ITCS251' || formData.subject === 'ITCS255') && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Total Score (for gradient display)
                    </label>
                    <input
                      type="number"
                      value={formData.totalScore}
                      onChange={(e) => setFormData({ ...formData, totalScore: e.target.value })}
                      placeholder="e.g., 100"
                      min="0"
                      step="1"
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/90 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Set max score for color gradient: 0 (red) → {formData.totalScore || 'max'} (green)
                    </p>
                  </div>
                )}



                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Active / Visible to Students
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold tracking-wide py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 transition-all text-sm btn-hover-lift"
                  >
                    {editingLab ? "Update Lab" : "Create Lab"}
                  </button>
                  {editingLab && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl transition-all text-sm font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Labs Table */}
          <div className="lg:col-span-2 animate-fade-in">
            <div className="glass-card overflow-hidden hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300 border-white/40 dark:border-slate-700/50">
              <div className="px-8 py-6 border-b border-white/20 dark:border-slate-700/50 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 dark:from-slate-800/50 dark:to-slate-700/50">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  Existing Labs
                  <span className="ml-auto px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold ring-1 ring-blue-200 dark:ring-blue-800">
                    {filteredLabs.length}
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden">
                <table className="w-full text-sm text-left min-w-[800px]">
                  <thead className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 text-white">
                    <tr>
                      <th className="px-4 md:px-8 py-4 md:py-5 font-semibold tracking-wide text-xs md:text-sm">Subject</th>
                      <th className="px-4 md:px-8 py-4 md:py-5 font-semibold tracking-wide text-xs md:text-sm">Lab #</th>
                      <th className="px-4 md:px-8 py-4 md:py-5 font-semibold tracking-wide text-xs md:text-sm">Title</th>
                      <th className="px-4 md:px-8 py-4 md:py-5 font-semibold tracking-wide text-xs md:text-sm">Deadline</th>
                      <th className="px-4 md:px-8 py-4 md:py-5 font-semibold tracking-wide text-xs md:text-sm">Status</th>
                      <th className="px-4 md:px-8 py-4 md:py-5 text-right font-semibold tracking-wide text-xs md:text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredLabs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                              </svg>
                            </div>
                            <p className="text-base font-medium">No labs created yet</p>
                            <p className="text-sm mt-1">Create your first lab to get started</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredLabs.map((lab) => (
                        <tr
                          key={lab.id}
                          className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors group"
                        >
                          <td className="px-4 md:px-8 py-4 md:py-5 text-slate-700 dark:text-slate-300 font-bold text-xs md:text-sm">{lab.subject || "-"}</td>
                          <td className="px-4 md:px-8 py-4 md:py-5 font-semibold text-slate-900 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-xs md:text-sm font-bold shadow-md shadow-blue-500/20">
                                {lab.labNumber}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-8 py-4 md:py-5 text-slate-700 dark:text-slate-300 font-medium text-xs md:text-sm">
                            <div className="flex flex-col gap-1.5">
                              <span>{lab.title}</span>
                              {lab.subject === 'ITCS123' && (
                                <span className={`px-2 py-0.5 rounded text-xs font-bold w-fit ${
                                  (lab.labType || 'Lab') === 'Challenge'
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                }`}>
                                  {lab.labType || 'Lab'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 md:px-8 py-4 md:py-5 text-slate-500 dark:text-slate-400 text-xs md:text-sm">
                            {lab.deadline || <span className="text-slate-300 dark:text-slate-600 italic">None</span>}
                          </td>
                          <td className="px-4 md:px-8 py-4 md:py-5">
                            <button
                              onClick={() => handleToggleActive(lab)}
                              className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold border transition-all ${
                                lab.isActive
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                              }`}
                            >
                              {lab.isActive ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="px-4 md:px-8 py-4 md:py-5 text-right space-x-1 md:space-x-2">
                            <button
                              onClick={() => handleEdit(lab)}
                              disabled={(lab.labType || 'Lab') === 'Challenge'}
                              className={`font-bold transition-colors px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs uppercase tracking-wide ${
                                (lab.labType || 'Lab') === 'Challenge'
                                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                              }`}
                            >
                              Edit
                            </button>
                            <span className="text-slate-200 dark:text-slate-700">|</span>
                            <button
                              onClick={() => handleDelete(lab.id)}
                              disabled={(lab.labType || 'Lab') === 'Challenge'}
                              className={`font-bold transition-colors px-3 py-1.5 rounded-lg text-xs uppercase tracking-wide ${
                                (lab.labType || 'Lab') === 'Challenge'
                                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                  : 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                              }`}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
