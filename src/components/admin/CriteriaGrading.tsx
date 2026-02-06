"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { getGradientStyleProps, getShadowColorClass } from "@/lib/colors"
import GradeSubmissionDialog from "./GradeSubmissionDialog"
import SuccessNotification from "./SuccessNotification"

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
  const [studentDetails, setStudentDetails] = useState<any>(null)
  
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
  const [togglingQuiz, setTogglingQuiz] = useState<number | null>(null)
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [submissionLoading, setSubmissionLoading] = useState(false)

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
    
    // Fetch student details before showing confirmation dialog
    try {
      const detailsRes = await fetch(`/api/scores?username=${studentId}&subject=${subjectCode}`)
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json()
        if (detailsData.success && detailsData.scores) {
          setStudentDetails(detailsData.scores)
        }
      }
    } catch (error) {
      console.error("Failed to fetch student details", error)
    }
    
    // Show confirmation dialog
    setShowConfirmDialog(true)
  }
  
  async function confirmAndSubmitGrade() {
    setSubmissionLoading(true)
    setGradingError(null)
    setGradingSuccess(false)

    try {
        // For criteria-based subjects, we need to update specific columns within the selected lab tab
        // Use the lab number directly - the backend will handle tab pattern resolution
        const updates = [
            {
                username: studentId,
                labNumber: selectedLab, // Backend will resolve to correct tab name using tabPattern config
                score: parseInt(ethicsScore),
                subject: subjectCode,
                criteriaType: "Ethics" // Specify which criteria column to update
            },
            {
                username: studentId,
                labNumber: selectedLab, // Backend will resolve to correct tab name using tabPattern config
                score: parseInt(understandingScore),
                subject: subjectCode,
                criteriaType: "Code Understanding" // Specify which criteria column to update
            },
            {
                username: studentId,
                labNumber: selectedLab, // Backend will resolve to correct tab name using tabPattern config
                score: parseInt(reflectionScore),
                subject: subjectCode,
                criteriaType: "Reflection" // Specify which criteria column to update
            }
        ];

        const res = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'batch',
                updates: updates,
                subject: subjectCode
            })
        });

        if (res.ok) {
             setLastSubmittedStudentId(studentId);
             
             try {
                const detailsRes = await fetch(`/api/scores?username=${studentId}&subject=${subjectCode}`)
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
             // Reset scores to default
             setEthicsScore("2");
             setUnderstandingScore("2");
             setReflectionScore("2");
             setShowConfirmDialog(false)
        } else {
            const data = await res.json();
            setGradingError(data.error || "Failed to update scores");
        }
    } catch (err: any) {
        setGradingError(err.message || "An unexpected error occurred");
    } finally {
        setSubmissionLoading(false)
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

  async function toggleQuiz(labId: number, currentStatus: boolean) {
    setTogglingQuiz(labId)
    try {
      const res = await fetch('/api/admin/quiz-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId, quizEnabled: !currentStatus })
      })
      const data = await res.json()
      if (data.success) {
        const labsRes = await fetch(`/api/labs?subject=${subjectCode}`)
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

          {gradingError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-xl">
              <p className="font-semibold">Error: {gradingError}</p>
            </div>
          )}
        </form>
      </div>

      {/* Labs Section */}
      <div className="glass-card p-8 animate-scale-in transition-all duration-300 border-white/40">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Labs
          </h3>
          <div className="flex gap-2">
            {/* Badge */}
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border shadow-md text-white ${getGradientStyleProps(color).className}`}
                  style={getGradientStyleProps(color).style}
            >
              {labs.length} Total
            </span>

            {hasQuizManagement && ['Lecturer', 'Main Admin'].includes(role) && (
              <a href={`/admin/${subjectCode.toLowerCase()}/quiz`} className="px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg text-xs font-medium border border-pink-200 dark:border-pink-800 shadow-sm hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors">
                Manage Quiz
              </a>
            )}
            {(['Lecturer', 'Main Admin'].includes(role) || username === 'kanzaki_aito') && (
              <a href={`/admin/labs?subject=${subjectCode}`} className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium border border-indigo-200 dark:border-indigo-800 shadow-sm hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors">
                Lab Management
              </a>
            )}
            {(['Lecturer', 'Main Admin'].includes(role) || username === 'kanzaki_aito') && (
              <button 
                onClick={() => setShowNewLabDialog(true)} 
                className={`px-3 py-1.5 hover:opacity-90 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1 ${getGradientStyleProps(color).className}`}
                style={getGradientStyleProps(color).style}
              >
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
            <p className="text-base font-medium">No labs found</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Create a new lab to get started</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {labs.map((lab) => (
              <div key={lab.id} className={`flex items-center gap-5 p-5 rounded-2xl border transition-all group ${
                lab.isActive
                  ? "border-slate-100 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-lg"
                  : "border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 opacity-75"
              }`}>
                <div 
                    className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg transition-transform duration-300 ${
                    lab.isActive
                        ? `text-white group-hover:scale-105 ${getGradientStyleProps(color).className}`
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-none"
                    }`}
                    style={lab.isActive ? getGradientStyleProps(color).style : undefined}
                >
                  {lab.labNumber}
                </div>
                <div className="flex-grow">
                  <h4 className={`text-base font-semibold mb-1 ${lab.isActive ? "text-slate-900 dark:text-slate-200" : "text-slate-500 dark:text-slate-500"}`}>
                     {lab.title}
                    {!lab.isActive && <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wide">Inactive</span>}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {lab.deadline ? `Due: ${lab.deadline}` : "No deadline set"}
                  </p>
                  {lab.quizQuestions && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
                              const labsRes = await fetch(`/api/labs?subject=${subjectCode}`, { cache: 'no-store' })
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
                  {hasQuizManagement && ['Lecturer', 'Main Admin'].includes(role) && lab.quizQuestions && (
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

      {/* New Lab Dialog */}
      {showNewLabDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">Create New Lab</h3>
                <button 
                    onClick={() => setShowNewLabDialog(false)}
                    className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <form onSubmit={handleCreateLab} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">Lab Number</label>
                <input
                  type="text"
                  value={newLabData.labNumber}
                  onChange={(e) => setNewLabData({...newLabData, labNumber: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  placeholder="e.g. 01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">Title</label>
                <input
                  type="text"
                  value={newLabData.title}
                  onChange={(e) => setNewLabData({...newLabData, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  placeholder="Lab Title"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">Total Score</label>
                    <input
                      type="number"
                      value={newLabData.totalScore}
                      disabled
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-500 focus:outline-none"
                      placeholder="Default: 6"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">Deadline (Optional)</label>
                    <input
                      type="text"
                      value={newLabData.deadline}
                      onChange={(e) => setNewLabData({...newLabData, deadline: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      placeholder="e.g. 2024-12-31"
                    />
                  </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">File Name (Optional)</label>
                <input
                  type="text"
                  value={newLabData.fileName}
                  onChange={(e) => setNewLabData({...newLabData, fileName: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  placeholder="e.g. index.html"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="labActive"
                  checked={newLabData.isActive}
                  onChange={(e) => setNewLabData({...newLabData, isActive: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="labActive" className="text-sm font-semibold text-slate-900 dark:text-slate-200 cursor-pointer">
                  Active (Visible to students)
                </label>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewLabDialog(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLab}
                  className={`px-6 py-2 text-white rounded-xl shadow-lg font-medium transition-all ${getGradientStyleProps(color).className}`}
                  style={getGradientStyleProps(color).style}
                >
                  {creatingLab ? 'Creating...' : 'Create Lab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <GradeSubmissionDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmAndSubmitGrade}
        studentId={studentId}
        studentName={studentDetails?.name}
        studentSurname={studentDetails?.surname}
        labNumber={selectedLab}
        subjectCode={subjectCode}
        isLoading={submissionLoading}
        gradingType="criteria"
        criteriaScores={{
          ethics: ethicsScore,
          understanding: understandingScore,
          reflection: reflectionScore
        }}
      />
      
      <SuccessNotification
        isVisible={gradingSuccess}
        onHide={() => setGradingSuccess(false)}
        studentId={lastSubmittedStudentId}
        studentName={studentDetails ? `${studentDetails.title || ''} ${studentDetails.name || ''} ${studentDetails.surname || ''}`.trim() : undefined}
        labNumber={selectedLab}
        score={`E:${ethicsScore} U:${understandingScore} R:${reflectionScore}`}
        subjectCode={subjectCode}
      />
    </div>
  )
}
