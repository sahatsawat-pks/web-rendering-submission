"use client"

import { useState, useEffect } from "react"
import { X, MessageSquare, Eye, EyeOff, Save, Trash2, Loader } from "lucide-react"

interface LabFeedback {
  id: string
  labId?: string
  labNumber: string
  subject: string
  studentId: string
  adminComment?: string
  isVisibleToStudent: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string
}

interface FeedbackModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly studentId: string
  readonly studentName: string
  readonly subject: string
  readonly labNumber: string
  readonly labTitle: string
}

export function FeedbackModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  subject,
  labNumber,
  labTitle,
}: FeedbackModalProps) {
  const [feedback, setFeedback] = useState<LabFeedback | null>(null)
  const [comment, setComment] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadFeedback()
    }
  }, [isOpen, studentId, subject, labNumber])

  const loadFeedback = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/feedback?labNumber=${labNumber}&subject=${subject}&studentId=${studentId}`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.feedback) {
          setFeedback(data.feedback)
          setComment(data.feedback.adminComment || "")
          setIsVisible(data.feedback.isVisibleToStudent)
        } else {
          setComment("")
          setIsVisible(false)
          setFeedback(null)
        }
      }
    } catch (err) {
      console.error("Failed to load feedback:", err)
      setError("Failed to load feedback")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labNumber,
          subject,
          studentId,
          adminComment: comment,
          isVisibleToStudent: isVisible,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setFeedback(data.feedback)
      } else {
        setError("Failed to save feedback")
      }
    } catch (err) {
      console.error("Failed to save feedback:", err)
      setError("Failed to save feedback")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!feedback || !confirm("Are you sure you want to delete this feedback?")) return

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/feedback?labNumber=${labNumber}&subject=${subject}&studentId=${studentId}`,
        { method: "DELETE" }
      )

      if (res.ok) {
        setFeedback(null)
        setComment("")
        setIsVisible(false)
      } else {
        setError("Failed to delete feedback")
      }
    } catch (err) {
      console.error("Failed to delete feedback:", err)
      setError("Failed to delete feedback")
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop with fade animation */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal with bounce animation */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-in zoom-in-50 duration-500"
        >
          {/* Header */}
          <div 
            className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between animate-in slide-in-from-top duration-500"
          >
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Feedback for {studentName}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {labTitle} (Lab {labNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div 
          className="px-6 py-6 space-y-6 animate-in fade-in duration-500"
        >
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <>
              {/* Comment Section */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Admin Comment/Feedback
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={saving}
                  placeholder="Add feedback, comments, or suggestions for this student..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
                  rows={5}
                />
              </div>

              {/* Visibility Toggle */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Visibility Settings
                </div>
                <button
                  onClick={() => setIsVisible(!isVisible)}
                  disabled={saving}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 font-medium ${
                    isVisible
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                      : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  } disabled:opacity-50`}
                >
                  {isVisible ? (
                    <>
                      <Eye className="h-4 w-4" />
                      Visible to Student
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Hidden from Student
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isVisible
                    ? "Student can see this feedback on their score page"
                    : "Student cannot see this feedback yet"}
                </p>
              </div>

              {/* Info */}
              {feedback && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-400 text-sm space-y-1">
                  <p className="font-medium">Feedback Info:</p>
                  <p>Created by: {feedback.createdBy || "Unknown"}</p>
                  <p>Last updated: {new Date(feedback.updatedAt).toLocaleString()}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div 
          className="sticky bottom-0 z-10 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 px-6 py-4 flex items-center justify-end gap-3 animate-in slide-in-from-bottom duration-500"
        >
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          {feedback && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 font-medium flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 font-medium flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Feedback
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
