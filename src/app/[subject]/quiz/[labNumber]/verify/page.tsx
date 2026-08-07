"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { getCanonicalSubjectCodeOrDefault, getSubjectConfig, isValidSubject, SubjectConfig } from "@/lib/subjectConfig"
import { fetchSubjectConfig } from "@/lib/subjectConfigCache"
import { ArrowLeft, Shield, AlertCircle, UserCheck, Sparkles } from "lucide-react"

export default function QuizVerifyPage() {
  const router = useRouter()
  const params = useParams()
  const rawSubject = typeof params?.subject === 'string' ? params.subject : ''
  const subject = getCanonicalSubjectCodeOrDefault(rawSubject) || rawSubject
  const labNumber = typeof params?.labNumber === 'string' ? params.labNumber : ''
  
  const [dbConfig, setDbConfig] = useState<SubjectConfig | null>(null)
  
  const staticConfig = subject ? getSubjectConfig(subject) : null
  const config = dbConfig || staticConfig

  const [studentId, setStudentId] = useState("")
  const [credential, setCredential] = useState("")
  const [verificationError, setVerificationError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [staffUser, setStaffUser] = useState<{ username: string; role: string } | null>(null)

  useEffect(() => {
    // Check if staff user is already logged in
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data && data.username) {
          setStaffUser({ username: data.username, role: data.role || 'Staff' })
        }
      })
      .catch(() => {})

    if (subject) {
      fetchSubjectConfig(subject)
        .then(adapted => {
          if (adapted) {
            setDbConfig(adapted)
            if (!adapted.hasQuiz) {
              router.push(`/${rawSubject}`)
              return
            }
          } else if (staticConfig) {
            if (!staticConfig.hasQuiz) {
              router.push(`/${rawSubject}`)
              return
            }
          } else {
            router.push(`/${rawSubject}`)
            return
          }
        })
        .catch(() => {
          router.push(`/${rawSubject}`)
        })

      fetch(`/api/quiz?labNumber=${labNumber}&subject=${subject}`, { cache: 'no-store' })
        .then(res => {
          if (!res.ok) {
            router.push(`/${rawSubject}`)
            return null
          }
          return res.json()
        })
        .then(data => {
          if (data && data.quizEnabled !== true) {
            router.push(`/${rawSubject}`)
          }
        })
        .catch(() => {
          router.push(`/${rawSubject}`)
        })
    }
  }, [subject, labNumber, router, staticConfig, rawSubject])

  if (!config) {
     return null
  }

  const handleStaffFastTrack = (username: string) => {
    sessionStorage.setItem('quiz_verified', 'true')
    sessionStorage.setItem('quiz_student_id', username)
    sessionStorage.setItem('quiz_credential', 'STAFF_AUTH')
    sessionStorage.setItem('quiz_lab', labNumber)
    
    localStorage.setItem(`quiz_auth_${labNumber}`, JSON.stringify({
      studentId: username,
      credential: 'STAFF_AUTH',
      labNumber
    }))
    
    router.push(`/${rawSubject}/quiz/${labNumber}`)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerificationError("")
    setVerifying(true)

    try {
      const cleanStudentId = studentId.trim()
      const cleanCred = credential.trim()

      const response = await fetch(`/api/credentials?credential=${encodeURIComponent(cleanCred)}&studentId=${encodeURIComponent(cleanStudentId)}&subject=${subject}`)
      const data = await response.json()

      if (data.success && (data.isStaff || (data.studentId && data.studentId.toLowerCase() === cleanStudentId.toLowerCase()))) {
        const verifiedId = data.studentId || cleanStudentId
        
        sessionStorage.setItem('quiz_verified', 'true')
        sessionStorage.setItem('quiz_student_id', verifiedId)
        sessionStorage.setItem('quiz_credential', cleanCred)
        sessionStorage.setItem('quiz_lab', labNumber)
        
        localStorage.setItem(`quiz_auth_${labNumber}`, JSON.stringify({
          studentId: verifiedId,
          credential: cleanCred,
          labNumber
        }))
        
        router.push(`/${rawSubject}/quiz/${labNumber}`)
      } else {
        setVerificationError("Invalid Student ID, Staff Username, or Credential Password.")
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
            Quiz Verification
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
            Enter your Student ID or Staff Username to access Lab {labNumber} Quiz
          </p>

          {/* Staff Fast-Track Banner */}
          {staffUser && (
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-400 dark:border-purple-600 rounded-xl shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                <span className="font-bold text-purple-900 dark:text-purple-200 text-sm">
                  Logged in as {staffUser.role}: <strong className="font-mono">{staffUser.username}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleStaffFastTrack(staffUser.username)}
                className="w-full mt-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm transition-all text-sm flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" /> Enter Quiz as {staffUser.username}
              </button>
            </div>
          )}

          {verificationError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-700 dark:text-red-300">{verificationError}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                Student ID or Staff Username
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Student ID (e.g. 6788003) or Username"
                required
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                Credential Code or Staff Password
              </label>
              <input
                type="password"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder="Enter credential code or account password"
                required
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={verifying || !studentId.trim() || !credential.trim()}
              className={`w-full px-6 py-3 bg-gradient-to-r ${config.gradientFrom.replace('/5', '')} ${config.gradientTo.replace('/5', '')} text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold`}
            >
              {verifying ? "Verifying..." : "Verify & Start Quiz"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-start gap-3 shadow-inner">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong className="text-slate-800 dark:text-slate-200 font-bold">Note:</strong> Students use the credential code provided by their instructor. Instructors, LAs, and Main Admins can log in using their staff username & account password.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
