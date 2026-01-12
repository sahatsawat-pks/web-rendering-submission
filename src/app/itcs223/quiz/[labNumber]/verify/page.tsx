"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { Shield, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function QuizVerificationPage() {
  const router = useRouter()
  const params = useParams()
  const labNumber = params.labNumber as string

  const [studentId, setStudentId] = useState("")
  const [credential, setCredential] = useState("")
  const [error, setError] = useState("")
  const [verifying, setVerifying] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setVerifying(true)

    try {
      // Verify credentials
      const response = await fetch(`/api/credentials?credential=${credential}&subject=ITCS223`)
      const data = await response.json()

      if (data.success && data.studentId === studentId) {
        // Store verification in session storage
        sessionStorage.setItem('quiz_verified', 'true')
        sessionStorage.setItem('quiz_student_id', studentId)
        sessionStorage.setItem('quiz_credential', credential)
        sessionStorage.setItem('quiz_lab', labNumber)
        
        // Also store in localStorage for persistent login across sessions
        localStorage.setItem(`quiz_auth_${labNumber}`, JSON.stringify({
          studentId,
          credential,
          labNumber
        }))
        
        // Redirect to actual quiz
        router.push(`/itcs223/quiz/${labNumber}`)
      } else {
        setError("Invalid Student ID or Credential. Please check and try again.")
      }
    } catch (err) {
      setError("An error occurred during verification. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-blue-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/itcs223/quiz"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-500 hover:text-white transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Lab {labNumber} Quiz Verification
            </h1>
          </div>
          <ModeToggle />
        </div>
      </div>

      {/* Verification Form */}
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2 text-gray-800 dark:text-white">
            Student Verification Required
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Please enter your Student ID and Credential to access this quiz
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Student ID
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter your Student ID (e.g., 6788003)"
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Credential Code
              </label>
              <input
                type="text"
                value={credential}
                onChange={(e) => setCredential(e.target.value.toUpperCase())}
                placeholder="Enter your 6-character code"
                required
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={verifying || !studentId || credential.length !== 6}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {verifying ? "Verifying..." : "Verify & Start Quiz"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Your credential code was provided by your instructor.
              If you don't have your credential, please contact your instructor.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
