"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"

interface LabWithQuiz {
  labNumber: string
  title: string
  questionCount: number
  hasTimeLimit: boolean
  timeLimit: number
}

export default function ITCS255QuizPage() {
  const router = useRouter()
  const [labs, setLabs] = useState<LabWithQuiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLabsWithQuiz()
  }, [])

  const fetchLabsWithQuiz = async () => {
    try {
      const res = await fetch('/api/quiz?action=list_labs&subject=ITCS255')
      if (res.ok) {
        const data = await res.json()
        setLabs(data.labs || [])
      }
    } catch (e) {
      // Failed to load labs with quiz
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading quizzes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-purple-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/itcs255')}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
            >
              ← Back to ITCS255
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Check Your Understanding
            </h1>
          </div>
          <ModeToggle />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
            Test Your Knowledge
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Select a lab to review key concepts through interactive questions. Your results won't be saved.
          </p>
        </div>

        {labs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              No quizzes available yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Check back later when your instructor adds quiz questions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {labs.map(lab => (
              <div
                key={lab.labNumber}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/itcs255/quiz/${lab.labNumber}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                      Lab {lab.labNumber}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      {lab.title}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {lab.questionCount} {lab.questionCount === 1 ? 'question' : 'questions'}
                      </span>
                      {lab.hasTimeLimit && (
                        <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {lab.timeLimit} min time limit
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
