"use client"

import { useState, useEffect } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import { Eye, EyeOff, ArrowUp, ArrowDown, Plus, X, FolderPlus, Edit, Check, Settings, Beaker, Trash, Copy, FileCode, AlertTriangle, Blocks, Workflow, Network, Laptop, Component, Layout, Box, AppWindow, Braces, BarChart3 } from "lucide-react"
import { getTextGradientStyle } from "@/lib/colors"
import { generateQuickTemplate } from "@/lib/subjectConfigGenerator"

interface Subject {
  id: number
  code: string
  title: string
  description: string
  icon: string
  color: string
  isVisible: boolean
  displayOrder: number
  // Configuration Flags
  hasGradingInterface: boolean
  hasQuizManagement: boolean
  hasTestCases: boolean
  gradingType: 'lab_challenge' | 'simple_score' | 'sql' | 'python' | 'java' | 'multi_question' | 'criteria' | null
  courseSummaryLink?: string
  googleSheetId?: string
  // Advanced Config
  headerRow?: number
  columnPattern?: string
  dataSourceType?: 'single_sheet' | 'tab_per_section' | 'tab_per_lab'
  sheetTabs?: string
  // Grading Configuration
  labWeight?: number
  labMaxScore?: number
  useUniformLabScore?: boolean
}

const ICON_OPTIONS = [
  'Code', 'Code2', 'Database', 'Terminal', 'Smartphone', 'Layers', 
  'BarChart3', 'Server', 'Globe', 'BookOpen', 'Cpu', 'Binary', 'FileJson', 'Monitor',
  'Blocks', 'Workflow', 'Network', 'Laptop', 'Component', 'Layout', 'Box', 'AppWindow', 'Braces'
]

const COLOR_OPTIONS = [
  { name: 'Blue-Sky', value: 'from-blue-500 to-sky-500' },
  { name: 'Purple-Pink', value: 'from-purple-500 to-pink-500' },
  { name: 'Orange-Amber', value: 'from-orange-500 to-amber-500' },
  { name: 'Teal-Cyan', value: 'from-teal-500 to-cyan-500' },
  { name: 'Indigo-Violet', value: 'from-indigo-500 to-violet-500' },
  { name: 'Emerald-Green', value: 'from-emerald-500 to-green-500' },
  { name: 'Rose-Red', value: 'from-rose-500 to-red-500' },
  { name: 'Slate-Gray', value: 'from-slate-500 to-gray-500' },
  { name: 'Fuchsia-Pink', value: 'from-fuchsia-500 to-pink-500' },
  { name: 'Violet-Fuchsia', value: 'from-violet-500 to-fuchsia-500' },
  { name: 'Cyan-Blue', value: 'from-cyan-500 to-blue-500' },
  { name: 'Lime-Green', value: 'from-lime-500 to-green-500' },
  { name: 'Yellow-Orange', value: 'from-yellow-400 to-orange-500' }
]

const GRADING_TYPES = [
  { value: 'lab_challenge', label: 'Lab & Challenge (Default)', desc: 'Dual scoring system with challenge toggles' },
  { value: 'simple_score', label: 'Simple Score Tracking', desc: 'Manual score entry (0-100) per lab' },
  { value: 'python', label: 'Python Automation', desc: 'Python script execution and output matching' },
  { value: 'sql', label: 'SQL Automation', desc: 'Database query execution and validation' },
  { value: 'java', label: 'Java Automation', desc: 'Java JUnit test runner' },
  { value: 'multi_question', label: 'Multi-Question Labs', desc: 'Score inputs for multiple questions (e.g. Q1, Q2)' },
  { value: 'criteria', label: 'Criteria Grading', desc: 'Ethics, Understanding, Reflection (0-2 scores)' }
]

