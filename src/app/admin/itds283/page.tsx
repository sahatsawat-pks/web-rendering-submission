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
             <div className="relative hidden md:block w-64">
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
                     // Fallback if no active labs, show generic Lab 1-3
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
    </div>
  )
}
