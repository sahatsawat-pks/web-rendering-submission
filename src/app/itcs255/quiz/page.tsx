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
    // Check if quiz section is enabled
    fetch('/api/subjects?code=ITCS255')
      .then(res => res.json())
      .then(data => {
        if (data.subjects?.[0]?.quizSectionEnabled === false) {
          router.push('/itcs255')
        }
      })
      .catch(() => {})
    
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading quizzes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => router.push('/itcs255')}
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              title="Back to ITCS255"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <img src="/logo.png" alt="Logo" className="h-9 w-9 md:h-11 md:w-11 rounded-xl shadow-lg shadow-purple-500/20" />
            <div>
              <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                ITCS255 Quiz
              </span>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium hidden sm:block">Check Your Understanding</p>
            </div>
          </div>
          <ModeToggle />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 dark:border-slate-700 p-6 mb-6">
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
