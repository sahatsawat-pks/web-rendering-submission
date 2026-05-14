import { useState } from "react"

interface QuickFeedbackSectionProps {
  subjectCode: string
  labs: any[]
  role: string
}

export default function QuickFeedbackSection({ subjectCode, labs, role }: QuickFeedbackSectionProps) {
  const [feedbackStudentId, setFeedbackStudentId] = useState('')
  const [feedbackLabNumber, setFeedbackLabNumber] = useState('')
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedbackMessage(null)
    setFeedbackError(null)

    if (!feedbackStudentId.trim() || !feedbackLabNumber.trim()) {
      setFeedbackError('Student ID and Lab are required')
      return
    }

    setFeedbackLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labNumber: feedbackLabNumber.trim(),
          subject: subjectCode,
          studentId: feedbackStudentId.trim(),
          adminComment: feedbackComment,
          isVisibleToStudent: feedbackVisible,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setFeedbackError(data.error || 'Failed to save feedback')
        return
      }

      setFeedbackMessage('Feedback saved successfully')
      setFeedbackComment('')
      setFeedbackStudentId('')
      setFeedbackLabNumber('')
    } catch (err) {
      console.error('Failed to save feedback:', err)
      setFeedbackError('Failed to save feedback')
    } finally {
      setFeedbackLoading(false)
    }
  }

  return (
    <div className="glass-card p-8 animate-scale-in transition-all duration-300 border-white/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200">Quick Feedback</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
            {role}
          </span>
        </div>
      </div>

      <form onSubmit={handleFeedbackSubmit} className="space-y-4 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/50 p-5 rounded-xl border border-slate-200/70 dark:border-slate-700/50">
        {/* Student ID & Lab - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="feedback-student-id" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Student ID</label>
            <input
              id="feedback-student-id"
              type="text"
              value={feedbackStudentId}
              onChange={(e) => setFeedbackStudentId(e.target.value)}
              placeholder="e.g. 6788001"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label htmlFor="feedback-lab-number" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Lab</label>
            <select
              id="feedback-lab-number"
              value={feedbackLabNumber}
              onChange={(e) => setFeedbackLabNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
              required
            >
              <option value="">Select Lab</option>
              {labs.filter((lab: any) => lab.isActive).map((lab: any) => (
                <option key={lab.id} value={lab.labNumber}>
                  Lab {lab.labNumber} - {lab.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comment - Full Width */}
        <div>
          <label htmlFor="feedback-comment" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Comment / Feedback</label>
          <textarea
            id="feedback-comment"
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            rows={4}
            placeholder="Add comment or feedback for this student..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Visibility & Submit - Bottom */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={feedbackVisible}
              onChange={(e) => setFeedbackVisible(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
            />
            <span>Visible to student</span>
          </label>

          <button
            type="submit"
            disabled={feedbackLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold disabled:opacity-60 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {feedbackLoading ? 'Saving...' : 'Save Feedback'}
          </button>
        </div>

        {/* Messages */}
        {feedbackError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 text-sm">
            {feedbackError}
          </div>
        )}
        {feedbackMessage && (
          <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-200 text-sm">
            ✓ {feedbackMessage}
          </div>
        )}
      </form>
    </div>
  )
}
