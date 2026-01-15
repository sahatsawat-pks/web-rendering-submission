"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Home, Mail, Send, TestTube, Upload, Download, AlertCircle, CheckCircle } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"

interface Student {
  studentId: string
  name: string
  email: string
  credential?: string
  hasCredential?: boolean
}

export default function SendCredentialsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [testEmail, setTestEmail] = useState("sahatsawat.nij@student.mahidol.edu")
  const [subject, setSubject] = useState("")
  const [sending, setSending] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
 const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Parse CSV or TSV data
  function parseStudentData(text: string): Student[] {
    const lines = text.trim().split('\n')
    if (lines.length === 0) return []

    // Detect delimiter (comma or tab)
    const firstLine = lines[0]
    const delimiter = firstLine.includes('\t') ? '\t' : ','

    const parsed: Student[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split(delimiter).map(p => p.trim())
      
      // Expected format: studentId, name, email
      // Or: studentId\tname\temail
      if (parts.length >= 3) {
        parsed.push({
          studentId: parts[0],
          name: parts[1],
          email: parts[2]
        })
      }
    }

    return parsed
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseStudentData(text)
      setStudents(parsed)
      setError(null)
    }
    reader.readAsText(file)
  }

  function handlePasteData(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    const parsed = parseStudentData(text)
    setStudents(parsed)
    setError(null)
  }

  async function handleSendTest() {
    if (!testEmail) {
      setError("Please enter a test email address")
      return
    }

    setSendingTest(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/admin/send-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          testEmail,
          subject: subject || undefined
        })
      })

      const data = await res.json()
      
      if (data.success) {
        setResult({ type: 'test', message: data.message })
      } else {
        setError(data.error || 'Failed to send test email')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send test email')
    } finally {
      setSendingTest(false)
    }
  }

  async function handleSendEmails() {
    if (students.length === 0) {
      setError("Please add students first")
      return
    }

    if (!confirm(`Send credential emails to ${students.length} students?`)) {
      return
    }

    setSending(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/admin/send-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          students,
          subject: subject || undefined
        })
      })

      const data = await res.json()
      
      if (data.success) {
        setResult({
          type: 'bulk',
          message: data.message,
          total: data.total,
          successes: data.successes,
          failures: data.failures,
          errors: data.errors
        })
      } else {
        setError(data.error || 'Failed to send emails')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send emails')
    } finally {
      setSending(false)
    }
  }

  function downloadTemplate() {
    const csv = "studentId,name,email\n6788xxxxx,John Doe,john.doe@student.mahidol.ac.th\n6788yyyyy,Jane Smith,jane.smith@student.mahidol.ac.th"
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'credential-email-template.csv'
    a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/20 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white transition-all shadow-sm hover:shadow-lg">
              <Home className="h-5 w-5" />
            </Link>
            <Link href="/admin/dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white transition-all shadow-sm hover:shadow-lg">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 hidden sm:inline">
              Send Credential Emails
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <ModeToggle />
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
            Send Credential Emails
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Send personalized credential emails to students
          </p>
        </div>

        {/* Test Email Section */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <TestTube className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Test Email
          </h2>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="email"
              placeholder="your.email@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSendTest}
              disabled={sendingTest || !testEmail}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
            >
              {sendingTest ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Send Test
            </button>
          </div>
        </div>

        {/* Subject Filter (Optional) */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Optional Settings
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Subject Code (leave empty for universal credentials)
            </label>
            <input
              type="text"
              placeholder="e.g., ITCS223"
              value={subject}
              onChange={(e) => setSubject(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Student List Section */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Student List
            </h2>
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>

          {/* Upload CSV */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Upload CSV/TSV File
            </label>
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Format: studentId, name, email (one student per line)
            </p>
          </div>

          {/* Or Paste Data */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Or Paste Student Data
            </label>
            <textarea
              placeholder="6788xxxxx, John Doe, john.doe@student.mahidol.ac.th&#10;6788yyyyy, Jane Smith, jane.smith@student.mahidol.ac.th"
              onChange={handlePasteData}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            />
          </div>

          {/* Student Count */}
          {students.length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <p className="text-indigo-800 dark:text-indigo-300 font-medium">
                ✓ {students.length} students loaded
              </p>
            </div>
          )}
        </div>

        {/* Send Button */}
        <div className="glass-card p-6 mb-6">
          <button
            onClick={handleSendEmails}
            disabled={sending || students.length === 0}
            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 justify-center shadow-lg shadow-indigo-500/30"
          >
            {sending ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-6 h-6" />
                Send Credential Emails to {students.length} Students
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-6 py-4 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{result.type === 'test' ? 'Test Email Sent!' : 'Emails Sent!'}</p>
              <p className="text-sm mt-1">{result.message}</p>
              {result.type === 'bulk' && (
                <div className="mt-3 text-sm">
                  <p>✓ Successfully sent: {result.successes}</p>
                  {result.failures > 0 && <p>✗ Failed: {result.failures}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
