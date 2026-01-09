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
  const [credentials, setCredentials] = useState<StudentCredential[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Load existing credentials on mount
  const loadExistingCredentials = async () => {
    try {
      const response = await fetch('/api/credentials?subject=ITCS223')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.credentials.length > 0) {
          // Fetch student details from sheets to merge
          const scoresResponse = await fetch('/api/scores?subject=ITCS223&action=list_all')
          if (scoresResponse.ok) {
            const scoresData = await scoresResponse.json()
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
            setCredentials(enrichedCredentials)
          }
        }
      }
    } catch (error) {
      console.error('Error loading existing credentials:', error)
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
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Fetch Students & Generate Credentials
                </>
              )}
            </button>
            
            {credentials.length > 0 && (
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            This will fetch all students from Google Sheets and generate unique 6-character access codes.
          </p>
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
            <li>Click "Fetch Students & Generate Credentials" to load all students from Google Sheets</li>
            <li>Each student will receive a unique 6-character alphanumeric access code</li>
            <li>Use "Regenerate" button to create a new code for a specific student</li>
            <li>Download the CSV file to share credentials with students</li>
            <li>Students will use these codes to access their lab scores securely</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
