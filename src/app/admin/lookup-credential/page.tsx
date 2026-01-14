"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, Key, Copy, CheckCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CredentialLookupPage() {
  const [studentId, setStudentId] = useState("")
  const [result, setResult] = useState<{ studentId: string, credential: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Auth state
  const [authLoading, setAuthLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userRole, setUserRole] = useState("")

  useEffect(() => {
    // Check authorization: LA, Lecturer, or Main Admin (kanzaki_aito)
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        if (data.isAuthenticated) {
          const userData = data.user || {}
          const role = userData.role || ''
          const username = userData.username || ''
          setUserRole(role)
          
          if (role === 'Lecturer' || role === 'LA' || username === 'kanzaki_aito') {
            setIsAuthorized(true)
          }
        }
      })
      .catch(err => console.error(err))
      .finally(() => setAuthLoading(false))
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)
    setCopied(false)

    try {
      const res = await fetch(`/api/credentials?studentId=${studentId.trim()}`)
      const data = await res.json()

      if (data.success && data.credentials && data.credentials.length > 0) {
        setResult(data.credentials[0])
      } else {
        setError("No credential found for this Student ID.")
      }
    } catch (err) {
      setError("Failed to fetch credential.")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (result?.credential) {
      navigator.clipboard.writeText(result.credential)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center max-w-md w-full">
          <Key className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-slate-400 mb-6">You do not have permission to view this page. Restricted to LAs and Lecturers.</p>
          <Link href="/admin/dashboard" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 p-4 sm:p-8 font-['Inter']">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/dashboard" 
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Key className="w-6 h-6 text-teal-400" />
              Credential Lookup
            </h1>
            <p className="text-slate-400 text-sm">Find student credentials by ID • Authorized for {userRole || 'Admin'}</p>
          </div>
        </div>

        {/* Search Card */}
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Enter Student ID (e.g., 66xxxxxx)" 
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0f1115] border border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-200 placeholder:text-slate-600 transition-all font-mono"
                autoFocus
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !studentId.trim()}
              className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 min-w-[120px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Lookup"}
            </button>
          </form>
        </div>

        {/* Result Area */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-8 text-center animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500/0 via-teal-500 to-teal-500/0 opacity-50"></div>
            
            <p className="text-teal-200/60 uppercase tracking-widest text-xs font-bold mb-4">Student Credential Found</p>
            
            <div className="bg-[#0f1115] border border-teal-500/30 rounded-lg p-6 max-w-sm mx-auto mb-6 relative group">
              <div className="text-4xl font-mono font-bold text-white tracking-wider">
                {result.credential}
              </div>
              <p className="text-slate-500 text-sm mt-2">ID: {result.studentId}</p>
            </div>

            <button 
              onClick={copyToClipboard}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                copied 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/30'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Code
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
