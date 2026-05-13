"use client"

import { MessageCircle } from "lucide-react"

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

interface LabFeedbackDisplayProps {
  readonly labNumber: string
  readonly feedback: LabFeedback | null
  readonly loading?: boolean
}

export function LabFeedbackDisplay({ labNumber, feedback, loading }: LabFeedbackDisplayProps) {
  if (!feedback?.isVisibleToStudent) {
    return null
  }

  return (
    <div className="mt-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-2">
      <div className="flex items-start gap-2">
        <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Instructor Feedback</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">Lab {labNumber}</p>
          {loading ? (
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Loading feedback...</p>
          ) : (
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1 whitespace-pre-wrap break-words">
              {feedback.adminComment || "No additional comments"}
            </p>
          )}
          {feedback.updatedAt && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Updated: {new Date(feedback.updatedAt).toLocaleDateString()} at {new Date(feedback.updatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface FeedbackSectionProps {
  readonly title: string
  readonly feedback: LabFeedback | null
  readonly loading?: boolean
  readonly score?: string | number
  readonly maxScore?: number
}

export function FeedbackSection({ title, feedback, loading, score, maxScore }: FeedbackSectionProps) {
  if (!feedback?.isVisibleToStudent) {
    return null
  }

  return (
    <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3 mb-2">
        <div className="p-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100">{title}</h4>
          {score !== undefined && maxScore !== undefined && (
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Score: {score}/{maxScore}</p>
          )}
        </div>
      </div>
      
      <div className="ml-11 space-y-2">
        {loading ? (
          <p className="text-sm text-blue-700 dark:text-blue-300">Loading feedback...</p>
        ) : (
          <>
            <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap break-words">
              {feedback.adminComment || "No additional comments"}
            </p>
            {feedback.updatedAt && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Updated: {new Date(feedback.updatedAt).toLocaleDateString()}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
