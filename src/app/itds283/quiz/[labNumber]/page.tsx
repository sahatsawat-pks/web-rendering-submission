"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { QuizNavigation } from "@/components/QuizNavigation"

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
  const labNumber = params.labNumber as string

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

  useEffect(() => {
    loadQuizData()
  }, [labNumber])

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
      const res = await fetch(`/api/quiz?labNumber=${labNumber}&subject=ITDS283`)
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

  const submitQuiz = () => {
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No questions available for this lab</p>
          <button
            onClick={() => router.push('/itds283/quiz')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-purple-100 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Quiz Results</h1>
            <ModeToggle />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Score Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-6 text-center">
            <h2 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">
              Your Score: {score.percentage}%
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {score.correct} out of {score.total} correct
            </p>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-purple-600 to-pink-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${score.percentage}%` }}
              />
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
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 ${
                    isCorrect
                      ? 'border-green-500'
                      : 'border-red-500'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      Q{idx + 1}.
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-800 dark:text-white mb-3">{question.question}</p>
                      
                      {question.type === 'multiple-choice' && question.options && (
                        <div className="space-y-2 mb-4">
                          {question.options.map((opt, i) => {
                            const isThisCorrect = opt === question.correctAnswer
                            const isUserChoice = opt === userAnswer
                            
                            return (
                              <div
                                key={i}
                                className={`p-3 rounded-lg border ${
                                  isThisCorrect
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                                    : isUserChoice
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                }`}
                              >
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {String.fromCharCode(65 + i)}. {opt}
                                  {isThisCorrect && ' ✓'}
                                  {isUserChoice && !isThisCorrect && ' ✗'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      {question.type === 'short-answer' && (
                        <div className="space-y-2 mb-4">
                          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Your Answer:</span>
                            <p className="text-sm text-gray-800 dark:text-white">{userAnswer || '(No answer)'}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-500">
                            <span className="text-xs font-medium text-green-700 dark:text-green-400">Correct Answer:</span>
                            <p className="text-sm text-green-800 dark:text-green-300">{question.correctAnswer}</p>
                          </div>
                        </div>
                      )}
                      
                      {question.explanation && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Explanation:</span>
                          <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">{question.explanation}</p>
                        </div>
                      )}
                      
                      <div className="mt-3">
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Incorrect
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => router.push('/itds283/quiz')}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Quiz List
            </button>
            <button
              onClick={() => {
                setAnswers({})
                setCurrentQuestionIndex(0)
                setShowResults(false)
                setShowReview(false)
                if (timeLimitEnabled) {
                  setTimeRemaining(timeLimit * 60)
                }
              }}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-purple-100 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Review Your Answers</h1>
            <ModeToggle />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              Before You Submit
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Review your answers below. You can go back to change any answer before submitting.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                Answered: {answeredQuestions.size} / {questions.length}
              </span>
              {answeredQuestions.size < questions.length && (
                <span className="text-orange-600 dark:text-orange-400">
                  ⚠️ {questions.length - answeredQuestions.size} unanswered
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((question, idx) => {
              const userAnswer = answers[question.id] || ""
              
              return (
                <div
                  key={question.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      Q{idx + 1}.
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-800 dark:text-white mb-3">{question.question}</p>
                      
                      {userAnswer ? (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Your Answer:</span>
                          <p className="text-sm text-purple-800 dark:text-purple-300 mt-1">{userAnswer}</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <span className="text-xs font-medium text-orange-700 dark:text-orange-400">No answer provided</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setShowReview(false)}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to Questions
            </button>
            <button
              onClick={submitQuiz}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold"
            >
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-purple-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Lab {labNumber} Quiz
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{labTitle}</p>
          </div>
          <div className="flex items-center gap-4">
            {timeLimitEnabled && timeRemaining > 0 && (
              <div className={`px-4 py-2 rounded-lg font-mono text-lg ${
                timeRemaining < 60
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : timeRemaining < 300
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                ⏱️ {formatTime(timeRemaining)}
              </div>
            )}
            <ModeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Main Question Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-6">
              <div className="mb-6">
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
              </div>

              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
                {currentQuestion.question}
              </h2>

              {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        answers[currentQuestion.id] === option
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={answers[currentQuestion.id] === option}
                        onChange={(e) => handleAnswer(e.target.value)}
                        className="w-5 h-5 text-purple-600"
                      />
                      <span className="ml-3 text-gray-800 dark:text-white">
                        {String.fromCharCode(65 + idx)}. {option}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'short-answer' && (
                <div>
                  <textarea
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={goToReview}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold"
                >
                  Review Answers →
                </button>
              )}
            </div>
          </div>

          {/* Navigation Sidebar */}
          <div className="w-80">
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
