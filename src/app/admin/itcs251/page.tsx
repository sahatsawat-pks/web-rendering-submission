"use client"

import type React from "react"
import LogoutButton from "@/components/LogoutButton"
import { useState, useEffect } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Home, Layers, Key } from "lucide-react"

export default function ITCS251AdminDashboard() {
  const router = useRouter()
  const [labs, setLabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'LA' | 'Lecturer' | 'Main Admin'>('LA')
  const [username, setUsername] = useState('')
  const [hasAccess, setHasAccess] = useState(false)

  const [studentId, setStudentId] = useState("")
  const [selectedLab, setSelectedLab] = useState("")
  const [score, setScore] = useState("0")
  const [gradingSuccess, setGradingSuccess] = useState(false)
  const [gradingError, setGradingError] = useState<string | null>(null)
  const [lastSubmittedStudentId, setLastSubmittedStudentId] = useState("")
  const [studentDetails, setStudentDetails] = useState<any>(null)
  const [isFilling, setIsFilling] = useState(false)
  const [prefixes, setPrefixes] = useState<string[]>([])
  const [selectedPrefix, setSelectedPrefix] = useState("6788")
  const [remainingDigits, setRemainingDigits] = useState("")
  const [togglingQuiz, setTogglingQuiz] = useState<number | null>(null)
  const [quizSectionEnabled, setQuizSectionEnabled] = useState(true)
  const [togglingQuizSection, setTogglingQuizSection] = useState(false)

  
  // New Lab Dialog state
  const [showNewLabDialog, setShowNewLabDialog] = useState(false)
  const [newLabData, setNewLabData] = useState({
    labNumber: "",
    title: "",
    fileName: "main.py",
    isActive: true,
    deadline: "",
    totalScore: ""
  })
  const [creatingLab, setCreatingLab] = useState(false)

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // CSV Upload states
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [sheetData, setSheetData] = useState<any[]>([])
  const [diffData, setDiffData] = useState<any[]>([])
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvSelectedLab, setCsvSelectedLab] = useState("")
  const [selectedScores, setSelectedScores] = useState<{[key: string]: 'sheet' | 'csv'}>({})

  useEffect(() => {
    async function fetchLabs() {
      try {
        const res = await fetch("/api/labs?subject=ITCS251")
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            const sortedLabs = data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber))
            setLabs(sortedLabs)
            
            // Set default to latest active lab
            const activeLabs = sortedLabs.filter((lab: any) => lab.isActive)
            if (activeLabs.length > 0) {
              const latestActiveLab = activeLabs[activeLabs.length - 1]
              setSelectedLab(latestActiveLab.labNumber)
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch labs", e)
      } finally {
        setLoading(false)
      }
    }
    fetchLabs()

    // Fetch quiz section status
    fetch('/api/subjects?code=ITCS251')
      .then(res => res.json())
      .then(data => {
        if (data.subjects && data.subjects.length > 0) {
          setQuizSectionEnabled(data.subjects[0].quizSectionEnabled !== false)
        }
      })
      .catch(err => console.error('Failed to fetch subject info:', err))

    // Fetch student ID prefixes
    fetch("/api/student-prefixes?subject=ITCS251")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.prefixes) {
          setPrefixes(data.prefixes)
        }
      })
      .catch(err => console.error("Failed to fetch prefixes", err))

    // Fetch user role and permissions
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.role) {
          setRole(data.role)
        }
        if (data.username) {
          setUsername(data.username)
        }
        // Check if user has access to ITCS251 (or is main admin)
        if (data.username === 'kanzaki_aito' || (data.permissions && data.permissions.itcs251)) {
          setHasAccess(true)
        } else {
          // Redirect to admin dashboard if no access
          router.push('/admin/dashboard')
        }
      })
      .catch(err => {
        console.error("Failed to fetch user role", err)
        router.push('/admin/dashboard')
      })
  }, [])

  async function toggleQuizSection() {
    setTogglingQuizSection(true)
    try {
      const res = await fetch('/api/subjects/toggle-quiz-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectCode: 'ITCS251', enabled: !quizSectionEnabled })
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

  // Show loading while checking permissions
  if (!hasAccess && loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400"></div>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Checking permissions...</p>
        </div>
      </div>
    )
  }

  async function handleGradeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGradingError(null)
    setGradingSuccess(false)

    try {
        const res = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                username: studentId,
                labNumber: selectedLab,
                score: parseInt(score),
                subject: 'ITCS251',

            })
        });

        if (res.ok) {
             setLastSubmittedStudentId(studentId);
             
             // Fetch updated student details to show in success dialog
             try {
                const detailsRes = await fetch(`/api/scores?username=${studentId}&subject=ITCS251`)
                if (detailsRes.ok) {
                    const detailsData = await detailsRes.json()
                    if (detailsData.success && detailsData.scores) {
                        setStudentDetails(detailsData.scores)
                    }
                }
             } catch (error) {
                 console.error("Failed to fetch student details", error)
             }
             
             setGradingSuccess(true);
             setStudentId("");
             setRemainingDigits("");
             setStudentId("");
             setRemainingDigits("");
             // setTimeout(() => setGradingSuccess(false), 5000); // Removed auto-hide
        } else {
            const data = await res.json();
            setGradingError(data.error || "Failed to update score");
        }
    } catch (err: any) {
        setGradingError(err.message || "An unexpected error occurred");
    }
  }



  async function handleFillMissing() {
      if (!selectedLab) {
          alert("Please select a lab first.");
          return;
      }
      if (!confirm(`Are you sure you want to fill ALL missing scores for Lab ${selectedLab} with 0?`)) {
          return;
      }

      setIsFilling(true);
      try {
          const res = await fetch('/api/scores', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  action: 'fill_missing',
                  labNumber: selectedLab,
                  subject: 'ITCS251'
              })
          });

          const data = await res.json();
          if (data.success) {
              alert(data.message);
          } else {
              alert("Error: " + data.message);
          }
      } catch (e) {
          alert("Failed to fill scores.");
      } finally {
          setIsFilling(false);
      }
  }

  // CSV Upload Functions
  async function handleCsvUpload() {
    if (!csvFile || !csvSelectedLab) {
      alert("Please select a lab and upload a CSV file")
      return
    }

    setCsvLoading(true)
    try {
      // Parse CSV
      const text = await csvFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      const parsed = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj: any = {}
        headers.forEach((header, i) => {
          obj[header] = values[i]
        })
        return obj
      }).filter(row => row.studentId || row.StudentId || row.student_id || row.studentID)

      console.log('Parsed CSV rows:', parsed.length)
      console.log('Sample row:', parsed[0])

      // Fetch current sheet data
      const res = await fetch(`/api/scores?subject=ITCS251&action=list_all`)
      if (!res.ok) throw new Error('Failed to fetch sheet data')
      
      const sheetResponse = await res.json()
      const currentSheetData = sheetResponse.students || []

      // Compare and create diff
      const diffs: any[] = []
      const scores: {[key: string]: 'sheet' | 'csv'} = {}

      parsed.forEach((csvRow: any) => {
        const studentId = csvRow.studentId || csvRow.StudentId || csvRow.student_id || csvRow.studentID
        const csvScore = csvRow.score || csvRow.Score || csvRow.scores || csvRow[csvSelectedLab] || '0'

        
        console.log(`Processing: ${studentId}, Score: ${csvScore}`)
        
        const sheetStudent = currentSheetData.find((s: any) => 
          (s.id || s.studentId) === studentId
        )
        
        if (sheetStudent) {
          console.log(`Sheet student data for ${studentId}:`, sheetStudent)
          console.log(`Available fields:`, Object.keys(sheetStudent))
        }
        
        // Try both with and without leading zero (e.g., "Lab 01" or "Lab 1")
        const labNumberWithoutZero = parseInt(csvSelectedLab).toString()
        const exactKey = `Lab ${csvSelectedLab}`
        const normalizedKey = `Lab ${labNumberWithoutZero}`
        
        let sheetScore = '0'
        if (sheetStudent) {
          if (sheetStudent[exactKey] !== undefined) {
            sheetScore = sheetStudent[exactKey] || '0'
          } else if (sheetStudent[normalizedKey] !== undefined) {
            sheetScore = sheetStudent[normalizedKey] || '0'
          }
        }
        console.log(`Sheet score for ${studentId}: ${sheetScore} (tried: ${exactKey}, ${normalizedKey})`)
        
        // Include row if score is different
        if (csvScore !== sheetScore) {
          diffs.push({
            studentId,
            name: sheetStudent?.name || csvRow.name || '',
            sheetScore,
            csvScore,
            isDifferent: csvScore !== sheetScore
          })
          scores[studentId] = 'csv' // Default to CSV value
        }
      })

      console.log('Differences found:', diffs.length)

      setCsvData(parsed)
      setSheetData(currentSheetData)
      setDiffData(diffs)
      setSelectedScores(scores)
      
      if (diffs.length === 0) {
        alert('No differences found between CSV and sheet data')
      }
    } catch (error: any) {
      alert('Error processing CSV: ' + error.message)
    } finally {
      setCsvLoading(false)
    }
  }

  async function handleConfirmCsvUpload() {
    if (diffData.length === 0) return

    setCsvLoading(true)
    try {
      const updates = diffData.map(diff => ({
        username: diff.studentId,
        score: selectedScores[diff.studentId] === 'csv' ? 
          parseInt(diff.csvScore) : parseInt(diff.sheetScore)
      }))

      for (const update of updates) {
        const diff = diffData.find(d => d.studentId === update.username)
        await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            username: update.username,
            labNumber: csvSelectedLab,
            score: update.score,
            subject: 'ITCS251',

          })
        })
      }

      alert(`Successfully updated ${updates.length} scores`)
      setShowCsvModal(false)
      setCsvFile(null)
      setCsvData([])
      setDiffData([])
      setCsvSelectedLab('')
    } catch (error: any) {
      alert('Error updating scores: ' + error.message)
    } finally {
      setCsvLoading(false)
    }
  }



  async function toggleQuiz(labId: number, currentStatus: boolean) {
    setTogglingQuiz(labId)
    try {
      const res = await fetch('/api/admin/quiz-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId, enabled: !currentStatus })
      })
      const data = await res.json()
      if (data.success) {
        // Refresh lab list
        const labsRes = await fetch("/api/labs?subject=ITCS251")
        if (labsRes.ok) {
          const labsData = await labsRes.json()
          if (labsData.success) {
            setLabs(labsData.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber)))
          }
        }
      }
    } catch (e) {
      console.error("Failed to toggle quiz", e)
    } finally {
      setTogglingQuiz(null)
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
          subject: "ITCS251",
          totalScore: newLabData.totalScore ? parseInt(newLabData.totalScore) : undefined
        })
      })
      
      if (response.ok) {
        setNewLabData({
          labNumber: "",
          title: "",
          fileName: "main.py",
          isActive: true,
          deadline: "",
          totalScore: ""
        })
        setShowNewLabDialog(false)
        
        const labsRes = await fetch("/api/labs?subject=ITCS251")
        if (labsRes.ok) {
          const data = await labsRes.json()
          if (data.success) {
            setLabs(data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber)))
          }
        }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"></div>
        <div
          className="absolute bottom-0 -right-4 w-96 h-96 bg-sky-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      {/* Glass Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/20 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-500 hover:text-white transition-all shadow-sm hover:shadow-lg" title="Back to Main Page">
              <Home className="h-5 w-5" />
            </Link>
            <Link href="/admin/dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-500 hover:text-white transition-all shadow-sm hover:shadow-lg" title="Back to Dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-lg">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 hidden sm:inline">
              ITCS251 Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Credential Links */}
            <Link href="/admin/lookup-credential" className="hidden sm:flex h-9 items-center justify-center px-3 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium text-sm hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors" title="Lookup Credentials">
              <Key className="w-4 h-4 mr-2" />
              Lookup
            </Link>

            <ModeToggle />
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-7xl px-4 py-8 flex flex-col lg:flex-row gap-8 relative z-10">
        {/* Main Content Column */}
        <div className="flex-1 space-y-8">
          {/* Welcome Section */}
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">ITCS251 Dashboard</h1>
              {['Lecturer', 'Main Admin'].includes(role) && (
                <button
                  onClick={toggleQuizSection}
                  disabled={togglingQuizSection}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 ${
                    quizSectionEnabled
                      ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Quiz: {quizSectionEnabled ? "ON" : "OFF"}
                </button>
              )}
            </div>
            <p className="text-lg text-slate-600 dark:text-slate-400">Programming in Python - Grade management and test runner.</p>
          </div>

          {/* Grading Interface Section */}
          <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300 border-white/40">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                Student Lab Grader
              </h3>
              <a
                href="https://docs.google.com/spreadsheets/d/1x29jzhrMCzr7MazNWoLZ2XSn77hk33bu5ltuGmLSVtE/edit?ouid=107284221226923478169&usp=sheets_home&ths=true"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-semibold shadow-lg shadow-blue-500/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Open Lab Sheet</span>
                <span className="sm:hidden">Sheet</span>
              </a>
              <a
                href="https://1drv.ms/f/c/71ba4eac2d3846e2/IgBSqedIAqxwSZUF1fudH6s9AWw7W-ROP7HYHqrMBsXQxkg?e=fqNOeh"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600 text-white rounded-lg transition-colors text-sm font-semibold shadow-lg shadow-sky-500/20 ml-2"
              >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                 <span className="hidden sm:inline">Lab Files</span>
                 <span className="sm:hidden">Files</span>
              </a>
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-4">
              <div className="space-y-4">
                {/* Row 1: Lab Assignment (full width) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Lab Assignment
                  </label>
                  <select
                    value={selectedLab}
                    onChange={(e) => setSelectedLab(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                  >
                    <option value="">Select Lab</option>
                    {labs.filter(lab => lab.isActive).map((lab) => (
                      <option key={lab.id} value={lab.labNumber}>
                        Lab {lab.labNumber}: {lab.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row 2: Student ID + Score (responsive grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="order-2 md:order-1">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Student ID
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedPrefix}
                        onChange={(e) => {
                          setSelectedPrefix(e.target.value)
                          setStudentId(e.target.value + remainingDigits)
                        }}
                        className="w-28 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all font-mono"
                      >
                        {prefixes.map(prefix => (
                          <option key={prefix} value={prefix}>{prefix}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={remainingDigits}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '')
                          setRemainingDigits(val)
                          setStudentId(selectedPrefix + val)
                        }}
                        placeholder="xxxxx"
                        maxLength={5}
                        required
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all font-mono"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Select prefix, then enter remaining digits</p>
                  </div>

                  <div className="order-1 md:order-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Score</label>
                   <input
                      type="number"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder="e.g., 10"
                      required
                      min="0"
                      step="0.5"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Feedback (optional, full width) */}


              <div className="flex flex-col md:flex-row gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 rounded-xl shadow-md shadow-blue-500/30 transition-all btn-hover-lift flex items-center justify-center gap-2"
                  >
                    Update Score to Spreadsheet
                  </button>

                  {['Lecturer', 'Main Admin'].includes(role) && (
                  <button
                    type="button"
                    onClick={handleFillMissing}
                    disabled={isFilling || !selectedLab}
                    className="px-6 py-3 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl border border-amber-200 dark:border-amber-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    title="Fill all empty cells in this lab column with 0"
                  >
                     {isFilling ? (
                         <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                     ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                     )}
                     Fill Missing (0)
                  </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCsvModal(true)}
                    className="px-6 py-3 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl border border-blue-200 dark:border-blue-800 transition-all flex items-center justify-center gap-2"
                    title="Upload CSV to bulk update scores"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    Upload CSV
                  </button>
              </div>

              {gradingSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-6 py-4 rounded-xl shadow-lg animate-scale-in relative">
                   <button 
                      onClick={() => setGradingSuccess(false)}
                      className="absolute top-2 right-2 p-1 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full transition-colors"
                   >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                   
                   <div className="flex items-start gap-4">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-full">
                        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div>
                         <h4 className="font-bold text-lg mb-1">Score Updated Successfully!</h4>
                         {studentDetails ? (
                             <div className="space-y-1 text-sm mt-2">
                                <p><span className="font-semibold opacity-70">Student ID:</span> {studentDetails.username || lastSubmittedStudentId}</p>
                                <p><span className="font-semibold opacity-70">Name:</span> {studentDetails.title} {studentDetails.name} {studentDetails.surname}</p>
                                <p><span className="font-semibold opacity-70">Lab {selectedLab}:</span> <span className="font-bold text-emerald-600 dark:text-emerald-400">{score} points</span></p>
                             </div>
                         ) : (
                             <p className="text-sm">Score updated for Student {lastSubmittedStudentId} in ITCS251 Sheet.</p>
                         )}
                      </div>
                   </div>
                </div>
              )}

              {gradingError && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <span className="font-semibold">Error!</span>
                    <p className="text-xs opacity-90 mt-0.5">{gradingError}</p>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Active Labs Section */}
          <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300 border-white/40">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Labs
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1.5 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-700 shadow-sm">
                  {labs.length} Total
                </span>
                {['Lecturer', 'Main Admin'].includes(role) && (
                  <a href="/admin/itcs251/tests" className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800 shadow-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                    Manage Test Cases
                  </a>
                )}
                {['Lecturer', 'Main Admin'].includes(role) && (
                  <a href="/admin/itcs251/quiz" className="px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg text-xs font-medium border border-pink-200 dark:border-pink-800 shadow-sm hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors">
                    Manage Quiz
                  </a>
                )}
                {(['Lecturer', 'Main Admin'].includes(role) || username === 'kanzaki_aito') && (
                  <a href="/admin/labs?subject=ITCS251" className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium border border-indigo-200 dark:border-indigo-800 shadow-sm hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors">
                    Lab Management
                  </a>
                )}
                {['Lecturer', 'Main Admin'].includes(role) && (
                  <button onClick={() => setShowNewLabDialog(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                     New Lab
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400"></div>
                <p className="text-slate-500 dark:text-slate-400 mt-4">Loading labs...</p>
              </div>
            ) : labs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-base font-medium">No labs found</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Create a new lab to get started</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {labs.map((lab) => (
                  <div
                    key={lab.id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl border transition-all smooth-transition group ${
                      lab.isActive
                        ? "border-slate-100 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/5"
                        : "border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 opacity-75"
                    }`}
                  >
                    <div className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold shadow-lg transition-transform duration-300 ${
                       lab.isActive
                        ? "bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-blue-500/20 group-hover:scale-105"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-none"
                    }`}>
                      {lab.labNumber}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className={`text-sm sm:text-base font-semibold truncate ${
                        lab.isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-500"
                      }`}>
                        {lab.title}
                        {!lab.isActive && <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wide">Inactive</span>}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {lab.deadline ? `Due: ${lab.deadline}` : "No deadline set"}
                      </p>
                      {lab.quizQuestions && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {JSON.parse(lab.quizQuestions).length} quiz questions
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                       {['Lecturer', 'Main Admin'].includes(role) && (
                         <button
                           onClick={async () => {
                             try {
                               const response = await fetch("/api/labs", {
                                 method: "PUT",
                                 headers: { "Content-Type": "application/json" },
                                 body: JSON.stringify({ id: lab.id, isActive: !lab.isActive }),
                               })
                               if (response.ok) {
                                  // Refresh labs
                                  const labsRes = await fetch("/api/labs?subject=ITCS251")
                                  if (labsRes.ok) {
                                    const data = await labsRes.json()
                                    if (data.success) {
                                      setLabs(data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber)))
                                    }
                                  }
                               } else {
                                 alert("Failed to toggle status")
                               }
                             } catch (err) {
                               console.error(err)
                               alert("Failed to toggle status")
                             }
                           }}
                           className={`flex-1 sm:flex-none justify-center px-3 py-2 text-xs font-semibold rounded-lg transition-all border ${
                             lab.isActive
                               ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                               : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                           }`}
                         >
                           {lab.isActive ? "Active" : "Inactive"}
                         </button>
                      )}
                      {['Lecturer', 'Main Admin'].includes(role) && lab.quizQuestions && (
                        <button
                          onClick={() => toggleQuiz(lab.id, lab.quizEnabled)}
                          disabled={togglingQuiz === lab.id}
                          className={`px-3 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50 ${
                            lab.quizEnabled
                              ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          }`}
                        >
                          {lab.quizEnabled ? "Quiz: ON" : "Quiz: OFF"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Upload CSV Scores</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Upload a CSV file to bulk update scores for a specific lab</p>
            </div>

            <div className="p-6 space-y-6">
              {diffData.length === 0 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Lab</label>
                    <select
                      value={csvSelectedLab}
                      onChange={(e) => setCsvSelectedLab(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Choose a lab...</option>
                      {labs.map(lab => (
                        <option key={lab.id} value={lab.labNumber}>{lab.title} (Lab {lab.labNumber})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upload CSV File</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      CSV should have columns: studentId (or StudentId), score (or Score or lab number)
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCsvUpload}
                      disabled={!csvFile || !csvSelectedLab || csvLoading}
                      className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {csvLoading ? 'Processing...' : 'Compare with Sheet'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCsvModal(false)
                        setCsvFile(null)
                        setCsvSelectedLab('')
                      }}
                      className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Found {diffData.length} differences</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400">Review the changes below and select which scores to keep</p>
                  </div>

                  <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Student ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Name</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Sheet Score</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">CSV Score</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Use</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {diffData.map((diff) => (
                          <tr key={diff.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{diff.studentId}</td>
                            <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{diff.name}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setSelectedScores({...selectedScores, [diff.studentId]: 'sheet'})}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                  selectedScores[diff.studentId] === 'sheet'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-2 border-green-500'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {diff.sheetScore}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setSelectedScores({...selectedScores, [diff.studentId]: 'csv'})}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                  selectedScores[diff.studentId] === 'csv'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-500'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {diff.csvScore}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                                selectedScores[diff.studentId] === 'csv'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              }`}>
                                {selectedScores[diff.studentId] === 'csv' ? 'CSV' : 'Sheet'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleConfirmCsvUpload}
                      disabled={csvLoading}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {csvLoading ? 'Updating...' : 'Confirm & Update Scores'}
                    </button>
                    <button
                      onClick={() => {
                        setDiffData([])
                        setCsvData([])
                        setSelectedScores({})
                      }}
                      className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        setShowCsvModal(false)
                        setCsvFile(null)
                        setCsvData([])
                        setDiffData([])
                        setCsvSelectedLab('')
                        setSelectedScores({})
                      }}
                      className="px-6 py-3 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Lab Dialog */}
      {showNewLabDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create New Lab</h3>
              <button
                onClick={() => setShowNewLabDialog(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Python Basics"
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="main.py"
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newLabData.isActive}
                  onChange={(e) => setNewLabData({...newLabData, isActive: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
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
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
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