export default function SubjectManagementPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  
  // Modal State
  const [showSubjectDialog, setShowSubjectDialog] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [showConfigTemplate, setShowConfigTemplate] = useState(false)
  const [templateSubject, setTemplateSubject] = useState<Subject | null>(null)
  const [copiedTemplate, setCopiedTemplate] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    icon: 'Code',
    color: 'from-blue-500 to-indigo-500',
    isVisible: true,
    courseSummaryLink: '',
    hasGradingInterface: false,
    gradingType: 'lab_challenge',
    hasQuizManagement: false,
    hasTestCases: false,
    googleSheetId: '',
    headerRow: 1,
    columnPattern: '',
    dataSourceType: 'single_sheet',
    sheetTabs: '',
    labWeight: 20,
    labMaxScore: 0,
    useUniformLabScore: false
  })
  
  // Tab State for Modal
  const [activeTab, setActiveTab] = useState<'basic' | 'config'>('basic')

  useEffect(() => {
    fetchSubjects()
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me")
      if (res.ok) {
        const data = await res.json()
        if (data.username) {
          setUsername(data.username)
        }
      }
    } catch (e) {
      console.error("Failed to fetch user")
    }
  }

  async function fetchSubjects() {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      const res = await fetch("/api/subjects", {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setSubjects(data.subjects)
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.error('Fetch subjects timed out')
      } else {
        console.error('Failed to fetch subjects:', e)
      }
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingSubject(null)
    setFormData({
      code: '',
      title: '',
      description: '',
      icon: 'Code',
      color: 'from-blue-500 to-indigo-500',
      isVisible: true,
      courseSummaryLink: '',
      hasGradingInterface: true, // Default to true for new subjects
      gradingType: 'simple_score', // Default to simple

      hasQuizManagement: false,
      hasTestCases: false,
      googleSheetId: '',
      headerRow: 1,
      columnPattern: '',
      dataSourceType: 'single_sheet',
      sheetTabs: '',
      labWeight: 20,
      labMaxScore: 0,
      useUniformLabScore: false
    })
    setActiveTab('basic')
    setShowSubjectDialog(true)
  }

  function openEditDialog(subject: Subject) {
    setEditingSubject(subject)
    setFormData({
      code: subject.code,
      title: subject.title,
      description: subject.description || '',
      icon: subject.icon || 'Code',
      color: subject.color || 'from-blue-500 to-indigo-500',
      isVisible: subject.isVisible,
      courseSummaryLink: subject.courseSummaryLink || '',
      hasGradingInterface: subject.hasGradingInterface,
      gradingType: subject.gradingType || 'simple_score',
      hasQuizManagement: subject.hasQuizManagement,
      hasTestCases: subject.hasTestCases,
      googleSheetId: subject.googleSheetId || '',
      headerRow: subject.headerRow || 1,
      columnPattern: subject.columnPattern || '',
      dataSourceType: (subject.dataSourceType as any) || 'single_sheet',
      sheetTabs: subject.sheetTabs || '',
      labWeight: subject.labWeight || 20,
      labMaxScore: subject.labMaxScore || 0,
      useUniformLabScore: subject.useUniformLabScore || false
    })
    setActiveTab('basic')
    setShowSubjectDialog(true)
  }

  async function toggleVisibility(code: string, currentValue: boolean) {
    setSaving(code)
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 second timeout

      const res = await fetch("/api/subjects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, isVisible: !currentValue }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        await fetchSubjects()
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Toggle visibility failed:', errorData)
        alert(`Failed to update subject visibility: ${errorData.error || 'Unknown error'}`)
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        alert('Request timed out. Please try again.')
      } else {
        console.error('Toggle visibility error:', e)
        alert(`An error occurred: ${e.message || 'Unknown error'}`)
      }
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
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout for multiple operations

      await Promise.all(
        updates.map(u =>
          fetch("/api/subjects", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(u),
            signal: controller.signal
          })
        )
      )
      
      clearTimeout(timeoutId)
      await fetchSubjects()
    } catch (e: any) {
      if (e.name === 'AbortError') {
        alert('Request timed out. Please try again.')
      } else {
        alert("Failed to reorder subjects")
      }
    } finally {
      setSaving(null)
    }
  }

  async function handleSaveSubject() {
    if (!formData.code || !formData.title) {
      alert("Please fill in Code and Title")
      return
    }

    // Validate code format (uppercase letters and numbers only)
    if (!/^[A-Z0-9]+$/.test(formData.code)) {
      alert("Subject code must contain only uppercase letters and numbers")
      return
    }

    setSaving('modal')
    
    try {
      const method = editingSubject ? "PATCH" : "POST"
      const payload = {
        ...formData,
        displayOrder: editingSubject ? editingSubject.displayOrder : subjects.length
      }

      const res = await fetch("/api/subjects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      
      if (res.ok && data.success) {
        setShowSubjectDialog(false)
        await fetchSubjects()
        
        // Show config template for NEW subjects
        if (!editingSubject) {
          const newSubject: Subject = {
            ...formData,
            id: data.subject?.id || 0,
            displayOrder: subjects.length,
            hasGradingInterface: formData.hasGradingInterface,
            hasQuizManagement: formData.hasQuizManagement,
            hasTestCases: formData.hasTestCases,
            gradingType: formData.gradingType as any,
            isVisible: formData.isVisible,
            dataSourceType: formData.dataSourceType as 'single_sheet' | 'tab_per_section' | 'tab_per_lab'
          }
          setTemplateSubject(newSubject)
          setShowConfigTemplate(true)
        }
      } else {
        alert(data.error || "Failed to save subject")
      }
    } catch (e) {
      alert("An error occurred while saving")
    } finally {
      setSaving(null)
    }
  }

  async function handleDeleteSubject(subject: Subject) {
    if (!confirm(`Are you sure you want to delete ${subject.code}? This action cannot be undone and will remove all associated data.`)) {
      return
    }

    setSaving(subject.code)
    try {
      const res = await fetch(`/api/subjects?code=${subject.code}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await fetchSubjects()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete subject")
      }
    } catch (e) {
      alert("An error occurred while deleting")
    } finally {
      setSaving(null)
    }
  }

  function handleCopyTemplate() {
    if (!templateSubject) return
    
    const template = generateQuickTemplate(templateSubject)
    navigator.clipboard.writeText(template).then(() => {
      setCopiedTemplate(true)
      setTimeout(() => setCopiedTemplate(false), 2000)
    }).catch(err => {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard')
    })
  }

  function openConfigTemplate(subject: Subject) {
    setTemplateSubject(subject)
    setShowConfigTemplate(true)
    setCopiedTemplate(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-slate-200 dark:border-slate-800 border-t-slate-600 dark:border-t-slate-400"></div>
          <p className="text-slate-600 dark:text-slate-400 mt-4 font-medium">Loading subjects and configurations...</p>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">This may take a moment in serverless environments</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden animate-fade-in">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-slate-300 dark:bg-slate-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-10 dark:opacity-5 animate-float"></div>
        <div
          className="absolute bottom-0 -right-4 w-96 h-96 bg-slate-400 dark:bg-slate-800 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-10 dark:opacity-5 animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white font-bold shadow-lg text-xs">
                SYS
              </div>
              <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-200">
                Subject Management
              </span>
            </div>

            <div className="flex items-center gap-4 md:gap-6">
              <a
                href="/admin/dashboard"
                className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors whitespace-nowrap"
              >
                &larr; <span className="hidden sm:inline">Back to Dashboard</span>
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            {username && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {username}
                </span>
              </div>
            )}
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-6xl px-4 py-8 relative z-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-200 mb-2">
              All Subjects
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Manage curricula, visibility, and grading configurations.
            </p>
          </div>
          
          <button
            onClick={openCreateDialog}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Create Subject</span>
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
            <FolderPlus className="w-16 h-16 text-slate-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Subjects Found</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Create your first subject to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subjects.map((subject, index) => (
              <div
                key={subject.code}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:shadow-lg transition-all animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveSubject(subject.code, "up")}
                    disabled={index === 0 || saving === subject.code}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                  <button
                    onClick={() => moveSubject(subject.code, "down")}
                    disabled={index === subjects.length - 1 || saving === subject.code}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>

                <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-br ${subject.color} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                  {subject.code.substring(0, 4)}
                </div>

                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <h3 
                      className={`text-base font-bold flex items-center gap-2 ${getTextGradientStyle(subject.color).className}`}
                      style={getTextGradientStyle(subject.color).style}
                    >
                      {subject.code}
                      {!subject.isVisible && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300">Hidden</span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{subject.title}</p>
                  </div>

                  <div className="hidden md:flex items-center gap-2">
                    {subject.hasGradingInterface ? (
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-900/50">
                        {GRADING_TYPES.find(t => t.value === subject.gradingType)?.label || subject.gradingType}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">No Grading</span>
                    )}
                    <div className="flex gap-1">
                       {subject.hasQuizManagement && (
                         <span title="Quiz" className="w-2 h-2 rounded-full bg-purple-500"></span>
                       )}
                       {subject.hasTestCases && (
                         <span title="Tests" className="w-2 h-2 rounded-full bg-green-500"></span>
                       )}
                    </div>
                  </div>
                </div>


                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVisibility(subject.code, subject.isVisible)}
                    disabled={saving === subject.code}
                    className={`p-2 rounded-lg transition-all ${
                        subject.isVisible
                        ? "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                    title={subject.isVisible ? "Hide Subject" : "Show Subject"}
                  >
                    {subject.isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => openEditDialog(subject)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-all shadow-sm hover:shadow"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(subject)}
                    disabled={saving === subject.code}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-all shadow-sm hover:shadow"
                    title="Delete Subject"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Subject Dialog (Create/Edit) */}
      {showSubjectDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${formData.color} rounded-xl flex items-center justify-center shadow-md transition-all duration-300`}>
                  <FolderPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">
                    {editingSubject ? 'Edit Subject' : 'Create New Subject'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {editingSubject ? `Configure ${formData.code}` : 'Add a new course curriculum'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubjectDialog(false)}
                disabled={saving === 'modal'}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
               <button
                 onClick={() => setActiveTab('basic')}
                 className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'basic'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                 }`}
               >
                 Basic Info
               </button>
               <button
                 onClick={() => setActiveTab('config')}
                 className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'config'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                 }`}
               >
                 Configuration & Grading
               </button>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              
              {activeTab === 'basic' ? (
                <div className="space-y-6 animate-fade-in">
                  {/* Subject Code */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Subject Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="ITCS999"
                      disabled={!!editingSubject || saving === 'modal'}
                      className={`w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editingSubject ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                    />
                    {!editingSubject && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Uppercase letters and numbers only. Cannot be changed later.
                        </p>
                    )}
                  </div>

                  {/* Subject Title */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Subject Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Advanced Web Development"
                      disabled={saving === 'modal'}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the course..."
                      rows={3}
                      disabled={saving === 'modal'}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Branding: Icon & Color */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Icon
                        </label>
                        <select
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        disabled={saving === 'modal'}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                        {ICON_OPTIONS.map(icon => (
                            <option key={icon} value={icon}>{icon}</option>
                        ))}
                        </select>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Visibility
                          </label>
                          <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                             <input 
                               type="checkbox" 
                               checked={formData.isVisible}
                               onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                               className="w-5 h-5 ml-2"
                             />
                             <span className="text-sm text-slate-700 dark:text-slate-300">Visible to Users</span>
                          </div>
                      </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Color Theme
                    </label>
                    <div className="flex flex-col gap-4">
                        {/* Custom Color Toggle */}
                        <div className="flex items-center gap-4">
                             <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="colorMode"
                                    checked={!formData.color.startsWith("#") && !formData.color.startsWith("linear-gradient")}
                                    onChange={() => setFormData({ ...formData, color: 'from-blue-500 to-indigo-500' })}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Preset Gradient</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="colorMode"
                                    checked={formData.color.startsWith("#") || formData.color.startsWith("linear-gradient")}
                                    onChange={() => setFormData({ ...formData, color: '#3b82f6' })} // Default Blue Hex
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Custom Color</span>
                             </label>
                        </div>

                        {/* Presets Grid */}
                        {(!formData.color.startsWith("#") && !formData.color.startsWith("linear-gradient")) && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
                            {COLOR_OPTIONS.map(color => (
                                <button
                                key={color.value}
                                onClick={() => setFormData({ ...formData, color: color.value })}
                                disabled={saving === 'modal'}
                                className={`p-2 rounded-lg border-2 transition-all ${
                                    formData.color === color.value
                                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                                >
                                <div className={`w-full h-8 bg-gradient-to-r ${color.value} rounded mb-2`}></div>
                                <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 text-center">{color.name}</p>
                                </button>
                            ))}
                            </div>
                        )}

                        {/* Color Picker */}
                        {(formData.color.startsWith("#") || formData.color.startsWith("linear-gradient")) && (
                             <div className="animate-fade-in p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                 <div className="flex items-center gap-4">
                                     <input 
                                        type="color" 
                                        value={formData.color.startsWith("#") ? formData.color : "#3b82f6"}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="h-12 w-24 p-1 rounded cursor-pointer"
                                     />
                                     <div className="flex-1">
                                         <p className="text-sm font-medium text-slate-900 dark:text-slate-200">Custom Gradient Preview</p>
                                         <div 
                                            className="h-8 w-full rounded-lg mt-2 shadow-sm" 
                                            style={{ background: formData.color.startsWith("#") ? `linear-gradient(135deg, ${formData.color} 0%, ${formData.color} 100%)` : formData.color }} // Simple preview, helper handles real gradient logic
                                         ></div>
                                         <p className="text-xs text-slate-500 mt-2">
                                             Smart Gradient will be automatically generated from this color.
                                         </p>
                                     </div>
                                 </div>
                             </div>
                        )}
                    </div>
                  </div>
                  
                  {/* Google Sheet ID */}
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                       Google Sheet ID
                     </label>
                     <input
                       type="text"
                       value={formData.googleSheetId}
                       onChange={(e) => setFormData({ ...formData, googleSheetId: e.target.value })}
                       placeholder="1BxiMVs0XRA5nFMdKvBdBZjGWZW-u_7QYs..."
                       className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 font-mono text-sm"
                     />
                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                       The document ID from the Google Sheet URL. Required for fetching scores.
                     </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div>
                         <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                           Header Row
                         </label>
                         <input
                           type="number"
                           min="1"
                           value={formData.headerRow}
                           onChange={(e) => setFormData({ ...formData, headerRow: parseInt(e.target.value) || 1 })}
                           className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200"
                         />
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                           Row number where column headers are located (Default: 1).
                         </p>
                      </div>
                      
                      <div>
                         <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                           Column Pattern (Regex)
                         </label>
                         <input
                           type="text"
                           value={formData.columnPattern}
                           onChange={(e) => setFormData({ ...formData, columnPattern: e.target.value })}
                           placeholder="e.g. ^Lab\s*{labId}"
                           className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 font-mono text-sm"
                         />
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                           Custom regex to match lab columns. Use <code>{'{labId}'}</code> placeholder.
                         </p>
                      </div>
                  </div>

                  <div>
                     <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                       Data Source Strategy
                     </label>
                     <select
                       value={formData.dataSourceType}
                       onChange={(e) => setFormData({ ...formData, dataSourceType: e.target.value })}
                       className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200"
                     >
                        <option value="single_sheet">Single Sheet (Default)</option>
                        <option value="tab_per_section">Tab per Section (e.g. Sec1, Sec2)</option>
                        <option value="tab_per_lab">Tab per Lab (e.g. Lab 1, Lab 2)</option>
                     </select>
                  </div>

                  {formData.dataSourceType !== 'single_sheet' && (
                      <div>
                         <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                           Sheet Tabs (Comma Separated)
                         </label>
                         <input
                           type="text"
                           value={formData.sheetTabs}
                           onChange={(e) => setFormData({ ...formData, sheetTabs: e.target.value })}
                           placeholder={formData.dataSourceType === 'tab_per_section' ? "Sec1, Sec2, Sec3" : "Lab 1, Lab 2, Lab 3"}
                           className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200"
                         />
                         <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                           Explicitly list the tab names to fetch data from.
                         </p>
                      </div>
                  )}
                  
                  {/* Summary Link */}
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                       Course Summary Link (Optional)
                     </label>
                     <input
                       type="url"
                       value={formData.courseSummaryLink}
                       onChange={(e) => setFormData({ ...formData, courseSummaryLink: e.target.value })}
                       placeholder="https://..."
                       className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200"
                     />
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                   {/* Grading Interface Toggle */}
                   <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-start gap-3">
                         <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Beaker className="w-6 h-6" />
                         </div>
                         <div className="flex-1">
                            <label className="flex items-center gap-2 cursor-pointer mb-1">
                               <input 
                                 type="checkbox"
                                 checked={formData.hasGradingInterface}
                                 onChange={(e) => setFormData({ ...formData, hasGradingInterface: e.target.checked })}
                                 className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                               />
                               <span className="font-bold text-slate-900 dark:text-slate-200">Enable Grading Interface</span>
                            </label>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Enables the grading dashboard for this subject. If disabled, the admin page will be empty.
                            </p>
                         </div>
                      </div>

                      {formData.hasGradingInterface && (
                         <div className="mt-4 pl-12 space-y-4">
                            <div>
                               <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                 Grading Strategy
                               </label>
                               <div className="grid gap-2">
                                  {GRADING_TYPES.map(type => (
                                     <label 
                                       key={type.value} 
                                       className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                          formData.gradingType === type.value
                                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                                          : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                                       }`}
                                     >
                                        <input 
                                          type="radio" 
                                          name="gradingType"
                                          value={type.value}
                                          checked={formData.gradingType === type.value}
                                          onChange={(e) => setFormData({ ...formData, gradingType: e.target.value as any })}
                                          className="w-4 h-4 text-blue-600"
                                        />
                                        <div>
                                           <p className="font-medium text-slate-900 dark:text-slate-200 text-sm">{type.label}</p>
                                           <p className="text-xs text-slate-500 dark:text-slate-400">{type.desc}</p>
                                        </div>
                                     </label>
                                  ))}
                               </div>
                            </div>
                         </div>
                      )}
                   </div>
                   
                   {/* Grading Configuration */}
                   <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                            <BarChart3 className="w-6 h-6" />
                         </div>
                         <h3 className="font-bold text-slate-900 dark:text-slate-200">Score Calculation Settings</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2">
                         <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Lab Weight (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.labWeight}
                              onChange={(e) => setFormData({ ...formData, labWeight: parseInt(e.target.value) || 0 })}
                              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Weight of lab scores in final grade calculation (e.g., 20 for 20%).
                            </p>
                         </div>
                         
                         <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              Lab Max Score
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.labMaxScore}
                              onChange={(e) => setFormData({ ...formData, labMaxScore: parseInt(e.target.value) || 0 })}
                              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Maximum possible total lab score (0 = auto-calculate from labs).
                            </p>
                         </div>
                      </div>
                      
                      <div className="mt-4 pl-2">
                         <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input 
                               type="checkbox"
                               checked={formData.useUniformLabScore || false}
                               onChange={(e) => setFormData({ ...formData, useUniformLabScore: e.target.checked })}
                               className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500"
                            />
                            <div>
                               <p className="font-medium text-slate-900 dark:text-slate-200 text-sm">Use Uniform Lab Score (Always /2)</p>
                               <p className="text-xs text-slate-500 dark:text-slate-400">
                                 When enabled, all labs will be displayed and calculated with a maximum score of 2, regardless of individual lab total_score settings. Useful for subjects where all labs should be graded equally.
                               </p>
                            </div>
                         </label>
                      </div>
                   </div>
                   
                   {/* Modules */}
                   <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                            <Settings className="w-6 h-6" />
                         </div>
                         <h3 className="font-bold text-slate-900 dark:text-slate-200">Additional Modules</h3>
                      </div>
                      
                      <div className="space-y-3 pl-2">
                         <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input 
                               type="checkbox"
                               checked={formData.hasQuizManagement}
                               onChange={(e) => setFormData({ ...formData, hasQuizManagement: e.target.checked })}
                               className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                            />
                            <div>
                               <p className="font-medium text-slate-900 dark:text-slate-200 text-sm">Quiz Management</p>
                               <p className="text-xs text-slate-500 dark:text-slate-400">Enable quiz creation, question banking, and student attempts.</p>
                            </div>
                         </label>
                         
                         <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input 
                               type="checkbox"
                               checked={formData.hasTestCases}
                               onChange={(e) => setFormData({ ...formData, hasTestCases: e.target.checked })}
                               className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                            />
                            <div>
                               <p className="font-medium text-slate-900 dark:text-slate-200 text-sm">Test Case Management</p>
                               <p className="text-xs text-slate-500 dark:text-slate-400">Enable input/output test case definition (Required for Python/Java auto-grading).</p>
                            </div>
                         </label>
                      </div>
                   </div>
                </div>
              )}

            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
               <button
                  onClick={() => setShowSubjectDialog(false)}
                  disabled={saving === 'modal'}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium"
               >
                  Cancel
               </button>
               <button
                  onClick={handleSaveSubject}
                  disabled={saving === 'modal'}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
               >
                  {saving === 'modal' ? (
                     <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Saving...
                     </>
                  ) : (
                     <>
                        <Check className="w-4 h-4" />
                        {editingSubject ? 'Update Subject' : 'Create Subject'}
                     </>
                  )}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
