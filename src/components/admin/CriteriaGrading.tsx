"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { getGradientStyleProps, getShadowColorClass } from "@/lib/colors"

interface CriteriaGradingProps {
  subjectCode: string
  subjectTitle: string
  role: 'LA' | 'Lecturer' | 'Main Admin'
  username: string  
  hasQuizManagement?: boolean
  quizSectionEnabled?: boolean
  color?: string
  googleSheetId?: string
}

export default function CriteriaGrading({
  subjectCode,
  subjectTitle,
  role,
  username,
  hasQuizManagement = false,
  quizSectionEnabled = true,
  color = 'from-purple-500 to-pink-500', // Distinct default color
  googleSheetId
}: CriteriaGradingProps) {
  const [labs, setLabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [studentId, setStudentId] = useState("")
  const [selectedLab, setSelectedLab] = useState("")
  
  // Criteria States
  const [ethicsScore, setEthicsScore] = useState("2")       // 0-2
  const [understandingScore, setUnderstandingScore] = useState("2") // 0-2
  const [reflectionScore, setReflectionScore] = useState("2")   // 0-2
  
  const [gradingSuccess, setGradingSuccess] = useState(false)
  const [gradingError, setGradingError] = useState<string | null>(null)
  const [lastSubmittedStudentId, setLastSubmittedStudentId] = useState("")
  
  const [prefixes, setPrefixes] = useState<string[]>([])
  const [selectedPrefix, setSelectedPrefix] = useState("6788")
  const [remainingDigits, setRemainingDigits] = useState("")
  
  const [showNewLabDialog, setShowNewLabDialog] = useState(false)
  const [newLabData, setNewLabData] = useState({
    labNumber: "",
    title: "",
    fileName: "",
    isActive: true,
    deadline: "",
    totalScore: "6" // Default total for 3 criteria x 2 points
  })
  const [creatingLab, setCreatingLab] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchLabs() {
      try {
        const res = await fetch(`/api/labs?subject=${subjectCode}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            const sortedLabs = data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber))
            setLabs(sortedLabs)
            
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

    fetch(`/api/student-prefixes?subject=${subjectCode}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.prefixes) {
          const sorted = data.prefixes.sort();
          setPrefixes(sorted)
          if (sorted.length > 0) {
            setSelectedPrefix(sorted[sorted.length - 1])
          }
        }
      })
      .catch(err => console.error("Failed to fetch prefixes", err))
  }, [subjectCode])

  async function handleGradeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGradingError(null)
    setGradingSuccess(false)
    setIsSubmitting(true)

    try {
        // Calculate total score or submit individual criteria?
        // Sheets usually have 1 column for Lab Score. 
        // If we want criteria, we probably need 3 columns OR aggregate them.
        // For now, let's Aggregate them into 1 score and put breakdown in Feedback?
        // OR better: Update multiple columns if the backend supports it.
        // The backend `updateStudentLabScore` is designed for 1 primary score column.
        // Modification: We will send total score as main score, and JSON detail as feedback/notes.
        // OR we request backend to update 3 separate columns: "Lab X Ethics", "Lab X Understanding", etc.
        // But `updateStudentLabScore` takes minimal args.
        // Let's pack the criteria into the `updates` array for `batch` action, which is flexible!
        // Actually, let's use the standard `update` action but pack details into `feedback` or `comment`.
        // Wait, the user request says: "Each has 2 scores". Total = 6.
        // Let's sum it up for the main "Lab X" column, and maybe append details to a feedback column.
        
        const total = parseInt(ethicsScore) + parseInt(understandingScore) + parseInt(reflectionScore);
        const details = `Ethics: ${ethicsScore}, Understanding: ${understandingScore}, Reflection: ${reflectionScore}`;

        // Create updates for multiple columns if we support dynamic columns in sheets.ts
        // Current sheets.ts targets "Lab X".
        // Let's stick to accumulating to "Lab X" for compatibility, adding details to "Lab X Feedback".
        
        const res = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                username: studentId,
                labNumber: selectedLab,
                score: total,
                feedback: details, // Storing breakdown in feedback
                subject: subjectCode
            })
        });

        if (res.ok) {
             setLastSubmittedStudentId(studentId);
             setGradingSuccess(true);
             setStudentId("");
             setRemainingDigits("");
             // Reset scores to default?
             setEthicsScore("2");
             setUnderstandingScore("2");
             setReflectionScore("2");
        } else {
            const data = await res.json();
            setGradingError(data.error || "Failed to update score");
        }
    } catch (err: any) {
        setGradingError(err.message || "An unexpected error occurred");
    } finally {
        setIsSubmitting(false)
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
          subject: subjectCode,
          totalScore: 6 // Fixed total for this type
        })
      })
      
      if (response.ok) {
        setNewLabData({
          labNumber: "",
          title: "",
          fileName: "",
          isActive: true, // Auto active
          deadline: "",
          totalScore: "6"
        })
        setShowNewLabDialog(false)
        
        // Refresh labs
        const labsRes = await fetch(`/api/labs?subject=${subjectCode}`, { cache: 'no-store' })
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
    <div className="flex-1 space-y-8">
      {/* Welcome Section */}
      <div className="animate-slide-up">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-200">{subjectCode} Dashboard</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">Criteria-Based Grading (Ethics, Understanding, Reflection)</p>
      </div>

      {/* Grading Interface */}
      <div className="glass-card p-8 animate-scale-in hover:shadow-2xl transition-all duration-300 border-white/40">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Criteria Assessment
          </h3>
          {googleSheetId && (
            <a
                href={`https://docs.google.com/spreadsheets/d/${googleSheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 hover:opacity-90 text-white rounded-lg transition-colors text-sm font-semibold shadow-lg ${getShadowColorClass(color)} ${getGradientStyleProps(color).className}`}
                style={getGradientStyleProps(color).style}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Open Lab Sheet</span>
            </a>
           )}
        </div>

        <form onSubmit={handleGradeSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Lab Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Lab Assignment</label>
              <select
                value={selectedLab}
                onChange={(e) => setSelectedLab(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm transition-all"
              >
                <option value="">Select Lab</option>
                {labs.filter(lab => lab.isActive).map((lab) => (
                  <option key={lab.id} value={lab.labNumber}>
                    Lab {lab.labNumber}: {lab.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Student ID */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Student ID</label>
              <div className="flex gap-2">
                <select
                  value={selectedPrefix}
                  onChange={(e) => {
                    setSelectedPrefix(e.target.value)
                    setStudentId(e.target.value + remainingDigits)
                  }}
                  className="w-28 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm font-mono"
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
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm font-mono"
                />
              </div>
            </div>

            {/* Criteria Scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> Ethics
                    </label>
                    <select
                        value={ethicsScore}
                        onChange={(e) => setEthicsScore(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-red-500/50"
                    >
                        <option value="2">2 - Excellent</option>
                        <option value="1">1 - Needs Imp.</option>
                        <option value="0">0 - Poor/Fail</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Understanding
                    </label>
                    <select
                        value={understandingScore}
                        onChange={(e) => setUnderstandingScore(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/50"
                    >
                        <option value="2">2 - Thorough</option>
                        <option value="1">1 - Basic</option>
                        <option value="0">0 - None</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Reflection
                    </label>
                    <select
                        value={reflectionScore}
                        onChange={(e) => setReflectionScore(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-green-500/50"
                    >
                        <option value="2">2 - Insightful</option>
                        <option value="1">1 - Generic</option>
                        <option value="0">0 - Missing</option>
                    </select>
                </div>
            </div>
            
            <div className="text-right text-sm text-slate-500 dark:text-slate-400 font-medium">
                Total Score: <span className="text-slate-900 dark:text-white text-lg font-bold">{parseInt(ethicsScore) + parseInt(understandingScore) + parseInt(reflectionScore)}</span> / 6
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full px-6 py-3 text-sm font-medium text-white hover:opacity-90 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${getGradientStyleProps(color).className} disabled:opacity-70 disabled:cursor-not-allowed`}
            style={getGradientStyleProps(color).style}
          >
            {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : null}
            Submit Criteria Assessment
          </button>

          {gradingSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-6 py-4 rounded-xl shadow-lg animate-scale-in text-center">
                <p className="font-bold">Assessment Saved!</p>
                <p className="text-sm">Student {lastSubmittedStudentId} recorded with scores {ethicsScore}-{understandingScore}-{reflectionScore}</p>
            </div>
          )}

          {gradingError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-xl">
              <p className="font-semibold">Error: {gradingError}</p>
            </div>
          )}
        </form>
      </div>

      {/* Labs Management Section (Simplified) */}
      <div className="glass-card p-8 border-white/40">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">Labs</h3>
              <button 
                onClick={() => setShowNewLabDialog(true)} 
                className={`px-4 py-2 text-white rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-all ${getGradientStyleProps(color).className}`}
                style={getGradientStyleProps(color).style}
              >
                 + New Lab
              </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {labs.map(lab => (
                  <div key={lab.id} className={`p-4 rounded-xl border ${lab.isActive ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60"}`}>
                      <div className="flex justify-between items-start">
                          <div>
                              <h4 className="font-bold text-slate-900 dark:text-slate-200">Lab {lab.labNumber}</h4>
                              <p className="text-xs text-slate-500">{lab.title}</p>
                          </div>
                          {!lab.isActive && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded">Inactive</span>}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* New Lab Dialog */}
      {showNewLabDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200 mb-4">Create Criteria Lab</h3>
            <form onSubmit={handleCreateLab} className="space-y-4">
              {/* ... Same as SimpleScore but tailored ... */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Lab Number</label>
                    <input type="text" value={newLabData.labNumber} onChange={e => setNewLabData({...newLabData, labNumber: e.target.value})} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900" placeholder="e.g. 1" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Total Score</label>
                    <input type="number" value={newLabData.totalScore} disabled className="w-full px-4 py-2 rounded-xl border bg-slate-100 dark:bg-slate-700 text-slate-500" />
                  </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Title</label>
                <input type="text" value={newLabData.title} onChange={e => setNewLabData({...newLabData, title: e.target.value})} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900" placeholder="Lab Title" required />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Filename</label>
                <input type="text" value={newLabData.fileName} onChange={e => setNewLabData({...newLabData, fileName: e.target.value})} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900" placeholder="e.g. index.html" />
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowNewLabDialog(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                <button type="submit" disabled={creatingLab} className={`px-6 py-2 text-white rounded-xl ${getGradientStyleProps(color).className}`} style={getGradientStyleProps(color).style}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
