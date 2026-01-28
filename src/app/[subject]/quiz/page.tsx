"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, notFound } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { getSubjectConfig, isValidSubject, SubjectConfig } from "@/lib/subjectConfig"
import { fetchSubjectConfig } from "@/lib/subjectConfigCache"
import { ArrowLeft } from "lucide-react"

interface LabWithQuiz {
  id: string
  labNumber: string
  title: string
  questionCount: number
  hasTimeLimit: boolean
  timeLimit: number
}

export default function SubjectQuizPage() {
  const router = useRouter()
  const params = useParams()
  const subject = typeof params?.subject === 'string' ? params.subject : ""
  
  // Check for static validity first, but we handle 404 in dynamic fetch too
  // if (!isValidSubject(subject)) { ... } 
  
  const [labs, setLabs] = useState<LabWithQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<SubjectConfig | null>(null)
  
  // Fallback static config
  const staticConfig = subject ? getSubjectConfig(subject) : null

  useEffect(() => {
    if (!subject) return;

    // Fetch config
    fetchSubjectConfig(subject)
       .then(adapted => {
            if (adapted) {
                 setConfig(adapted)
                 
                 // Check quiz enabled status
                 if (!adapted.hasQuiz) {
                     router.push(`/${subject}`)
                 }
            } else if (staticConfig) {
                 setConfig(staticConfig)
                 if (!staticConfig.hasQuiz) {
                     router.push(`/${subject}`)
                 }
            } else {
                 notFound()
            }
       })
       .catch(err => {
            console.error(err)
            if (staticConfig) setConfig(staticConfig)
       })
  
    fetchLabsWithQuiz()
  }, [subject, router, staticConfig])

  const fetchLabsWithQuiz = async () => {
    try {
      const res = await fetch(`/api/quiz?action=list_labs&subject=${subject.toUpperCase()}`)
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

  if (!config) return null

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} flex items-center justify-center`}>
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-10 w-10 border-4 ${config.accentColor.replace('text-', 'border-').replace('600', '200')} border-t-current ${config.accentColor}`}></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading quizzes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} animate-fade-in`}>
      {/* Header */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => router.push(`/${subject}`)}
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              title={`Back to ${config.code}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img src="/logo.png" alt="Logo" className={`h-9 w-9 md:h-11 md:w-11 rounded-xl shadow-lg ${config.shadowColor}`} />
            <div>
              <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {config.code} Quiz
              </span>

            </div>
          </div>
          <ModeToggle />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6`}>
          <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">
            Test Your Knowledge
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Select a lab to review key concepts through interactive questions. Your results won't be saved.
          </p>
        </div>

        {labs.length === 0 ? (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="text-slate-400 dark:text-slate-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              No quizzes available yet
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Check back later when your instructor adds quiz questions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {labs.map(lab => (
              <div
                key={lab.id}
                className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-xl ${config.accentColor.replace(/text-/g, 'hover:border-')} transition-all cursor-pointer group`}
                onClick={() => router.push(`/${subject}/quiz/${lab.labNumber}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold text-slate-800 dark:text-white mb-1 group-hover:${config.accentColor} transition-colors`}>
                      Lab {lab.labNumber}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                      {lab.title}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
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
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${config.gradientFrom.replace('/5', '')} ${config.gradientTo.replace('/5', '')} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
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
