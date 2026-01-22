"use client"

import type React from "react"

import LogoutButton from "@/components/LogoutButton"
import { useState, useEffect } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Home, Layers, Key } from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()
  const [labs, setLabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'LA' | 'Lecturer' | 'Main Admin'>('LA')
  const [username, setUsername] = useState('')
  const [hasAccess, setHasAccess] = useState(false)

  const [studentId, setStudentId] = useState("")
  const [selectedLab, setSelectedLab] = useState("")
  const [score, setScore] = useState("2")
  const [gradingSuccess, setGradingSuccess] = useState(false)

  const [gradingError, setGradingError] = useState<string | null>(null)
  const [lastSubmittedStudentId, setLastSubmittedStudentId] = useState("")
  const [studentDetails, setStudentDetails] = useState<any>(null)
  const [isFilling, setIsFilling] = useState(false)
  const [prefixes, setPrefixes] = useState<string[]>([])
  const [selectedPrefix, setSelectedPrefix] = useState("6688")
  const [remainingDigits, setRemainingDigits] = useState("")
  const [togglingQuiz, setTogglingQuiz] = useState<number | null>(null)
  const [quizSectionEnabled, setQuizSectionEnabled] = useState(true)
  const [togglingQuizSection, setTogglingQuizSection] = useState(false)

  // New Lab Dialog state
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

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    async function fetchLabs() {
      try {
        const res = await fetch("/api/labs?subject=ITGE162")
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
    fetch('/api/subjects?code=ITGE162')
      .then(res => res.json())
      .then(data => {
        if (data.subjects && data.subjects.length > 0) {
          setQuizSectionEnabled(data.subjects[0].quizSectionEnabled !== false)
        }
      })
      .catch(err => console.error('Failed to fetch subject info:', err))

    // Fetch student ID prefixes
    fetch("/api/student-prefixes?subject=ITGE162")
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
        // Check if user has access to ITGE162 (or is main admin)
        if (data.username === 'kanzaki_aito' || (data.permissions && data.permissions.itge162)) {
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

  useEffect(() => {
    // Combine prefix and remaining digits to form studentId
    setStudentId(selectedPrefix + remainingDigits)
  }, [selectedPrefix, remainingDigits])

  async function toggleQuizSection() {
    setTogglingQuizSection(true)
    try {
      const res = await fetch('/api/subjects/toggle-quiz-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectCode: 'ITGE162', enabled: !quizSectionEnabled })
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

  async function handleGradeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGradingError(null)
    setGradingSuccess(false)

    // Logic: Submit to API
    try {
        const res = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                username: studentId,
                labNumber: selectedLab,
                score: parseInt(score),
                subject: 'ITGE162'
                // Feedback field can be added here if UI supports it
            })
        });

        if (res.ok) {
             setLastSubmittedStudentId(studentId);
             
             // Fetch updated student details to show in success dialog
             try {
                const detailsRes = await fetch(`/api/scores?username=${studentId}&subject=ITGE162`)
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
             // Keep score value for next student
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
                  subject: 'ITGE162'
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
        const labsRes = await fetch("/api/labs?subject=ITGE162")
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
          subject: "ITGE162",
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
        
        const labsRes = await fetch("/api/labs?subject=ITGE162")
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

  // Show loading screen while checking access
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Checking access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
      {/* Animated Background - Further reduced opacity */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"></div>
        <div
          className="absolute bottom-0 -right-4 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      {/* Glass Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/20 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm hover:shadow-lg" title="Back to Main Page">
              <Home className="h-5 w-5" />
            </Link>
            <Link href="/admin/dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-500 hover:text-white transition-all shadow-sm hover:shadow-lg" title="Back to Dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-lg">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 hidden sm:inline">
              ITGE162 Dashboard
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
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">ITGE162 Dashboard</h1>
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
            <p className="text-lg text-slate-600 dark:text-slate-400">Welcome back. Here's what's happening today.</p>
          </div>

            {/* Grading Interface Section */}
          <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-teal-500/5 transition-all duration-300 border-white/40">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-teal-600 dark:text-teal-400"
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
                href="https://docs.google.com/spreadsheets/d/1b3BdHlzBc5jVcaaldRkdUVLAVicTG5hqKDYEModLraA/edit?gid=0#gid=0"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-semibold shadow-lg shadow-teal-500/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Open Lab Sheet</span>
                <span className="sm:hidden">Sheet</span>
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 shadow-sm hover:border-teal-300 dark:hover:border-teal-600 transition-all"
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
                        onChange={(e) => setSelectedPrefix(e.target.value)}
                        required
                        className="w-24 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 shadow-sm hover:border-teal-300 dark:hover:border-teal-600 transition-all font-mono"
                      >
                        {prefixes.map((prefix) => (
                          <option key={prefix} value={prefix}>
                            {prefix}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={remainingDigits}
                        onChange={(e) => {
                          const val = e.target.value
                          if (/^\d{0,3}$/.test(val)) {
                            setRemainingDigits(val)
                          }
                        }}
                        placeholder="001"
                        maxLength={3}
                        required
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 shadow-sm hover:border-teal-300 dark:hover:border-teal-600 transition-all font-mono"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Ref: Column A2:A9999</p>
                  </div>

                  <div className="order-1 md:order-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Score</label>
                    <select
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 shadow-sm hover:border-teal-300 dark:hover:border-teal-600 transition-all"
                    >
                      <option value="0">0 - Incomplete</option>
                      <option value="1">1 - Partial</option>
                      <option value="2">2 - Complete</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 rounded-xl shadow-md shadow-teal-500/30 transition-all btn-hover-lift flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Write to Spreadsheet
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
                             <p className="text-sm">Score updated for Student {lastSubmittedStudentId} in ITGE162 Sheet.</p>
                         )}
                      </div>
                   </div>
                </div>
              )}
            </form>
          </div>

          {/* Timeline / Labs Section */}
          <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-teal-500/5 transition-all duration-300 border-white/40">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-teal-600 dark:text-teal-400"
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
                <span className="px-3 py-1.5 bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 rounded-lg text-xs font-medium border border-teal-200 dark:border-teal-700 shadow-sm">
                  {labs.length} Total
                </span>
                {['Lecturer', 'Main Admin'].includes(role) && (
                  <a href="/admin/itge162/quiz" className="px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg text-xs font-medium border border-pink-200 dark:border-pink-800 shadow-sm hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors">
                    Manage Quiz
                  </a>
                )}
                {(['Lecturer', 'Main Admin'].includes(role) || username === 'kanzaki_aito') && (
                  <a href="/admin/labs?subject=ITGE162" className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium border border-indigo-200 dark:border-indigo-800 shadow-sm hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors">
                    Lab Management
                  </a>
                )}
                {(['Lecturer', 'Main Admin'].includes(role) || username === 'kanzaki_aito') && (
                  <button onClick={() => setShowNewLabDialog(true)} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                     New Lab
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-teal-200 dark:border-teal-800 border-t-teal-600 dark:border-t-teal-400"></div>
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
                    className={`flex items-center gap-5 p-5 rounded-2xl border transition-all smooth-transition group ${
                      lab.isActive
                        ? "border-slate-100 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-lg hover:shadow-teal-500/5"
                        : "border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 opacity-75"
                    }`}
                  >
                    <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg transition-transform duration-300 ${
                       lab.isActive
                        ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-teal-500/20 group-hover:scale-105"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-none"
                    }`}>
                      {lab.labNumber}
                    </div>
                    <div className="flex-grow">
                      <h4 className={`text-base font-semibold mb-1 ${
                        lab.isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-500"
                      }`}>
                        {lab.title}
                        {!lab.isActive && <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wide">Inactive</span>}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
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
                    <div className="flex gap-2">
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
                                  const labsRes = await fetch("/api/labs?subject=ITGE162")
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
                           className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all border ${
                             lab.isActive
                               ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800 hover:bg-teal-100"
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Problem Solving Basics"
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newLabData.isActive}
                  onChange={(e) => setNewLabData({...newLabData, isActive: e.target.checked})}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
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
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
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
