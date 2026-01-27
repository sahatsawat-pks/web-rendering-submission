"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { getGradientStyleProps } from "@/lib/colors"

interface SQLGradingProps {
  subjectCode: string
  subjectTitle: string
  role: 'LA' | 'Lecturer' | 'Main Admin'
  username: string
  hasQuizManagement?: boolean
  hasTestCases?: boolean
  quizSectionEnabled?: boolean
  color?: string
}

export default function SQLGrading({
  subjectCode,
  subjectTitle,
  role,
  username,
  hasQuizManagement = false,
  hasTestCases = false,
  quizSectionEnabled = true,
  color = 'from-purple-500 to-pink-500'
}: SQLGradingProps) {
  const [labs, setLabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
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
  const [togglingQuiz, setTogglingQuiz] = useState<string | null>(null)
  const [localQuizSectionEnabled, setLocalQuizSectionEnabled] = useState(quizSectionEnabled)
  const [togglingQuizSection, setTogglingQuizSection] = useState(false)
  
  // New Lab Dialog state
  const [showNewLabDialog, setShowNewLabDialog] = useState(false)
  const [newLabData, setNewLabData] = useState({
    labNumber: "",
    title: "",
    fileName: "",
    isActive: true,
    deadline: "",
    totalScore: ""
  })
  const [creatingLab, setCreatingLab] = useState(false)

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
        const res = await fetch(`/api/labs?subject=${subjectCode}`)
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

    fetch(`/api/subjects?code=${subjectCode}`)
      .then(res => res.json())
      .then(data => {
        if (data.subjects && data.subjects.length > 0) {
          setLocalQuizSectionEnabled(data.subjects[0].quizSectionEnabled !== false)
        }
      })
      .catch(err => console.error('Failed to fetch subject info:', err))

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

  async function toggleQuizSection() {
    setTogglingQuizSection(true)
    try {
      const res = await fetch('/api/subjects/toggle-quiz-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectCode, enabled: !localQuizSectionEnabled })
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setLocalQuizSectionEnabled(data.quizSectionEnabled)
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

    try {
        const res = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                username: studentId,
                labNumber: selectedLab,
                score: parseInt(score),
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
                  subject: subjectCode
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

  async function toggleQuiz(labId: string, currentStatus: boolean) {
    setTogglingQuiz(labId)
    try {
      const res = await fetch('/api/admin/quiz-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId, enabled: !currentStatus })
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
          totalScore: newLabData.totalScore ? parseInt(newLabData.totalScore) : undefined
        })
      })
      
      if (response.ok) {
        setNewLabData({
          labNumber: "",
          title: "",
          fileName: "",
          isActive: true,
          deadline: "",
          totalScore: ""
        })
        setShowNewLabDialog(false)
        
        const labsRes = await fetch(`/api/labs?subject=${subjectCode}`)
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
      }).filter(row => row.studentId || row.StudentId || row.student_id)

      // Fetch current sheet data
      const res = await fetch(`/api/scores?subject=${subjectCode}&action=list_all`)
      if (!res.ok) throw new Error('Failed to fetch sheet data')
      
      const sheetResponse = await res.json()
      const currentSheetData = sheetResponse.students || []

      // Compare and create diff
      const diffs: any[] = []
      const scores: {[key: string]: 'sheet' | 'csv'} = {}

      parsed.forEach((csvRow: any) => {
        const studentId = csvRow.studentId || csvRow.StudentId || csvRow.student_id
        const csvScore = csvRow.score || csvRow.Score || csvRow.scores || csvRow[csvSelectedLab] || '0'
        
        const sheetStudent = currentSheetData.find((s: any) => 
          (s.id || s.studentId) === studentId
        )
        
        const sheetScore = sheetStudent ? (sheetStudent[`lab${csvSelectedLab}`] || '0') : '0'
        
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
        await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            username: update.username,
            labNumber: csvSelectedLab,
            score: update.score,
            subject: subjectCode,
            isCsv: true
          })
        })
      }

      alert(`Successfully updated ${updates.length} scores`)
      setShowCsvModal(false)
      setCsvFile(null)
      setDiffData([])
      setCsvSelectedLab('')
    } catch (error: any) {
      alert('Error updating scores: ' + error.message)
    } finally {
      setCsvLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-8">
      {/* Welcome Section */}
      <div className="animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-200">{subjectCode} Dashboard</h1>
          {['Lecturer', 'Main Admin'].includes(role) && hasQuizManagement && (
            <button
              onClick={toggleQuizSection}
              disabled={togglingQuizSection}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 ${
                localQuizSectionEnabled
                  ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
              Quiz: {localQuizSectionEnabled ? "ON" : "OFF"}
            </button>
          )}
        </div>
        <p className="text-lg text-slate-600 dark:text-slate-400">{subjectTitle} - Grade management and SQL query runner.</p>
      </div>

      {/* Grading Interface */}
      <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-300 border-white/40">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Student Lab Grader
          </h3>
          <div className="flex gap-2">
            <a
              href="https://docs.google.com/spreadsheets/d/154LairckAZ5jF33dZ4cRAuP54cbv_42Inv-gZTNxSro/edit?ouid=107284221226923478169&usp=sheets_home&ths=true"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-4 py-2 hover:opacity-90 text-white rounded-lg transition-colors text-sm font-semibold shadow-lg ${getGradientStyleProps(color).className}`}
              style={getGradientStyleProps(color).style}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Open Lab Sheet</span>
            </a>
            <a
                href="https://1drv.ms/f/c/71ba4eac2d3846e2/IgBQqu7tJjQ3QL6OyFyNDgv4Aaj5NcbeZ7y1c6GB0tyrXmQ?e=2sAbFY"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 dark:bg-pink-500 dark:hover:bg-pink-600 text-white rounded-lg transition-colors text-sm font-semibold shadow-lg shadow-pink-500/20 ml-2"
              >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                 <span className="hidden sm:inline">Lab Files</span>
              </a>
          </div>
        </div>

        <form onSubmit={handleGradeSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Lab Assignment</label>
              <select
                value={selectedLab}
                onChange={(e) => setSelectedLab(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm"
              >
                <option value="">Select Lab</option>
                {labs.filter(lab => lab.isActive).map((lab) => (
                  <option key={lab.id} value={lab.labNumber}>
                    Lab {lab.labNumber}: {lab.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="order-2 md:order-1">
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
              <button
                type="submit"
                className={`flex-1 px-6 py-3 text-sm font-medium text-white hover:opacity-90 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${getGradientStyleProps(color).className}`}
                style={getGradientStyleProps(color).style}
              >
                Update Score to Spreadsheet
              </button>
              {['Lecturer', 'Main Admin'].includes(role) && (
              <button
                type="button"
                onClick={handleFillMissing}
                disabled={isFilling || !selectedLab}
                className="px-6 py-3 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl border border-amber-200 dark:border-amber-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                className="px-6 py-3 text-sm font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl border border-purple-200 dark:border-purple-800 transition-all flex items-center justify-center gap-2"
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
                         <p className="text-sm">Score updated for Student {lastSubmittedStudentId} in {subjectCode} Sheet.</p>
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

      {/* Labs Section */}
      <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-300 border-white/40">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Labs
          </h3>
          <div className="flex gap-2">
            <span className={`px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg text-xs font-medium border shadow-sm ${getGradientStyleProps(color).className && !getGradientStyleProps(color).style ? 'text-purple-600 border-purple-200' : ''}`}
                  style={{ ...getGradientStyleProps(color).style, opacity: 0.8 }}
            >
              {labs.length} Total
            </span>
            {hasTestCases && (['Lecturer', 'Main Admin'].includes(role) || username === 'kanzaki_aito') && (
              <a href={`/admin/${subjectCode.toLowerCase()}/tests`} className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium border border-purple-200 dark:border-purple-800 shadow-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
                Manage Test Cases
              </a>
            )}
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
            {['Lecturer', 'Main Admin'].includes(role) && (
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
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400"></div>
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
                  ? "border-slate-100 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-lg"
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
                              const labsRes = await fetch(`/api/labs?subject=${subjectCode}`)
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
                           ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-100"
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

      {/* CSV Preview Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">Upload CSV</h3>
              <button onClick={() => setShowCsvModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Select Lab</label>
                  <select
                    value={csvSelectedLab}
                    onChange={(e) => setCsvSelectedLab(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border dark:bg-slate-700"
                  >
                    <option value="">Select Lab...</option>
                    {labs.map(lab => (
                      <option key={lab.id} value={lab.labNumber}>{lab.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 rounded-lg border dark:bg-slate-700"
                  />
                </div>
              </div>

              {diffData.length > 0 ? (
                <div>
                  <h4 className="font-bold mb-3">Differences Found ({diffData.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-700">
                        <tr>
                          <th className="px-4 py-2">Student</th>
                          <th className="px-4 py-2">Current Score</th>
                          <th className="px-4 py-2">CSV Score</th>
                          <th className="px-4 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffData.map((row) => (
                          <tr key={row.studentId} className="border-b dark:border-slate-700">
                            <td className="px-4 py-2 font-mono">
                              {row.studentId}<br/>
                              <span className="text-xs text-slate-500">{row.name}</span>
                            </td>
                            <td className="px-4 py-2">{row.sheetScore}</td>
                            <td className="px-4 py-2">{row.csvScore}</td>
                            <td className="px-4 py-2">
                              <select
                                value={selectedScores[row.studentId]}
                                onChange={(e) => setSelectedScores({...selectedScores, [row.studentId]: e.target.value as any})}
                                className="px-2 py-1 rounded border dark:bg-slate-700"
                              >
                                <option value="csv">Use CSV ({row.csvScore})</option>
                                <option value="sheet">Keep Current ({row.sheetScore})</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setShowCsvModal(false)}
                      className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmCsvUpload}
                      disabled={csvLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                    >
                      {csvLoading ? 'Updating...' : 'Confirm Updates'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    onClick={handleCsvUpload}
                    disabled={csvLoading || !csvFile || !csvSelectedLab}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {csvLoading ? 'Processing...' : 'Compare CSV'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                      onChange={(e) => setNewLabData({...newLabData, totalScore: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      placeholder="Default: 10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">Deadline (Optional)</label>
                    <input
                      type="text"
                      value={newLabData.deadline}
                      onChange={(e) => setNewLabData({...newLabData, deadline: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="e.g. index.html"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="labActive"
                  checked={newLabData.isActive}
                  onChange={(e) => setNewLabData({...newLabData, isActive: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
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
    </div>
  )
}
