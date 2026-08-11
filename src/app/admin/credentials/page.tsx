"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Key, Download, RefreshCw, CheckCircle, AlertCircle, Filter, UserPlus } from "lucide-react"
import Link from "next/link"
import { AlertDialog } from "@/components/AlertDialog"

interface StudentCredential {
  studentId: string
  name: string
  surname: string
  section: string
  credential: string
  subject?: string
}

// SUBJECTS removed in favor of dynamic fetching

export default function UniversalCredentialsPage() {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingNew, setGeneratingNew] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [credentials, setCredentials] = useState<StudentCredential[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Individual Credential Form State
  const [newStudentId, setNewStudentId] = useState("")
  const [newCredential, setNewCredential] = useState("")
  const [newName, setNewName] = useState("")
  const [newSurname, setNewSurname] = useState("")
  const [newSection, setNewSection] = useState("")
  const [addingIndividual, setAddingIndividual] = useState(false)
  
  // Selection State
  const [subjects, setSubjects] = useState<string[]>([])
  const [selectedSubject, setSelectedSubject] = useState("")
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('')
  
  // Alert Dialog state
  const [showRemoveAlert, setShowRemoveAlert] = useState(false)
  const [confirmationStep, setConfirmationStep] = useState<'initial' | 'text'>('initial')
  const [confirmationText, setConfirmationText] = useState('')

  // Fetch subjects and check auth
  useEffect(() => {
    const init = async () => {
      // 1. Fetch Subjects
      try {
        const subRes = await fetch('/api/subjects')
        if (subRes.ok) {
           const data = await subRes.json()
           if (data.subjects) {
               const codes = data.subjects.map((s: any) => s.code || s.title)
               setSubjects(codes)
               if (codes.length > 0) setSelectedSubject(codes[0])
           }
        }
      } catch (e) {
          console.error("Failed to fetch subjects", e)
      }

      // 2. Check Auth
      try {
        const res = await fetch('/api/auth/check')
        const data = await res.json()
        
        if (data.isAuthenticated) {
          const userData = data.user || {}
          setIsAuthenticated(true)
          setUsername(userData.username || '')
          setRole(userData.role || '')
          if (userData.role === 'Lecturer' || userData.role === 'Main Admin' || userData.username === 'kanzaki_aito') {
            setIsAuthorized(true)
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setAuthLoading(false)
      }
    }
    
    init()
  }, [])

  // Load existing credentials on mount
  // Load existing credentials on mount
  const loadExistingCredentials = async () => {
    setLoading(true)
    setMessage(null)
    try {
      // console.log('📡 Fetching credentials and student list...')
      
      // 1. Fetch ALL credentials (to match existing students from other subjects)
      const credRes = await fetch('/api/credentials', { cache: 'no-store', headers: { 'Pragma': 'no-cache' } })
      let dbCredentials: any[] = []
      if (credRes.ok) {
        const credData = await credRes.json()
        dbCredentials = credData.credentials || []
      }

      // 2. Fetch student list from Google Sheets
      const sheetRes = await fetch(`/api/scores?subject=${selectedSubject}&action=list_all`, { cache: 'no-store', headers: { 'Pragma': 'no-cache' } })
      let sheetStudents: any[] = []
      if (sheetRes.ok) {
         const sheetData = await sheetRes.json()
         sheetStudents = sheetData.students || []
      }

      // 3. Merge data: Include students from Sheet AND any DB credentials for this subject
      const credMap = new Map((dbCredentials || []).map((c: any) => [c.studentId, c]))
      const sheetSidSet = new Set<string>()

      const mergedList: StudentCredential[] = []

      // Add students from Sheet for the selected subject
      sheetStudents.forEach((student: any) => {
        const sid = String(student.id || student.studentId || '').trim()
        if (!sid) return
        sheetSidSet.add(sid)
        const existing = credMap.get(sid)
        
        mergedList.push({
          studentId: sid,
          name: student.name || existing?.name || '',
          surname: student.surname || existing?.surname || '',
          section: student.section || existing?.section || '',
          credential: existing?.credential || existing?.credentialCode || '',
          subject: selectedSubject
        })
      })

      // ALSO add any DB credentials for the selected subject that were NOT in the sheet
      dbCredentials.forEach((c: any) => {
        const sid = String(c.studentId || '').trim()
        if (sid && !sheetSidSet.has(sid)) {
          const credSub = c.subject ? String(c.subject).trim().toUpperCase() : ''
          const selSub = String(selectedSubject).trim().toUpperCase()
          if (!credSub || credSub === selSub || !selectedSubject) {
            mergedList.push({
              studentId: sid,
              name: c.name || '',
              surname: c.surname || '',
              section: c.section || '',
              credential: c.credential || c.credentialCode || '',
              subject: selectedSubject
            })
            sheetSidSet.add(sid)
          }
        }
      })

      // For students with empty name (not in sheet), try to fetch from API
      const studentsToFetch = mergedList.filter(s => !s.name)
      if (studentsToFetch.length > 0) {
        await Promise.all(
          studentsToFetch.map(async (student) => {
            try {
              const response = await fetch(`/api/students?id=${student.studentId}`)
              if (response.ok) {
                const data = await response.json()
                if (data.students && data.students.length > 0) {
                  student.name = data.students[0].name || ''
                  student.surname = data.students[0].surname || ''
                  student.section = student.section || data.students[0].section || ''
                }
              }
            } catch (error) {
              console.error(`Error fetching student ${student.studentId}:`, error)
            }
          })
        )
      }

      setCredentials(mergedList)
    } catch (error) {
      console.error('❌ Error loading data:', error)
      setMessage({ type: 'error', text: 'Failed to load student list' })
    } finally {
      setLoading(false)
    }
  }

  // Load on mount and when selectedSubject changes (to refresh names)
  useEffect(() => {
    if (isAuthorized) {
      loadExistingCredentials()
    }
  }, [isAuthorized, selectedSubject])

  // Generate random 6-character alphanumeric credential
  const generateCredential = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Handler for adding an individual student credential
  const handleAddIndividualCredential = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentId.trim()) {
      setMessage({ type: 'error', text: 'Student ID is required' })
      return
    }

    setAddingIndividual(true)
    setMessage(null)

    try {
      const finalCredential = newCredential.trim() || generateCredential()
      const targetSubject = selectedSubject || subjects[0] || 'ITCS112'

      const res = await fetch('/api/credentials', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache' },
        body: JSON.stringify({
          subject: targetSubject,
          overwriteExisting: true,
          credentials: [{
            studentId: newStudentId.trim(),
            credential: finalCredential,
            name: newName.trim(),
            surname: newSurname.trim(),
            section: newSection.trim()
          }]
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save individual credential')
      }

      setMessage({ 
        type: 'success', 
        text: `Successfully added credential for Student ID ${newStudentId.trim()} (${targetSubject})! Access Code: ${finalCredential}` 
      })

      // Reset form
      setNewStudentId("")
      setNewCredential("")
      setNewName("")
      setNewSurname("")
      setNewSection("")

      // Refresh credentials list
      await loadExistingCredentials()
    } catch (error: any) {
      console.error('Failed to add individual credential:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to add credential' })
    } finally {
      setAddingIndividual(false)
    }
  }

  const handleFetchAndGenerate = async () => {
    if (!confirm(`Are you sure you want to SYNC students for ${selectedSubject}?\n\nThis will:\n1. Fetch the latest student list from Google Sheets.\n2. Keep existing credentials for current students.\n3. Generate NEW credentials only for new students.\n\nExisting codes will NOT be overwritten.`)) return

    setLoading(true)
    setGenerating(true)
    setMessage(null)
    
    try {
      // Fetch students from selected subject
      const response = await fetch(`/api/scores?subject=${selectedSubject}&action=list_all`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch student list')
      }
      
      const data = await response.json()
      
      if (!data.students || data.students.length === 0) {
        setMessage({ type: 'error', text: `No students found in ${selectedSubject}` })
        return
      }
      
      // Get existing credentials map to preserve codes if we want? 
      // Actually, "Generate All" implies regenerating or ensuring they exist.
      // But if we want to KEEP existing codes for existing students, we should check first.
      // Code below was generating NEW codes for everyone. Let's make it smarter:
      // If student has code, KEEP it. If not, generate. 
      // User asked "where can I create credential". Usually they want to CREATE.
      // If they want to RESET, they should use "Regenerate" or something.
      // But let's stick to the previous behavior for "Fetch & Generate All" which updated/ensured credentials.
      // Wait, previous code generated NEW codes for everyone. That might be destructive if students already have codes.
      // Ideally "Sync" should only add missing. "Reset" should update all.
      // Let's implement "Sync" logic: Fetch existing, if exists, use it. Else generate.
      
      // 1. Get current credentials from DB
      const credRes = await fetch('/api/credentials', { cache: 'no-store', headers: { 'Pragma': 'no-cache' } })
      const credData = await credRes.json()
      const dbCredList: any[] = credData.credentials || []
      const existingMap = new Map(dbCredList.map((c: any) => [c.studentId, c.credential || c.credentialCode]))

      // Generate credentials
      const generatedCredentials = data.students.map((student: any) => {
        const sid = student.id || student.studentId || ''
        return {
          studentId: sid,
          name: student.name || '',
          surname: student.surname || '',
          section: student.section || '',
          // Preserve existing if available, else generate new
          credential: existingMap.get(sid) || generateCredential() 
        }
      })
      
      // Save credentials to database
      const saveResponse = await fetch('/api/credentials', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache' },
        body: JSON.stringify({
          credentials: generatedCredentials,
          subject: selectedSubject // Just for reference, DB ignores for uniqueness
        })
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save credentials to database')
      }

      // Refresh list
      loadExistingCredentials()
      
      const newCount = generatedCredentials.filter((c: any) => !existingMap.has(c.studentId)).length
      const reusedCount = generatedCredentials.length - newCount
      
      setMessage({ 
        type: 'success', 
        text: `Synced ${generatedCredentials.length} students.\n• ${newCount} New credentials generated.\n• ${reusedCount} Existing credentials preserved & reused.` 
      })
      
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: error.message || 'An error occurred' })
    } finally {
      setLoading(false)
      setGenerating(false)
    }
  }

  const handleDownloadCSV = () => {
    const credentialsWithValues = credentials.filter(c => c.credential)
    if (credentialsWithValues.length === 0) return
    
    // Create CSV content
    const headers = ['Student ID', 'Name', 'Surname', 'Section', 'Access Code', 'Source Subject']
    const rows = credentialsWithValues.map(c => [
      c.studentId,
      c.name,
      c.surname,
      c.section,
      c.credential,
      c.subject || selectedSubject
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `universal_credentials_${new Date().toISOString().split('T')[0]}.csv`) // Changed filename
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRegenerate = async (index: number) => {
    const credToUpdate = credentials[index]
    const newCredential = generateCredential()
    
    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache' },
        body: JSON.stringify({
          credentials: [{
            studentId: credToUpdate.studentId,
            name: credToUpdate.name,
            surname: credToUpdate.surname,
            section: credToUpdate.section,
            credential: newCredential
          }],
          subject: selectedSubject,
          overwriteExisting: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save regenerated credential')
      }

      loadExistingCredentials()
      setMessage({ 
        type: 'success', 
        text: `Successfully regenerated credential for student ${credToUpdate.studentId}` 
      })
      
    } catch (error: any) {
      console.error('Error regenerating credential:', error)
      setMessage({ type: 'error', text: 'Failed to save regenerated credential' })
    }
  }

  const handleGenerateOne = async (index: number) => {
    const credToUpdate = credentials[index]
    const newCredential = generateCredential()
    
    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache' },
        body: JSON.stringify({
          credentials: [{
            studentId: credToUpdate.studentId,
            name: credToUpdate.name,
            surname: credToUpdate.surname,
            section: credToUpdate.section,
            credential: newCredential
          }],
          subject: selectedSubject,
          overwriteExisting: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save regenerated credential')
      }

      loadExistingCredentials()
      setMessage({ 
        type: 'success', 
        text: `Successfully generated access code ${newCredential} for student ${credToUpdate.studentId}` 
      })
      
    } catch (error: any) {
      console.error('Error generating credential:', error)
      setMessage({ type: 'error', text: 'Failed to generate credential' })
    }
  }

  const handleFetchAndGenerateNewOnly = async () => {
     // This function is redundant now that handleFetchAndGenerate is smart, 
     // but we can keep it for explicit "New Only" intent if user prefers.
     // Effectively handleFetchAndGenerate DOES "New Only" by default now (preserving existing).
     // So I will just alias it or keep UI logic.
     await handleFetchAndGenerate()
  }

  const handleRemoveAllCredentials = async () => {
    setShowRemoveAlert(true)
    setConfirmationStep('initial')
    setConfirmationText('')
  }

  const handleRemoveConfirmation = async () => {
    console.log('🔴 handleRemoveConfirmation called - confirmationStep:', confirmationStep)
    
    if (confirmationStep === 'initial') {
      // Move to text confirmation step
      console.log('🟡 Moving to text confirmation step')
      setConfirmationStep('text')
      setConfirmationText('')
      return
    }

    // Final confirmation step
    console.log('🔵 Final confirmation step - checking text:', confirmationText)
    if (confirmationText !== 'DELETE ALL') {
      setMessage({ type: 'error', text: 'Confirmation text did not match. Please try again.' })
      setShowRemoveAlert(false)
      setConfirmationStep('initial')
      return
    }

    setRemoving(true)
    setMessage(null)

    try {
      console.log('Sending DELETE request with removeAll: true')
      const response = await fetch('/api/credentials', {
        method: 'DELETE',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Pragma': 'no-cache' },
        body: JSON.stringify({
          removeAll: true
        })
      })

      console.log('DELETE response status:', response.status)
      const data = await response.json()
      console.log('DELETE response data:', data)

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to remove credentials from database')
      }

      console.log('Deletion successful, cleared credentials from UI')
      setCredentials([])
      setMessage({ 
        type: 'success', 
        text: `All credentials have been removed successfully (${data.count || 0} records deleted)!` 
      })
      setShowRemoveAlert(false)
      setConfirmationStep('initial')
      
    } catch (error: any) {
      console.error('Error removing credentials:', error)
      setMessage({ type: 'error', text: error.message || 'An error occurred' })
      setShowRemoveAlert(false)
      setConfirmationStep('initial')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 p-8 font-sans">
      {authLoading ? (
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Checking authorization...</p>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Authentication Required</h2>
            <Link href="/admin/login" className="inline-block px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg transition-colors">
              Go to Login
            </Link>
          </div>
        </div>
      ) : !isAuthorized ? (
        <div className="max-w-7xl mx-auto">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-orange-400 mb-4">Access Denied</h2>
            <p className="text-slate-300 mb-2">Restricted to Lecturers and Main Admin only.</p>
            <Link href="/admin/dashboard" className="inline-block px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg transition-colors">
              Return to Dashboard
            </Link>
          </div>
        </div>
      ) : (
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Key className="w-8 h-8 text-teal-400" />
                Universal Credential Management
              </h1>
              <p className="text-slate-400 text-sm mt-1">Manage one single credential for each student across all subjects.</p>
            </div>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="bg-[#1a1d24] border border-indigo-500/20 p-6 rounded-xl flex items-center gap-4 shadow-lg">
          <Filter className="w-5 h-5 text-indigo-400" />
          <div className="flex overflow-hidden rounded-lg border border-slate-700">
            <span className="bg-slate-800 px-4 py-3 text-sm text-slate-400 font-medium">Sync with Student List from:</span>
            <select 
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-[#0f1115] text-white px-4 py-3 outline-none min-w-[150px] cursor-pointer hover:bg-slate-900 transition-colors"
            >
              {subjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-slate-500 ml-2">Select a subject to import student list from.</p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          } animate-fade-in`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Add Individual Credential Section */}
        <div className="bg-[#161b22] rounded-xl p-6 border border-teal-500/30 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-400" />
              Add Individual Student Credential
            </h2>
            <span className="text-xs text-slate-400">Add a single student without needing Google Sheets</span>
          </div>

          <form onSubmit={handleAddIndividualCredential} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Student ID *</label>
              <input
                type="text"
                required
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
                placeholder="e.g. 6788138"
                className="w-full px-3 py-2 bg-[#0f1115] border border-slate-700 rounded-lg text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Access Code (Credential)</span>
                <button
                  type="button"
                  onClick={() => setNewCredential(generateCredential())}
                  className="text-[10px] text-teal-400 hover:underline flex items-center gap-0.5"
                >
                  🎲 Auto-Generate
                </button>
              </label>
              <input
                type="text"
                value={newCredential}
                onChange={(e) => setNewCredential(e.target.value.toUpperCase())}
                placeholder="Leave blank to auto-generate"
                maxLength={10}
                className="w-full px-3 py-2 bg-[#0f1115] border border-slate-700 rounded-lg text-white font-mono text-sm uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Name (Optional)</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Firstname"
                className="w-full px-3 py-2 bg-[#0f1115] border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Surname (Optional)</label>
              <input
                type="text"
                value={newSurname}
                onChange={(e) => setNewSurname(e.target.value)}
                placeholder="Lastname"
                className="w-full px-3 py-2 bg-[#0f1115] border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Section (Optional)</label>
              <input
                type="text"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-3 py-2 bg-[#0f1115] border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

            <div className="lg:col-span-5 flex items-end">
              <button
                type="submit"
                disabled={addingIndividual || !newStudentId.trim()}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {addingIndividual ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding Credential...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Add Individual Credential to {selectedSubject || 'Subject'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="bg-[#161b22] rounded-xl p-6 border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">Actions for {selectedSubject}</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleFetchAndGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync & Add Missing Students
                </>
              )}
            </button>
            
            {credentials.length > 0 && (
              <>
                {credentials.some(c => c.credential) && (
                  <button
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                )}

                <button
                  onClick={handleRemoveAllCredentials}
                  disabled={removing}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors ml-auto"
                >
                  {removing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Remove All Universal Credentials
                    </>
                  )}
                </button>
              </>
            )}
          </div>
          <div className="space-y-2 text-xs text-slate-500">
            <p><strong>Sync & Generate Credentials:</strong> Fetches student list from <strong>{selectedSubject}</strong>. If a student already has a universal credential, it keeps it. If not, it generates a new one. This is safe to run multiple times to add new students.</p>
            {credentials.length > 0 && (
              <p className="text-red-400"><strong>Remove All:</strong> This is a DESTRUCTIVE action that clears the database for ALL subjects. Only use at semester end.</p>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="bg-[#161b22] rounded-xl border border-white/5 p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-slate-400 font-medium">Loading student data for {selectedSubject}...</p>
          </div>
        )}

        {/* Empty State when no students loaded */}
        {!loading && credentials.length === 0 && (
          <div className="bg-[#161b22] rounded-xl border border-white/5 p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Student List Found for {selectedSubject}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click <strong>"Sync & Add Missing Students"</strong> above to fetch the latest student roster for <strong>{selectedSubject}</strong> from Google Sheets and generate access codes.
            </p>
          </div>
        )}

        {/* Credentials Table */}
        {!loading && credentials.length > 0 && (
          <div className="bg-[#161b22] rounded-xl border border-white/5 overflow-hidden">
             
             {/* Note about view filtering */}
             <div className="p-4 bg-slate-800/50 border-b border-white/5 text-xs text-slate-400 flex items-center justify-between">
                <span>Displaying <strong>{credentials.length}</strong> students for <strong>{selectedSubject}</strong>.</span>
                <div className="flex gap-2">
                  <span className="font-mono bg-teal-950/80 border border-teal-800 text-teal-400 px-2 py-1 rounded text-xs">
                    {credentials.filter(c => c.credential).length} Access Codes Generated
                  </span>
                  {credentials.filter(c => !c.credential).length > 0 && (
                    <span className="font-mono bg-amber-950/80 border border-amber-800 text-amber-400 px-2 py-1 rounded text-xs">
                      {credentials.filter(c => !c.credential).length} Missing Codes
                    </span>
                  )}
                </div>
             </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0f1115] border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Section</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Access Code</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {credentials.map((cred, index) => (
                    <tr key={index} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-300 font-semibold">{cred.studentId}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {cred.name ? `${cred.name} ${cred.surname || ''}` : <span className="text-slate-500 italic">No Name in {selectedSubject}</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">{cred.section || '-'}</td>
                      <td className="px-6 py-4">
                        {cred.credential ? (
                          <code className="px-3 py-1.5 bg-teal-500/10 text-teal-400 rounded font-mono text-sm font-bold border border-teal-500/20">
                            {cred.credential}
                          </code>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded text-xs font-semibold border border-amber-500/20">
                            No Access Code Yet
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {cred.credential ? (
                          <button
                            onClick={() => handleRegenerate(index)}
                            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded transition-colors flex items-center gap-1"
                            title="Regenerate code"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Regenerate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGenerateOne(index)}
                            className="text-xs px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded transition-colors flex items-center gap-1 shadow-sm"
                            title="Generate access code"
                          >
                            <Key className="w-3 h-3" />
                            + Generate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Alert Dialog for Remove All */}
      <AlertDialog
        isOpen={showRemoveAlert}
        onOpenChange={(open) => {
          if (!open) {
            setShowRemoveAlert(false)
            setConfirmationStep('initial')
            setConfirmationText('')
          }
        }}
        title={confirmationStep === 'initial' ? 'Remove All Credentials?' : 'Confirm Removal'}
        description={
          confirmationStep === 'initial'
            ? '⚠️ This will permanently delete ALL universal credentials from the database across ALL subjects. This action cannot be undone.'
            : 'Type "DELETE ALL" to confirm that you want to permanently remove all credentials.'
        }
        confirmText={confirmationStep === 'initial' ? 'I understand, continue' : 'Remove All'}
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleRemoveConfirmation}
      >
        {confirmationStep === 'text' && (
          <input
            type="text"
            placeholder='Type "DELETE ALL"'
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-200 animate-pulse-in"
            style={{
              animation: 'slideInUp 0.3s ease-out'
            }}
          />
        )}
      </AlertDialog>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-pulse-in {
          animation: slideInUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
