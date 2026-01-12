"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Key, Download, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

interface StudentCredential {
  studentId: string
  name: string
  surname: string
  section: string
  credential: string
}

export default function ITCS223CredentialsPage() {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingNew, setGeneratingNew] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [credentials, setCredentials] = useState<StudentCredential[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load existing credentials on mount
  const loadExistingCredentials = async () => {
    try {
      console.log('📡 Fetching credentials from API...')
      const response = await fetch('/api/credentials?subject=ITCS223')
      console.log('📥 Response status:', response.status, response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Credentials data:', data)
        
        if (data.success && data.credentials && data.credentials.length > 0) {
          console.log(`✅ Found ${data.credentials.length} credentials`)
          
          // Fetch student details from sheets to merge
          console.log('📡 Fetching student details...')
          const scoresResponse = await fetch('/api/scores?subject=ITCS223&action=list_all')
          
          if (scoresResponse.ok) {
            const scoresData = await scoresResponse.json()
            console.log('📊 Students data:', scoresData)
            
            const studentsMap = new Map(scoresData.students.map((s: any) => [s.id || s.studentId, s]))
            
            const enrichedCredentials = data.credentials.map((c: any) => {
              const student: any = studentsMap.get(c.studentId)
              return {
                studentId: c.studentId,
                name: student?.name || '',
                surname: student?.surname || '',
                section: student?.section || '',
                credential: c.credential
              }
            })
            
            console.log('✅ Enriched credentials:', enrichedCredentials.length)
            setCredentials(enrichedCredentials)
          } else {
            console.error('❌ Failed to fetch student details:', scoresResponse.status)
            // Still set credentials even without student details
            setCredentials(data.credentials.map((c: any) => ({
              studentId: c.studentId,
              name: '',
              surname: '',
              section: '',
              credential: c.credential
            })))
          }
        } else {
          console.warn('⚠️ No credentials found or empty response:', { 
            success: data.success, 
            credentialsLength: data.credentials?.length 
          })
        }
      } else {
        console.error('❌ API response not OK:', response.status)
        const errorText = await response.text()
        console.error('Error details:', errorText)
      }
    } catch (error) {
      console.error('❌ Error loading existing credentials:', error)
    }
  }

  // Load on mount
  useEffect(() => {
    loadExistingCredentials()
  }, [])

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
    setLoading(true)
    setGenerating(true)
    setMessage(null)
    
    try {
      // Fetch all students from Google Sheets
      const response = await fetch('/api/scores?subject=ITCS223&action=list_all')
      
      if (!response.ok) {
        throw new Error('Failed to fetch student list')
      }
      
      const data = await response.json()
      
      if (!data.students || data.students.length === 0) {
        setMessage({ type: 'error', text: 'No students found in the system' })
        return
      }
      
      // Generate credentials for each student
      const generatedCredentials = data.students.map((student: any) => ({
        studentId: student.id || student.studentId || '',
        name: student.name || '',
        surname: student.surname || '',
        section: student.section || '',
        credential: generateCredential()
      }))
      
      // Save credentials to database
      const saveResponse = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: generatedCredentials,
          subject: 'ITCS223'
        })
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save credentials to database')
      }

      setCredentials(generatedCredentials)
      setMessage({ 
        type: 'success', 
        text: `Successfully generated and saved credentials for ${generatedCredentials.length} students` 
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
    const headers = ['Student ID', 'Name', 'Surname', 'Section', 'Access Code']
    const rows = credentials.map(c => [
      c.studentId,
      c.name,
      c.surname,
      c.section,
      c.credential
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `itcs223_credentials_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRegenerate = (index: number) => {
    const newCredentials = [...credentials]
    newCredentials[index].credential = generateCredential()
    setCredentials(newCredentials)
  }

  const handleFetchAndGenerateNewOnly = async () => {
    setLoading(true)
    setGeneratingNew(true)
    setMessage(null)
    
    try {
      // Fetch all students from Google Sheets
      const response = await fetch('/api/scores?subject=ITCS223&action=list_all')
      
      if (!response.ok) {
        throw new Error('Failed to fetch student list')
      }
      
      const data = await response.json()
      
      if (!data.students || data.students.length === 0) {
        setMessage({ type: 'error', text: 'No students found in the system' })
        return
      }

      // Get existing student IDs with credentials
      const existingIds = new Set(credentials.map(c => c.studentId))
      
      // Filter only new students
      const newStudents = data.students.filter((student: any) => {
        const studentId = student.id || student.studentId || ''
        return studentId && !existingIds.has(studentId)
      })

      if (newStudents.length === 0) {
        setMessage({ type: 'success', text: 'All students already have credentials!' })
        return
      }
      
      // Generate credentials only for new students
      const newCredentials = newStudents.map((student: any) => ({
        studentId: student.id || student.studentId || '',
        name: student.name || '',
        surname: student.surname || '',
        section: student.section || '',
        credential: generateCredential()
      }))
      
      // Save new credentials to database
      const saveResponse = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: newCredentials,
          subject: 'ITCS223'
        })
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save credentials to database')
      }

      // Merge with existing credentials
      setCredentials([...credentials, ...newCredentials])
      setMessage({ 
        type: 'success', 
        text: `Successfully generated and saved credentials for ${newCredentials.length} new students` 
      })
      
    } catch (error: any) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: error.message || 'An error occurred' })
    } finally {
      setLoading(false)
      setGeneratingNew(false)
    }
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
          subject: 'ITCS223',
          removeAll: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to remove credentials from database')
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
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/itcs223" className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Key className="w-8 h-8 text-teal-400" />
                Student Access Credentials
              </h1>
              <p className="text-slate-400 text-sm mt-1">Generate secure access codes for ITCS223 score checking</p>
            </div>
          </div>
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
          <h2 className="text-lg font-bold text-white">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleFetchAndGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating All...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Fetch & Generate All
                </>
              )}
            </button>

            <button
              onClick={handleFetchAndGenerateNewOnly}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {generatingNew ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating New...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Generate for New Students Only
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
                      Remove All Credentials
                    </>
                  )}
                </button>
              </>
            )}
          </div>
          <div className="space-y-2 text-xs text-slate-500">
            <p><strong>Fetch & Generate All:</strong> Replace all credentials with new ones for all students in the sheet.</p>
            <p><strong>Generate for New Students Only:</strong> Only generate credentials for students who don't have one yet.</p>
            {credentials.length > 0 && (
              <p className="text-red-400"><strong>Remove All Credentials:</strong> Clear all credentials to prepare for next semester.</p>
            )}
          </div>
        </div>

        {/* Credentials Table */}
        {credentials.length > 0 && (
          <div className="bg-[#161b22] rounded-xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Generated Credentials ({credentials.length} students)</h2>
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
                      <td className="px-6 py-4 text-sm text-slate-300">{cred.name} {cred.surname}</td>
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

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 space-y-3">
          <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Instructions
          </h3>
          <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
            <li><strong>Generate for New Students Only:</strong> Use this during the semester when new students join. Only students without credentials will get new codes.</li>
            <li><strong>Fetch & Generate All:</strong> Regenerates credentials for ALL students. Use this at the start of a new semester or to reset all codes.</li>
            <li>Each student receives a unique 6-character alphanumeric access code</li>
            <li>Use "Regenerate" button to create a new code for a specific student if needed</li>
            <li>Download the CSV file to share credentials with students via email or LMS</li>
            <li><strong className="text-red-400">Remove All Credentials:</strong> Clears the entire credential database. Use this only when preparing for a new semester.</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
