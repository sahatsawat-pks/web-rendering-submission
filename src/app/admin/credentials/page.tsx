"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Key, Download, RefreshCw, CheckCircle, AlertCircle, Filter } from "lucide-react"
import Link from "next/link"

interface StudentCredential {
  studentId: string
  name: string
  surname: string
  section: string
  credential: string
  subject?: string
}

const SUBJECTS = [
  'ITCS123', 
  'ITCS223', 
  'ITCS227', 
  'ITCS251', 
  'ITCS255', 
  'ITGE162', 
  'ITDS283'
]

export default function UniversalCredentialsPage() {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingNew, setGeneratingNew] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [credentials, setCredentials] = useState<StudentCredential[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Selection State
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0])
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('')

  // Check authentication and authorization on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check')
        const data = await res.json()
        
        if (data.isAuthenticated) {
          const userData = data.user || {}
          setIsAuthenticated(true)
          setUsername(userData.username || '')
          setRole(userData.role || '')
          
          // Only Lecturer and kanzaki_aito can access credentials
          if (userData.role === 'Lecturer' || userData.username === 'kanzaki_aito') {
            setIsAuthorized(true)
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setAuthLoading(false)
      }
    }
    
    checkAuth()
  }, [])

  // Load existing credentials on mount
  // Load existing credentials on mount
  const loadExistingCredentials = async () => {
    setLoading(true)
    setMessage(null)
    try {
      console.log('📡 Fetching credentials and student list...')
      
      // 1. Fetch ALL credentials (to match existing students from other subjects)
      const credRes = await fetch('/api/credentials')
      let dbCredentials: any[] = []
      if (credRes.ok) {
        const credData = await credRes.json()
        dbCredentials = credData.credentials || []
      }

      // 2. Fetch student list from Google Sheets
      const sheetRes = await fetch(`/api/scores?subject=${selectedSubject}&action=list_all`)
      let sheetStudents: any[] = []
      if (sheetRes.ok) {
         const sheetData = await sheetRes.json()
         sheetStudents = sheetData.students || []
      }

      // 3. Merge data
      // Create a map of existing credentials
      const credMap = new Map(dbCredentials.map((c: any) => [c.studentId, c]))

      // Combine lists: Preference to Sheet students (to show missing ones)
      const mergedList: StudentCredential[] = []
      const processedIds = new Set()

      // Add students from Sheet
      sheetStudents.forEach((student: any) => {
        const sid = student.id || student.studentId
        const existing = credMap.get(sid)
        processedIds.add(sid)
        
        mergedList.push({
          studentId: sid,
          name: student.name || existing?.name || '',
          surname: student.surname || existing?.surname || '',
          section: student.section || existing?.section || '',
          credential: existing?.credential || '', // Will be rendered as placeholder in UI if empty
          subject: selectedSubject
        })
      })

      // Add remaining from DB (only if they belong to this subject context roughly, or if we want to show orphans)
      // To keep it clean, let's only add orphans if their 'subject' matches the current view.
      dbCredentials.forEach((cred: any) => {
        if (!processedIds.has(cred.studentId) && cred.subject === selectedSubject) {
          mergedList.push(cred)
        }
      })

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
      const credRes = await fetch('/api/credentials')
      const credData = await credRes.json()
      const existingMap = new Map(credData.credentials.map((c: any) => [c.studentId, c.credential]))

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
        headers: { 'Content-Type': 'application/json' },
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
    if (credentials.length === 0) return
    
    // Create CSV content
    const headers = ['Student ID', 'Name', 'Surname', 'Section', 'Access Code', 'Source Subject']
    const rows = credentials.map(c => [
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: [{
            studentId: credToUpdate.studentId,
            name: credToUpdate.name,
            surname: credToUpdate.surname,
            section: credToUpdate.section,
            credential: newCredential
          }],
          subject: selectedSubject
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

  const handleFetchAndGenerateNewOnly = async () => {
     // This function is redundant now that handleFetchAndGenerate is smart, 
     // but we can keep it for explicit "New Only" intent if user prefers.
     // Effectively handleFetchAndGenerate DOES "New Only" by default now (preserving existing).
     // So I will just alias it or keep UI logic.
     await handleFetchAndGenerate()
  }

  const handleRemoveAllCredentials = async () => {
    if (!confirm('⚠️ Are you sure you want to REMOVE ALL credentials? This action cannot be undone and is typically done when preparing for a new semester.')) {
      return
    }

    if (!confirm('This will delete ALL student credentials from the database. Type YES in the next dialog to confirm.')) {
      return
    }

    const confirmation = prompt('Type "DELETE ALL" to confirm removal of all credentials:')
    if (confirmation !== 'DELETE ALL') {
      setMessage({ type: 'error', text: 'Confirmation text did not match. Credentials were not deleted.' })
      return
    }

    setRemoving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          removeAll: true,
          subject: selectedSubject
        })
      })

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to remove credentials from database')
      }

      setCredentials([])
      setMessage({ 
        type: 'success', 
        text: 'All credentials have been removed successfully. Ready for next semester!' 
      })
      
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: error.message || 'An error occurred' })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 p-8 font-['Inter']">
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
              {SUBJECTS.map(sub => (
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
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>

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

        {/* Credentials Table */}
        {credentials.length > 0 && (
          <div className="bg-[#161b22] rounded-xl border border-white/5 overflow-hidden">
             
             {/* Note about view filtering */}
             <div className="p-4 bg-slate-800/50 border-b border-white/5 text-xs text-slate-400 flex items-center justify-between">
                <span>Displaying all universal credentials. Names/Sections shown are synced from <strong>{selectedSubject}</strong> where available.</span>
                <span className="font-mono bg-slate-900 px-2 py-1 rounded text-teal-500">{credentials.length} Records</span>
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
                      <td className="px-6 py-4 text-sm font-mono text-slate-300">{cred.studentId}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{cred.name || <span className="text-slate-600 italic">No Match in {selectedSubject}</span>} {cred.surname}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{cred.section}</td>
                      <td className="px-6 py-4">
                        <code className="px-3 py-1.5 bg-teal-500/10 text-teal-400 rounded font-mono text-sm font-bold border border-teal-500/20">
                          {cred.credential}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleRegenerate(index)}
                          className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors flex items-center gap-1"
                          title="Regenerate code"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Regenerate
                        </button>
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
    </div>
  )
}
