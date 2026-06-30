"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { getCanonicalSubjectCodeOrDefault, getSubjectConfig, isValidSubject, SubjectConfig } from "@/lib/subjectConfig"
import { fetchSubjectConfig } from "@/lib/subjectConfigCache"
import { ArrowLeft, Shield, AlertCircle } from "lucide-react"

export default function QuizVerifyPage() {
  const router = useRouter()
  const params = useParams()
  const rawSubject = typeof params?.subject === 'string' ? params.subject : ''
  const subject = getCanonicalSubjectCodeOrDefault(rawSubject) || rawSubject
  const labNumber = typeof params?.labNumber === 'string' ? params.labNumber : ''
  
  // if (!isValidSubject(subject)) { ... } // Dynamic check handles this
  
  const [dbConfig, setDbConfig] = useState<SubjectConfig | null>(null)
  
  // Use DB config if available, otherwise static
  const staticConfig = subject ? getSubjectConfig(subject) : null
  const config = dbConfig || staticConfig

  // Effect to load config
  useEffect(() => {
    if (subject) {
        fetchSubjectConfig(subject)
         .then(adapted => {
            if (adapted) {
                 setDbConfig(adapted)
            } else if (!staticConfig) {
                 router.push('/404')
            }
         })
         .catch(() => {
            if (!staticConfig) router.push('/404')
         })
    }
  }, [subject, router, staticConfig])

  // Need to handle loading state slightly better but for now let's just return null if no config
  if (!config) {
     return null // Or a loader
  }

  const [studentId, setStudentId] = useState("")
  const [credential, setCredential] = useState("")
  const [verificationError, setVerificationError] = useState("")
  const [verifying, setVerifying] = useState(false)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerificationError("")
    setVerifying(true)

    try {
      // Verify credentials
      const response = await fetch(`/api/credentials?credential=${credential}&subject=${subject}`)
      const data = await response.json()

      if (data.success && data.studentId === studentId) {
        // Store verification in session storage
        sessionStorage.setItem('quiz_verified', 'true')
        sessionStorage.setItem('quiz_student_id', studentId)
        sessionStorage.setItem('quiz_credential', credential)
        sessionStorage.setItem('quiz_lab', labNumber)
        
        // Also store in localStorage for persistent login
        localStorage.setItem(`quiz_auth_${labNumber}`, JSON.stringify({
          studentId,
          credential,
          labNumber
        }))
        
        // Redirect to quiz page
        router.push(`/${rawSubject}/quiz/${labNumber}`)
      } else {
        setVerificationError("Invalid Student ID or Credential. Please check and try again.")
      }
    } catch (err) {
      setVerificationError("An error occurred during verification. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} animate-fade-in`}>
      {/* Navigation Bar */}
      <nav className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.push(`/${rawSubject}/quiz`)}
              className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Quizzes</span>
            </button>
            <ModeToggle />
          </div>
        </div>
      </nav>

      {/* Verification Form */}
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex justify-center mb-6">
            <div className={`p-4 bg-gradient-to-br ${config.gradientFrom.replace('/5', '/10')} ${config.gradientTo.replace('/5', '/10')} rounded-full`}>
              <Shield className={`w-12 h-12 ${config.accentColor}`} />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2 text-slate-800 dark:text-white">
            Student Verification Required
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
            Please enter your Student ID and Credential to access Lab {labNumber} Quiz
          </p>

          {verificationError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{verificationError}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Student ID
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter your Student ID (e.g., 6788003)"
                required
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Credential Code
              </label>
              <input
                type="text"
                value={credential}
                onChange={(e) => setCredential(e.target.value.toUpperCase())}
                placeholder="Enter your 6-character code"
                required
                maxLength={6}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white font-mono uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={verifying || !studentId || credential.length !== 6}
              className={`w-full px-6 py-3 bg-gradient-to-r ${config.gradientFrom.replace('/5', '')} ${config.gradientTo.replace('/5', '')} text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold`}
            >
              {verifying ? "Verifying..." : "Verify & Start Quiz"}
            </button>
          </form>

          <div className={`mt-6 p-4 bg-gradient-to-r ${config.gradientFrom.replace('/5', '/5')} ${config.gradientTo.replace('/5', '/5')} border border-slate-200 dark:border-slate-700 rounded-lg`}>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              <strong>Note:</strong> Your credential code was provided by your instructor.
              If you don't have your credential, please contact your instructor.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
