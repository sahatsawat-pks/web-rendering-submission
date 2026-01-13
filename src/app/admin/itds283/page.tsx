"use client"

import type React from "react"
import { Smartphone, ArrowLeft, Home, Layers, Save, Search, RefreshCw, FileSpreadsheet } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Student {
  id: string
  studentId: string // used for updates
  username: string // from sheet
  no?: string
  title?: string
  name: string
  surname: string
  nickname?: string
  engName?: string
  nicknameEng?: string
  email?: string
  section?: string
  [key: string]: any // For lab scores: "Lab 1", "Lab 2" etc.
}

interface Lab {
  id: number
  labNumber: string
  title: string
  totalScore?: number
}

export default function ITDS283AdminPage() {
  const router = useRouter()
  // Data State
  const [labs, setLabs] = useState<Lab[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'LA' | 'Lecturer'>('LA')
  const [username, setUsername] = useState('')
  const [hasAccess, setHasAccess] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Edit State
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<{[key: string]: any}>({})
  const [saving, setSaving] = useState(false)

  // Quiz & Lab Creation State
  const [togglingQuiz, setTogglingQuiz] = useState<number | null>(null)
  const [quizSectionEnabled, setQuizSectionEnabled] = useState(true)
  const [togglingQuizSection, setTogglingQuizSection] = useState(false)
  const [showNewLabDialog, setShowNewLabDialog] = useState(false)
  const [newLabData, setNewLabData] = useState({
    labNumber: "",
    title: "",
    fileName: "index.html",
    isActive: true,
    deadline: "",
    totalScore: ""
  })
  const [creatingLab, setCreatingLab] = useState(false)

  // Fetch Labs
  const fetchLabs = useCallback(async () => {
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
    }
  }, [])

  // Fetch Students
  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/scores?subject=ITDS283")
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.scores)) {
          // Process students
          const processed = data.scores.map((s: any, index: number) => ({
            ...s,
            id: s.username || `temp-${index}`, // Unique key
            studentId: s.username
          }))
          setStudents(processed)
          setFilteredStudents(processed)
        }
      }
    } catch (e) {
      console.error("Failed to fetch students", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check Auth & Initial Fetch
    const init = async () => {
       fetchLabs()
       fetchStudents()
       
       try {
         const res = await fetch("/api/auth/me")
         const data = await res.json()
         if (data.username === 'kanzaki_aito' || (data.permissions && data.permissions.itds283)) {
            setHasAccess(true)
            setRole(data.role || 'LA')
            setUsername(data.username)
         } else {
            router.push('/admin/dashboard')
         }
       } catch (e) {
         router.push('/admin/dashboard')
       }
    }
    init()
    
    // Fetch Quiz Section Status
    fetch('/api/subjects?code=ITDS283')
      .then(res => res.json())
      .then(data => {
        if (data.subjects && data.subjects.length > 0) {
          setQuizSectionEnabled(data.subjects[0].quizSectionEnabled !== false)
        }
      })
      .catch(err => console.error('Failed to fetch subject info:', err))
  }, [router, fetchLabs, fetchStudents])

  // Filter Logic
  useEffect(() => {
    if (!searchTerm) {
      setFilteredStudents(students)
      return
    }
    const lower = searchTerm.toLowerCase()
    const filtered = students.filter(s => 
      s.username?.toLowerCase().includes(lower) ||
      s.name?.toLowerCase().includes(lower) ||
      s.surname?.toLowerCase().includes(lower) ||
      s.nickname?.toLowerCase().includes(lower) ||
      s.engName?.toLowerCase().includes(lower)
    )
    setFilteredStudents(filtered)
  }, [searchTerm, students])

  // Handle Input Change
  const handleScoreChange = (studentId: string, labNumber: string, value: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, [`Lab ${labNumber}`]: value }
      }
      return s
    }))
    
    // Track update
    const key = `${studentId}-Lab${labNumber}`
    setPendingUpdates(prev => ({
      ...prev,
      [key]: {
        username: studentId, // This is the ID from the sheet
        labNumber: `Lab ${labNumber}`, // Or just number if API handles it, but let's be explicit "Lab 1"
        score: parseFloat(value) || 0,
        subject: 'ITDS283'
      }
    }))
  }

  // Save Changes
  const handleSave = async () => {
    if (Object.keys(pendingUpdates).length === 0) return
    
    setSaving(true)
    try {
      const updates = Object.values(pendingUpdates)
      
      // Batch update via API
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch',
          subject: 'ITDS283',
          updates: updates.map(u => ({
             username: u.username,
             labNumber: u.labNumber,
             score: u.score,
             sheetName: 'ITDS283'
          }))
        })
      })

      if (res.ok) {
        setPendingUpdates({})
        alert("Scores saved successfully!")
      } else {
        alert("Failed to save some scores.")
      }
    } catch (e) {
      console.error("Save error", e)
      alert("Error saving scores")
    } finally {
      setSaving(false)
    }
  }

  // Action Handlers
  async function toggleQuizSection() {
    setTogglingQuizSection(true)
    try {
      const res = await fetch('/api/subjects/toggle-quiz-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectCode: 'ITDS283', enabled: !quizSectionEnabled })
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setQuizSectionEnabled(data.quizSectionEnabled)
        }
      }
    } catch (error) {
      console.error('Failed to toggle quiz section:', error)
    } finally {
      setTogglingQuizSection(false)
    }
  }

  async function handleCreateLab(e: React.FormEvent) {
    e.preventDefault()
    setCreatingLab(true)
    
    try {
      const response = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLabData,
          subject: "ITDS283",
          totalScore: newLabData.totalScore ? parseInt(newLabData.totalScore) : undefined
        })
      })
      
      if (response.ok) {
        setNewLabData({
          labNumber: "",
          title: "",
          fileName: "index.html",
          isActive: true,
          deadline: "",
          totalScore: ""
        })
        setShowNewLabDialog(false)
        fetchLabs() // Refresh labs
      } else {
        const data = await response.json()
        alert(data.error || "Failed to create lab")
      }
    } catch (error) {
      console.error("Failed to create lab:", error)
      alert("Failed to create lab")
    } finally {
      setCreatingLab(false)
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="container mx-auto max-w-[1920px] px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-4">
             <Link href="/admin/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
               <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
             </Link>
             <div className="flex items-center gap-2">
               <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-lg">
                 <Smartphone className="w-5 h-5 text-rose-600 dark:text-rose-400" />
               </div>
               <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 hidden md:block">ITDS283 Score Sheet</h1>
             </div>
           </div>

           <div className="flex items-center gap-3">
             {role === 'Lecturer' && (
               <>
                <button
                  onClick={toggleQuizSection}
                  disabled={togglingQuizSection}
                  className={`hidden lg:flex px-3 py-1.5 text-xs font-medium rounded-lg transition-all items-center gap-2 border ${
                    quizSectionEnabled
                      ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                  }`}
                >
                  Quiz: {quizSectionEnabled ? "ON" : "OFF"}
                </button>
                <button onClick={() => setShowNewLabDialog(true)} className="hidden lg:flex px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors items-center gap-1">
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   New Lab
                </button>
               </>
             )}

             <div className="relative hidden md:block w-48 lg:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input
                 type="text"
                 placeholder="Search student..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
               />
             </div>
             
             <button 
               onClick={fetchStudents}
               className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-600 dark:text-gray-400 transition-colors"
               title="Refresh Data"
             >
               <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>

             <button
               onClick={handleSave}
               disabled={Object.keys(pendingUpdates).length === 0 || saving}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                 Object.keys(pendingUpdates).length > 0
                   ? "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20" 
                   : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-gray-600"
               }`}
             >
               {saving ? (
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               ) : (
                 <Save className="w-4 h-4" />
               )}
               Save {Object.keys(pendingUpdates).length > 0 && `(${Object.keys(pendingUpdates).length})`}
             </button>

             <ModeToggle />
             <LogoutButton />
           </div>
        </div>
      </nav>

      {/* Main Content - Spreadsheet View */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          {loading ? (
             <div className="flex items-center justify-center h-full">
               <div className="text-center">
                 <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-rose-200 border-t-rose-600 mb-4"></div>
                 <p className="text-gray-500">Loading spreadsheet data...</p>
               </div>
             </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-white dark:bg-slate-900 shadow-sm">
                <tr>
                  <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800 w-16">No.</th>
                  <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800 w-32">ID</th>
                  <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800 w-20">Title</th>
                  <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800 w-40">Name</th>
                  <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800 w-40">Surname</th>
                  <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800 w-32">English Name</th>
                  <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800 w-24">Nick (Eng)</th>
                  {/* Lab Columns */}
                  {labs.length > 0 ? labs.map(lab => (
                    <th key={lab.id} className="p-3 text-center font-semibold text-rose-600 dark:text-rose-400 border-b border-gray-200 dark:border-slate-800 w-24 bg-rose-50/50 dark:bg-rose-900/10">
                      Lab {lab.labNumber}
                    </th>
                  )) : (
                     ['1', '2', '3'].map(num => (
                        <th key={num} className="p-3 text-center font-semibold text-rose-600 dark:text-rose-400 border-b border-gray-200 dark:border-slate-800 w-24 bg-rose-50/50 dark:bg-rose-900/10">
                          Lab {num}
                        </th>
                     ))
                  )}
                  <th className="p-3 text-left font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">Email</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800">
                {filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 text-gray-500 dark:text-gray-400">{idx + 1}</td>
                    <td className="p-3 font-mono text-gray-900 dark:text-gray-200">{student.username}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{student.title}</td>
                    <td className="p-3 text-gray-900 dark:text-gray-200">{student.name}</td>
                    <td className="p-3 text-gray-900 dark:text-gray-200">{student.surname}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{student.engName}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{student.nicknameEng}</td>
                    
                    {/* Lab Inputs */}
                    {labs.length > 0 ? labs.map(lab => (
                      <td key={lab.id} className="p-1 border-l border-gray-100 dark:border-slate-800">
                         <input
                           type="number"
                           className={`w-full h-full p-2 text-center bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-rose-500 rounded outline-none transition-all ${
                             pendingUpdates[`${student.studentId}-Lab${lab.labNumber}`] ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                           }`}
                           value={student[`Lab ${lab.labNumber}`] || ''}
                           onChange={(e) => handleScoreChange(student.studentId, lab.labNumber, e.target.value)}
                           placeholder="-"
                         />
                      </td>
                    )) : (
                       ['1', '2', '3'].map(num => (
                          <td key={num} className="p-1 border-l border-gray-100 dark:border-slate-800">
                             <input
                               type="number"
                               className={`w-full h-full p-2 text-center bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-rose-500 rounded outline-none transition-all ${
                                 pendingUpdates[`${student.studentId}-Lab${num}`] ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                               }`}
                               value={student[`Lab ${num}`] || ''}
                               onChange={(e) => handleScoreChange(student.studentId, num, e.target.value)}
                               placeholder="-"
                             />
                          </td>
                       ))
                    )}

                    <td className="p-3 text-gray-500 dark:text-gray-500 text-xs truncate max-w-[200px]">{student.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

       {/* New Lab Dialog */}
       {showNewLabDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create New Lab</h3>
              <button
                onClick={() => setShowNewLabDialog(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateLab} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Lab Number *
                </label>
                <input
                  type="text"
                  required
                  value={newLabData.labNumber}
                  onChange={(e) => setNewLabData({...newLabData, labNumber: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g., Lab01"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={newLabData.title}
                  onChange={(e) => setNewLabData({...newLabData, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g., Mobile App Basics"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={newLabData.fileName}
                  onChange={(e) => setNewLabData({...newLabData, fileName: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="index.html"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Total Score
                </label>
                <input
                  type="number"
                  value={newLabData.totalScore}
                  onChange={(e) => setNewLabData({...newLabData, totalScore: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  value={newLabData.deadline}
                  onChange={(e) => setNewLabData({...newLabData, deadline: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newLabData.isActive}
                  onChange={(e) => setNewLabData({...newLabData, isActive: e.target.checked})}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-2 focus:ring-rose-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Active Lab
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewLabDialog(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLab}
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-lg shadow-rose-500/30 transition-all disabled:opacity-50"
                >
                  {creatingLab ? "Creating..." : "Create Lab"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
