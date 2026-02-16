"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { getGradientStyleProps, getShadowColorClass } from "@/lib/colors"
import GradeSubmissionDialog from "./GradeSubmissionDialog"
import SuccessNotification from "./SuccessNotification"

interface PythonGradingProps {
  subjectCode: string
  subjectTitle: string
  role: 'LA' | 'Lecturer' | 'Main Admin'
  username: string
  hasQuizManagement?: boolean
  hasTestCases?: boolean
  quizSectionEnabled?: boolean
  color?: string
  googleSheetId?: string
}

export default function PythonGrading({
  subjectCode,
  subjectTitle,
  role,
  username,
  hasQuizManagement = false,
  hasTestCases = false,
  quizSectionEnabled = true,
  color = 'from-blue-500 to-sky-500',
  googleSheetId
}: PythonGradingProps) {
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
  
  // Grade submission dialog state
  const [showGradeDialog, setShowGradeDialog] = useState(false)
  
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
  const [isSubmitting, setIsSubmitting] = useState(false)

  // CSV Upload states
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [sheetData, setSheetData] = useState<any[]>([])
  const [diffData, setDiffData] = useState<any[]>([])
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvSelectedLab, setCsvSelectedLab] = useState("")
  const [selectedScores, setSelectedScores] = useState<{[key: string]: 'sheet' | 'csv'}>({})
  const [inClass, setInClass] = useState(true)
  
  // Announcement state
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false)
  const [announcementTitle, setAnnouncementTitle] = useState("")
  const [announcementMessage, setAnnouncementMessage] = useState("")
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [publishingAnnouncement, setPublishingAnnouncement] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState<number | null>(null)
  const [deletingAnnouncement, setDeletingAnnouncement] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editMessage, setEditMessage] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  
  // Helper to check if this is ITCS251 or ITCS255
  const isITCS251or255 = subjectCode === 'ITCS251' || subjectCode === 'ITCS255'

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

  // Set default score to max score for ITCS251/255 when lab is selected
  useEffect(() => {
    if (isITCS251or255 && selectedLab && labs.length > 0) {
      const selectedLabData = labs.find(lab => lab.labNumber === selectedLab)
      if (selectedLabData && selectedLabData.totalScore) {
        setScore(selectedLabData.totalScore.toString())
      }
    }
  }, [selectedLab, labs, isITCS251or255])

  // Fetch student details when studentId changes
  useEffect(() => {
    if (studentId && studentId.length >= 7) {
      const fetchStudentDetails = async () => {
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
      }
      fetchStudentDetails()
    } else {
      setStudentDetails(null)
    }
  }, [studentId, subjectCode])

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
    
    // Show grade submission dialog
    setShowGradeDialog(true)
  }

  async function handleConfirmSubmission() {
    setShowGradeDialog(false)
    setIsSubmitting(true)

    try {
        const res = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                username: studentId,
                labNumber: selectedLab,
                score: parseInt(score),
                subject: subjectCode,
                ...(isITCS251or255 && { inClass })
            })
        });

        if (res.ok) {
             setLastSubmittedStudentId(studentId);
             setGradingSuccess(true);
             setStudentId("");
             setRemainingDigits("");
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
      }).filter(row => row.studentId || row.StudentId || row.student_id || row.studentID)

      // Fetch current sheet data
      const res = await fetch(`/api/scores?subject=${subjectCode}&action=list_all`)
      if (!res.ok) throw new Error('Failed to fetch sheet data')
      
      const sheetResponse = await res.json()
      const currentSheetData = sheetResponse.students || []

      // Compare and create diff
      const diffs: any[] = []
      const scores: {[key: string]: 'sheet' | 'csv'} = {}

      parsed.forEach((csvRow: any) => {
        const studentId = csvRow.studentId || csvRow.StudentId || csvRow.student_id || csvRow.studentID
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

  function openCreateAnnouncementDialog() {
    setAnnouncementTitle("")
    setAnnouncementMessage("")
    setShowAnnouncementDialog(true)
  }

  // Toggle announcement visibility
  async function handleToggleVisibility(id: string) {
    try {
      const res = await fetch('/api/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          // Update the announcement in the list
          setAnnouncements(announcements.map(a => 
            a.id === id ? data.announcement : a
          ))
        }
      } else {
        alert('Failed to toggle announcement visibility')
      }
    } catch (err) {
      console.error('Failed to toggle visibility:', err)
      alert('Failed to toggle announcement visibility')
    }
  }

  // Edit announcement handlers
  function handleEditClick(announcement: any) {
    setEditingAnnouncement(announcement)
    setEditTitle(announcement.title)
    setEditMessage(announcement.message)
    setShowEditDialog(true)
  }

  async function handleSaveEdit() {
    if (!editTitle.trim() || !editMessage.trim() || !editingAnnouncement) return

    setSavingEdit(true)
    try {
      const res = await fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAnnouncement.id,
          title: editTitle,
          message: editMessage
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setAnnouncements(announcements.map(a => 
            a.id === editingAnnouncement.id ? data.announcement : a
          ))
          setShowEditDialog(false)
          setEditingAnnouncement(null)
          setEditTitle('')
          setEditMessage('')
        } else {
          alert('Failed to update announcement')
        }
      } else {
        alert('Failed to update announcement')
      }
    } catch (err) {
      console.error('Failed to save edit:', err)
      alert('Failed to update announcement')
    } finally {
      setSavingEdit(false)
    }
  }

  function handleCancelEdit() {
    setShowEditDialog(false)
    setEditingAnnouncement(null)
    setEditTitle('')
    setEditMessage('')
  }

  async function handleCreateAnnouncement() {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      alert("Please provide both title and message")
      return
    }

    setPublishingAnnouncement(true)
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectCode,
          title: announcementTitle,
          message: announcementMessage,
          createdBy: username
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setAnnouncements([data.announcement, ...announcements])
          setAnnouncementTitle("")
          setAnnouncementMessage("")
          setShowAnnouncementDialog(false)
        } else {
          alert(data.error || "Failed to create announcement")
        }
      } else {
        alert("Failed to create announcement")
      }
    } catch (err) {
      console.error("Failed to create announcement:", err)
      alert("Failed to create announcement")
    } finally {
      setPublishingAnnouncement(false)
    }
  }

  function handleDeleteAnnouncement(id: number) {
    setAnnouncementToDelete(id)
    setShowDeleteDialog(true)
  }

  async function confirmDeleteAnnouncement() {
    if (!announcementToDelete) return

    setDeletingAnnouncement(true)
    try {
      const res = await fetch(`/api/announcements?id=${announcementToDelete}`, {
        method: "DELETE"
      })

      if (res.ok) {
        setAnnouncements(announcements.filter(a => a.id !== announcementToDelete))
        setShowDeleteDialog(false)
        setAnnouncementToDelete(null)
      } else {
        alert("Failed to delete announcement")
      }
    } catch (err) {
      console.error("Failed to delete announcement:", err)
      alert("Failed to delete announcement")
    } finally {
      setDeletingAnnouncement(false)
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
        <p className="text-lg text-slate-600 dark:text-slate-400">{subjectTitle} - Grade management and test runner.</p>
      </div>

      {/* Announcements Section */}
      {['Lecturer', 'Main Admin'].includes(role) && (
        <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300 border-white/40">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              Announcements
            </h3>
            <div className="flex gap-2">
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold border shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                {announcements.length} Total
              </span>
              <button 
                onClick={openCreateAnnouncementDialog}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Announcement
              </button>
            </div>
          </div>

          {loadingAnnouncements ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400"></div>
              <p className="text-slate-500 dark:text-slate-400 mt-4">Loading announcements...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <svg className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <p className="text-base font-medium">No announcements yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Create one to notify students</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {announcements.map((announcement) => (
                <div 
                  key={announcement.id}
                  className="flex items-start gap-4 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-200 mb-1">
                      {announcement.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                      {announcement.message}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {announcement.createdBy || 'Admin'}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(announcement.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleVisibility(announcement.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all border ${
                        announcement.isVisible
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                          : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={announcement.isVisible ? 'Hide from students' : 'Show to students'}
                    >
                      {announcement.isVisible ? (
                        <>
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                          Hide
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Show
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleEditClick(announcement)}
                      className="px-3 py-2 text-xs font-semibold rounded-lg transition-all bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      title="Edit announcement"
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="px-3 py-2 text-xs font-semibold rounded-lg transition-all bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grading Interface */}
      <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300 border-white/40">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Student Lab Grader
          </h3>
          <div className="flex gap-2">
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
            <a
                href="https://1drv.ms/f/c/71ba4eac2d3846e2/IgBSqedIAqxwSZUF1fudH6s9AWw7W-ROP7HYHqrMBsXQxkg?e=fqNOeh"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600 text-white rounded-lg transition-colors text-sm font-semibold shadow-lg shadow-sky-500/20 ml-2"
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
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
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
                    className="w-28 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm font-mono"
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
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm font-mono"
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                />
                {isITCS251or255 && (
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      id="inClass"
                      checked={inClass}
                      onChange={(e) => setInClass(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="inClass" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      In-Class
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 px-6 py-3 text-sm font-medium text-white hover:opacity-90 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${getGradientStyleProps(color).className} disabled:opacity-70 disabled:cursor-not-allowed`}
                style={getGradientStyleProps(color).style}
              >
                {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : null}
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
                className="px-6 py-3 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl border border-blue-200 dark:border-blue-800 transition-all flex items-center justify-center gap-2"
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
      <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300 border-white/40">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Labs
          </h3>
          <div className="flex gap-2">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border shadow-md text-white ${getGradientStyleProps(color).className}`}
                  style={getGradientStyleProps(color).style}
            >
              {labs.length} Total
            </span>
            {hasTestCases && (['Lecturer', 'Main Admin'].includes(role) || username === 'kanzaki_aito') && (
              <a href={`/admin/${subjectCode.toLowerCase()}/tests`} className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800 shadow-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
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
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400"></div>
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
                  ? "border-slate-100 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg"
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
                           ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100"
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

      {/* Delete Announcement Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">
                  Delete Announcement
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setAnnouncementToDelete(null)
                }}
                disabled={deletingAnnouncement}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                Are you sure you want to delete this announcement? This action cannot be undone.
              </p>
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-400 font-medium">
                  ⚠️ All students will no longer see this announcement.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setAnnouncementToDelete(null)
                }}
                disabled={deletingAnnouncement}
                className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAnnouncement}
                disabled={deletingAnnouncement}
                className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAnnouncement ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  "Delete Announcement"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Announcement Dialog */}
      {showAnnouncementDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">Create Announcement</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{subjectCode} - Notify students</p>
                </div>
              </div>
              <button
                onClick={() => setShowAnnouncementDialog(false)}
                className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Title</label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Enter announcement title..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Message</label>
                <textarea
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  placeholder="Enter your message to students..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  This announcement will be visible to all students on the {subjectCode} score page.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowAnnouncementDialog(false)}
                disabled={publishingAnnouncement}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAnnouncement}
                disabled={publishingAnnouncement || !announcementTitle.trim() || !announcementMessage.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {publishingAnnouncement ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    <span>Publish Announcement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Announcement Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">Edit Announcement</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{subjectCode}</p>
                </div>
              </div>
              <button
                onClick={handleCancelEdit}
                disabled={savingEdit}
                className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={savingEdit}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all disabled:opacity-50"
                  placeholder="Enter announcement title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Message
                </label>
                <textarea
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  disabled={savingEdit}
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all resize-none disabled:opacity-50"
                  placeholder="Enter announcement message"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleCancelEdit}
                disabled={savingEdit}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || !editTitle.trim() || !editMessage.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingEdit ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
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
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Default: 10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">Deadline (Optional)</label>
                    <input
                      type="text"
                      value={newLabData.deadline}
                      onChange={(e) => setNewLabData({...newLabData, deadline: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="e.g. index.html"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="labActive"
                  checked={newLabData.isActive}
                  onChange={(e) => setNewLabData({...newLabData, isActive: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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

      {/* Grade Submission Dialog */}
      <GradeSubmissionDialog
        isOpen={showGradeDialog}
        onClose={() => setShowGradeDialog(false)}
        onConfirm={handleConfirmSubmission}
        studentId={studentId}
        studentName={studentDetails?.name}
        studentSurname={studentDetails?.surname}
        labNumber={selectedLab}
        subjectCode={subjectCode}
        isLoading={isSubmitting}
        gradingType="python"
        score={score}
        additionalInfo={isITCS251or255 ? `In-Class: ${inClass ? 'Yes' : 'No'}` : undefined}
        existingScore={studentDetails ? (studentDetails[`W ${selectedLab}`] ?? studentDetails[`W ${parseInt(selectedLab)}`]) : undefined}
      />

      <SuccessNotification
        isVisible={gradingSuccess}
        onHide={() => setGradingSuccess(false)}
        studentId={lastSubmittedStudentId}
        studentName={studentDetails ? `${studentDetails.name || ''} ${studentDetails.surname || ''}`.trim() : undefined}
        labNumber={selectedLab}
        score={score}
        subjectCode={subjectCode}
        additionalInfo={isITCS251or255 ? `In-Class: ${inClass ? 'Yes' : 'No'}` : undefined}
      />
    </div>
  )
}
