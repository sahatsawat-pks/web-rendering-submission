"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, notFound } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { QuizNavigation } from "@/components/QuizNavigation"
import RichTextDisplay from "@/components/RichTextDisplay"
import { getSubjectConfig, isValidSubject, SubjectConfig } from "@/lib/subjectConfig"
import { fetchSubjectConfig } from "@/lib/subjectConfigCache"

interface QuizQuestion {
  id: string
  question: string
  type: 'multiple-choice' | 'short-answer'
  options?: string[]
  correctAnswer: string
  category: string
  explanation?: string
}

interface QuizCategory {
  id: string
  name: string
  questionIds?: string[]
}

export default function QuizTakingPage() {
  const router = useRouter()
  const params = useParams()
  const subject = typeof params?.subject === 'string' ? params.subject.toUpperCase() : 'ITCS223'
  const labNumber = typeof params?.labNumber === 'string' ? params.labNumber : ''

  // if (!isValidSubject(subject)) { ... } // Dynamic check handles this
  
  const [dbConfig, setDbConfig] = useState<SubjectConfig | null>(null)
  
  // Use DB config if available, otherwise static
  const staticConfig = subject ? getSubjectConfig(subject) : null
  const config = dbConfig || staticConfig

  // Extract color name from gradient (e.g., "from-cyan-500" -> "cyan")
  const colorName = config ? config.gradientFrom.replace('from-', '').split('-')[0] : 'blue'

  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [categories, setCategories] = useState<QuizCategory[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<{ [key: string]: string }>({})
  const [timeLimit, setTimeLimit] = useState(0)
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [labTitle, setLabTitle] = useState("")
  const [isVerified, setIsVerified] = useState(false)
  const [studentId, setStudentId] = useState("")
  const [credential, setCredential] = useState("")

  // Check verification status on mount
  useEffect(() => {
    // Check sessionStorage first (for current session)
    let verified = sessionStorage.getItem('quiz_verified') === 'true'
    let storedStudentId = sessionStorage.getItem('quiz_student_id') || ''
    let storedCredential = sessionStorage.getItem('quiz_credential') || ''
    let storedLab = sessionStorage.getItem('quiz_lab') || ''

    // If not in sessionStorage, check localStorage (for persistent login)
    if (!verified || storedLab !== labNumber) {
      const persistentAuth = localStorage.getItem(`quiz_auth_${labNumber}`)
      if (persistentAuth) {
        try {
          const authData = JSON.parse(persistentAuth)
          storedStudentId = authData.studentId || ''
          storedCredential = authData.credential || ''
          storedLab = authData.labNumber || ''
          
          // Restore session
          if (storedLab === labNumber && storedStudentId && storedCredential) {
            verified = true
            sessionStorage.setItem('quiz_verified', 'true')
            sessionStorage.setItem('quiz_student_id', storedStudentId)
            sessionStorage.setItem('quiz_credential', storedCredential)
            sessionStorage.setItem('quiz_lab', labNumber)
          }
        } catch (e) {
          // Invalid saved data
        }
      }
    }

    if (verified && storedLab === labNumber) {
      setIsVerified(true)
      setStudentId(storedStudentId)
      setCredential(storedCredential)
      
      // Load saved answers from DATABASE via API
      // Check localStorage first for backward compatibility (migration)
      const localStorageAnswers = localStorage.getItem(`quiz_answers_${labNumber}_${storedStudentId}`)
      if (localStorageAnswers) {
        try {
          // console.log('[Quiz] Migrating answers from localStorage to database...')
          const parsedAnswers = JSON.parse(localStorageAnswers)
          setAnswers(parsedAnswers)
          
          // Auto-migrate to database
          fetch('/api/quiz/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: storedStudentId,
              subject: subject,
              labNumber,
              answers: parsedAnswers
            })
          }).then(() => {
            // console.log('[Quiz] Migration complete, clearing localStorage')
            localStorage.removeItem(`quiz_answers_${labNumber}_${storedStudentId}`)
          })
        } catch (e) {
          console.error('[Quiz] Failed to migrate from localStorage:', e)
        }
      } else {
        // Load from database
        // console.log('[Quiz] Loading answers from database...')
        fetch(`/api/quiz/progress?studentId=${storedStudentId}&subject=${subject}&labNumber=${labNumber}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.answers) {
              // console.log(`[Quiz] Loaded ${Object.keys(data.answers).length} saved answers from database`)
              setAnswers(data.answers)
            }
          })
          .catch(e => console.error('[Quiz] Failed to load progress:', e))
      }

      // LOAD DYNAMIC CONFIG
      if (subject) {
          fetchSubjectConfig(subject)
           .then(adapted => {
              if (adapted) {
                   setDbConfig(adapted)
              } else if (!staticConfig) {
                   // Only 404 if no static config either
                   notFound()
              }
           })
           .catch(err => {
              console.error(err)
              if (!staticConfig) notFound()
           })
      }

    } else {
      // Redirect to verification page
      router.push(`/${subject.toLowerCase()}/quiz/${labNumber}/verify`)
    }
  }, [labNumber, router, subject, staticConfig])

  useEffect(() => {
    if (isVerified) {
      loadQuizData()
    }
  }, [labNumber, isVerified, subject])

  // Auto-save answers to DATABASE when they change
  useEffect(() => {
    if (isVerified && studentId && Object.keys(answers).length > 0) {
      // console.log(`[Quiz] Auto-saving ${Object.keys(answers).length} answers to database...`)
      
      fetch('/api/quiz/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          subject: subject,
          labNumber,
          answers
        })
      }).catch(e => console.error('[Quiz] Failed to save progress:', e))
    }
  }, [answers, isVerified, studentId, labNumber, subject])

  useEffect(() => {
    if (timeLimitEnabled && timeRemaining > 0 && !showReview && !showResults) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            // Auto-submit when time runs out
            setShowReview(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeLimitEnabled, timeRemaining, showReview, showResults])

  const loadQuizData = async () => {
    try {
      const res = await fetch(`/api/quiz?labNumber=${labNumber}&subject=${subject}`)
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions || [])
        setCategories(data.categories || [])
        setLabTitle(data.labTitle || "")
        setTimeLimitEnabled(data.quizTimeLimitEnabled || false)
        const limit = data.quizTimeLimit || 0
        setTimeLimit(limit)
        setTimeRemaining(limit * 60) // Convert to seconds
      }
    } catch (e) {
      // Failed to load quiz
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (answer: string) => {
    const questionId = questions[currentQuestionIndex].id
    setAnswers({ ...answers, [questionId]: answer })
  }

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  const goToReview = () => {
    setShowReview(true)
  }

  const handleLogout = () => {
    // Clear both sessionStorage and localStorage to fully logout
    sessionStorage.removeItem('quiz_verified')
    sessionStorage.removeItem('quiz_student_id')
    sessionStorage.removeItem('quiz_credential')
    sessionStorage.removeItem('quiz_lab')
    
    // Remove persistent login
    localStorage.removeItem(`quiz_auth_${labNumber}`)
    
    // Redirect to verify page
    router.push(`/${subject.toLowerCase()}/quiz/${labNumber}/verify`)
  }

  const submitQuiz = async () => {
    const score = calculateScore()
    
    // Save score to database
    if (isVerified && studentId) {
      try {
        await fetch('/api/quiz/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            subject: subject,
            labNumber,
            score: score.percentage,
            totalQuestions: score.total,
            correctAnswers: score.correct,
            answers,
            submittedAt: new Date().toISOString()
          })
        })
        
        // Clear saved answers from DATABASE after submission
        fetch(`/api/quiz/progress?studentId=${studentId}&subject=${subject}&labNumber=${labNumber}`, {
          method: 'DELETE'
        }).catch(e => console.error('[Quiz] Failed to delete progress:', e))
        
        // Also clear localStorage (for backward compatibility)
        localStorage.removeItem(`quiz_answers_${labNumber}_${studentId}`)
        
        // Keep auth data but clear current session
        sessionStorage.removeItem('quiz_verified')
        sessionStorage.removeItem('quiz_student_id')
        sessionStorage.removeItem('quiz_credential')
        sessionStorage.removeItem('quiz_lab')
      } catch (e) {
        console.error('Failed to save score:', e)
      }
    }
    
    setShowResults(true)
    setShowReview(false)
  }

  const calculateScore = () => {
    let correct = 0
    questions.forEach(q => {
      const userAnswer = answers[q.id]?.trim().toLowerCase()
      const correctAnswer = q.correctAnswer.trim().toLowerCase()
      if (userAnswer === correctAnswer) {
        correct++
      }
    })
    return {
      correct,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const answeredQuestions = new Set(
    questions
      .map((_, idx) => idx)
      .filter(idx => answers[questions[idx]?.id])
  )

  if (loading) {
    const bg = config ? `bg-gradient-to-br ${config.bgGradient}` : 'bg-slate-50 dark:bg-slate-900'
    const accent = config ? config.accentColor : 'text-teal-600'
    // Extract color name safely
    const baseColor = config?.gradientFrom?.replace('from-', '')?.split('-')[0] || 'teal'

    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center animate-fade-in`}>
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-10 w-10 border-4 ${accent.replace('text-', 'border-').replace('600', '200')} border-t-${baseColor}-600`}></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (!config) return notFound()

  if (questions.length === 0) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} flex items-center justify-center animate-fade-in`}>
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">No questions available for this lab</p>
          <button
            onClick={() => router.push(`/${subject.toLowerCase()}/quiz`)}
            className={`mt-4 px-4 py-2 bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo} text-white rounded-lg hover:shadow-lg transition-all`}
          >
            Back to Quiz List
          </button>
        </div>
      </div>
    )
  }

  // Results View
  if (showResults) {
    const score = calculateScore()
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden animate-fade-in">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-3/4 left-1/3 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Glass Navigation Bar */}
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border-b border-slate-200/50 dark:border-slate-700/50 animate-slide-up">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-600 bg-clip-text text-transparent">
                Quiz Results
              </h1>
            </div>
            <ModeToggle />
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          {/* Score Card */}
          <div className="glass-card p-10 mb-8 text-center animate-bounce-in shadow-2xl border-2 border-cyan-200/50 dark:border-cyan-800/50">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-500 shadow-2xl shadow-cyan-500/40 mb-6">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-5xl font-bold mb-3 bg-gradient-to-r from-cyan-600 to-cyan-600 bg-clip-text text-transparent">
              {score.percentage}%
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 font-medium mb-6">
              {score.correct} out of {score.total} correct
            </p>
            <div className="mt-6 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-6 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-cyan-500 to-cyan-500 h-6 rounded-full transition-all duration-1000 animate-glow shadow-lg shadow-cyan-500/50 flex items-center justify-end pr-3"
                style={{ width: `${score.percentage}%` }}
              >
                {score.percentage > 10 && (
                  <span className="text-white text-xs font-bold">{score.percentage}%</span>
                )}
              </div>
            </div>
          </div>

          {/* Questions Review */}
          <div className="space-y-4">
            {questions.map((question, idx) => {
              const userAnswer = answers[question.id]?.trim() || ""
              const isCorrect = userAnswer.toLowerCase() === question.correctAnswer.trim().toLowerCase()
              
              return (
                <div
                  key={question.id}
                  className={`glass-card p-6 border-l-4 transition-all hover:shadow-2xl transform hover:-translate-y-1 animate-slide-up ${
                    isCorrect
                      ? 'border-cyan-500 bg-gradient-to-r from-cyan-50/50 to-cyan-50/50 dark:from-cyan-900/10 dark:to-cyan-900/10'
                      : 'border-red-500 bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-900/10 dark:to-orange-900/10'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border-2 shadow-lg ${
                        isCorrect
                          ? 'bg-gradient-to-br from-cyan-500 to-cyan-500 text-white border-cyan-400 shadow-cyan-500/30'
                          : 'bg-gradient-to-br from-red-500 to-orange-500 text-white border-red-400 shadow-red-500/30'
                      }`}>
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <RichTextDisplay content={question.question} className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100" />
                      
                      {question.type === 'multiple-choice' && question.options && (
                        <div className="space-y-2 mb-4">
                          {question.options.map((opt, i) => {
                            const isThisCorrect = opt === question.correctAnswer
                            const isUserChoice = opt === userAnswer
                            
                            return (
                              <div
                                key={i}
                                className={`p-4 rounded-xl border-2 transition-all shadow-sm ${
                                  isThisCorrect
                                    ? 'bg-gradient-to-r from-cyan-50 to-cyan-50 dark:from-cyan-900/30 dark:to-cyan-900/30 border-cyan-500 shadow-cyan-500/20'
                                    : isUserChoice
                                    ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-red-500 shadow-red-500/20'
                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold flex-shrink-0 ${
                                    isThisCorrect
                                      ? 'bg-cyan-500 text-white'
                                      : isUserChoice
                                      ? 'bg-red-500 text-white'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {String.fromCharCode(65 + i)}
                                  </span>
                                  <span className={`flex-1 font-medium ${
                                    isThisCorrect
                                      ? 'text-cyan-800 dark:text-cyan-200'
                                      : isUserChoice
                                      ? 'text-red-800 dark:text-red-200'
                                      : 'text-slate-700 dark:text-slate-300'
                                  }`}>
                                    {opt}
                                  </span>
                                  {isThisCorrect && (
                                    <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  {isUserChoice && !isThisCorrect && (
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      {question.type === 'short-answer' && (
                        <div className="space-y-3 mb-4">
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Your Answer
                            </span>
                            <p className="text-sm text-slate-800 dark:text-slate-200 mt-2 font-medium">{userAnswer || '(No answer)'}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-cyan-50 dark:from-cyan-900/30 dark:to-cyan-900/30 border-2 border-cyan-500 shadow-sm shadow-cyan-500/20">
                            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Correct Answer</span>
                            <p className="text-sm text-cyan-800 dark:text-cyan-200 mt-2 font-medium">{question.correctAnswer}</p>
                          </div>
                        </div>
                      )}
                      
                      {question.explanation && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Explanation
                          </span>
                          <RichTextDisplay content={question.explanation} className="mt-2 text-blue-800 dark:text-blue-200" />
                        </div>
                      )}
                      
                      <div className="mt-4">
                        {isCorrect ? (
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/30">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Correct
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/30">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Incorrect
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 flex gap-4 animate-slide-up sticky bottom-4">
            <button
              onClick={() => router.push(`/${subject.toLowerCase()}/quiz`)}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-all hover:shadow-xl border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 transform hover:scale-105 hover:-translate-y-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Quiz List
            </button>
            <button
              onClick={() => {
                // Clear current answers
                setAnswers({})
                setCurrentQuestionIndex(0)
                setShowResults(false)
                setShowReview(false)
                if (timeLimitEnabled) {
                  setTimeRemaining(timeLimit * 60)
                }
                
                // Clear saved answers from DATABASE and localStorage
                if (studentId) {
                  fetch(`/api/quiz/progress?studentId=${studentId}&subject=${subject}&labNumber=${labNumber}`, {
                    method: 'DELETE'
                  }).catch(e => console.error('[Quiz] Failed to delete progress:', e))
                  
                  localStorage.removeItem(`quiz_answers_${labNumber}_${studentId}`)
                }
                
                // Clear authentication to allow credential change
                sessionStorage.removeItem('quiz_verified')
                sessionStorage.removeItem('quiz_student_id')
                sessionStorage.removeItem('quiz_credential')
                sessionStorage.removeItem('quiz_lab')
                localStorage.removeItem(`quiz_auth_${labNumber}`)
                
                // Redirect to verification page
                router.push(`/${subject.toLowerCase()}/quiz/${labNumber}/verify`)
              }}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-500 text-white rounded-xl font-bold transition-all hover:shadow-2xl hover:from-cyan-600 hover:to-cyan-600 transform hover:scale-105 hover:-translate-y-1 shadow-lg shadow-cyan-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Review View
  if (showReview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden animate-fade-in">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-3/4 left-1/3 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Glass Navigation Bar */}
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-600 bg-clip-text text-transparent">
                Review Your Answers
              </h1>
            </div>
            <ModeToggle />
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          <div className="glass-card p-8 mb-6 animate-slide-up shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-100">
                  Before You Submit
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                  Review your answers below. You can go back to change any answer before submitting.
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-500"></div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Answered: <span className="font-bold text-cyan-600 dark:text-cyan-400">{answeredQuestions.size}</span> / {questions.length}
                    </span>
                  </div>
                  {answeredQuestions.size < questions.length && (
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="font-medium">{questions.length - answeredQuestions.size} unanswered</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((question, idx) => {
              const userAnswer = answers[question.id] || ""
              
              return (
                <div
                  key={question.id}
                  className="glass-card p-6 animate-slide-up hover:shadow-2xl transition-all"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700">
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <RichTextDisplay content={question.question} className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100" />
                      
                      {userAnswer ? (
                        <div className="p-4 bg-gradient-to-r from-cyan-50 to-cyan-50 dark:from-cyan-900/20 dark:to-cyan-900/20 rounded-xl border-2 border-cyan-200 dark:border-cyan-800 shadow-sm">
                          <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Your Answer
                          </span>
                          <p className="text-sm text-cyan-800 dark:text-cyan-200 mt-2 font-medium">{userAnswer}</p>
                        </div>
                      ) : (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800 shadow-sm">
                          <span className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wide flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            No answer provided
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 flex gap-4 animate-slide-up sticky bottom-4">
            <button
              onClick={() => setShowReview(false)}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-all hover:shadow-xl border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 transform hover:scale-105 hover:-translate-y-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Questions
            </button>
            <button
              onClick={submitQuiz}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-500 text-white rounded-xl font-bold transition-all hover:shadow-2xl hover:from-cyan-600 hover:to-cyan-600 transform hover:scale-105 hover:-translate-y-1 shadow-lg shadow-cyan-500/30 animate-pulse-slow"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Submit Quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Quiz Taking View
  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden animate-fade-in">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-cyan-300 dark:bg-cyan-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"></div>
        <div
          className="absolute top-0 -right-4 w-96 h-96 bg-cyan-300 dark:bg-cyan-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-300 dark:bg-indigo-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      {/* Header */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg animate-slide-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-500 shadow-lg shadow-cyan-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-600 dark:from-cyan-400 dark:to-cyan-400 bg-clip-text text-transparent">
                Lab {labNumber} Quiz
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">{labTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 animate-fade-in animate-delay-200">
            {timeLimitEnabled && timeRemaining > 0 && (
              <div className={`px-4 py-2 rounded-xl font-mono text-sm font-semibold transition-all backdrop-blur-sm ${
                timeRemaining < 60
                  ? 'bg-red-100/90 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse border border-red-300 dark:border-red-700'
                  : timeRemaining < 300
                  ? 'bg-orange-100/90 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-700'
                  : 'bg-slate-100/90 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
              }`}>
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
            
            {studentId && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 rounded-lg border border-cyan-100 dark:border-cyan-800 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {studentId}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-700/50 dark:hover:bg-slate-600/50 text-slate-700 dark:text-slate-300 rounded-xl transition-all transform hover:scale-105 hover:shadow-lg text-sm font-medium border border-slate-300 dark:border-slate-600"
              title="Logout (your answers will be saved)"
            >
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </span>
            </button>
            <ModeToggle />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Question Area */}
          <div className="flex-1 animate-slide-up">
            <div className="glass-card p-8 mb-6 transition-all hover:shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-cyan-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/30 animate-fade-in">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {answeredQuestions.size} answered
                </div>
              </div>

              <RichTextDisplay content={currentQuestion.question} className="text-2xl font-bold mb-8 text-slate-800 dark:text-slate-100 animate-fade-in" />

              {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => (
                    <label
                      key={idx}
                      className={`group flex items-center p-5 rounded-xl border-2 cursor-pointer transition-all transform hover:scale-[1.02] hover:-translate-y-0.5 animate-slide-in-right shadow-sm hover:shadow-lg ${
                        answers[currentQuestion.id] === option
                          ? 'border-cyan-500 bg-gradient-to-r from-cyan-50 to-cyan-50 dark:from-cyan-900/20 dark:to-cyan-900/20 shadow-cyan-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-cyan-300 dark:hover:border-cyan-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={answers[currentQuestion.id] === option}
                        onChange={(e) => handleAnswer(e.target.value)}
                        className="w-5 h-5 text-cyan-600 transition-transform group-hover:scale-110 border-slate-300"
                      />
                      <span className="ml-4 flex-1 text-slate-800 dark:text-slate-100 font-medium">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold mr-2 text-slate-600 dark:text-slate-300">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'short-answer' && (
                <div className="animate-fade-in">
                  <textarea
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={4}
                    className="w-full px-5 py-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-800 dark:text-white transition-all focus:shadow-xl bg-white text-slate-800 placeholder-slate-400"
                  />
                </div>
              )}

              {/* Clear Answer Button */}
              {answers[currentQuestion.id] && (
                <div className="mt-6">
                  <button
                    onClick={() => {
                      const newAnswers = { ...answers }
                      delete newAnswers[currentQuestion.id]
                      setAnswers(newAnswers)
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all transform hover:scale-105 hover:shadow-lg shadow-red-500/20 text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Answer
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 animate-slide-up animate-delay-200">
              <button
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 transform hover:scale-105 hover:-translate-y-1 disabled:hover:scale-100 disabled:hover:translate-y-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-500 text-white rounded-xl font-semibold transition-all hover:shadow-2xl hover:from-cyan-600 hover:to-cyan-600 transform hover:scale-105 hover:-translate-y-1 shadow-lg shadow-cyan-500/30"
                >
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={goToReview}
                  className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-500 text-white rounded-xl font-bold transition-all hover:shadow-2xl hover:from-cyan-600 hover:to-cyan-600 transform hover:scale-105 hover:-translate-y-1 shadow-lg shadow-cyan-500/30 animate-pulse-slow"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Review Answers
                </button>
              )}
            </div>
          </div>

          {/* Navigation Sidebar */}
          <div className="lg:w-80 animate-slide-in-right animate-delay-300">
            <QuizNavigation
              totalQuestions={questions.length}
              currentQuestion={currentQuestionIndex}
              answeredQuestions={answeredQuestions}
              onQuestionSelect={goToQuestion}
              categories={categories}
              questions={questions}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
