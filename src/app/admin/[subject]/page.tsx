"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Home, Layers, Key, AlertCircle } from "lucide-react"
import LogoutButton from "@/components/LogoutButton"
import { ModeToggle } from "@/components/mode-toggle"
import LabChallengeGrading from "@/components/admin/LabChallengeGrading"
import SimpleScoreGrading from "@/components/admin/SimpleScoreGrading"
import SQLGrading from "@/components/admin/SQLGrading"
import PythonGrading from "@/components/admin/PythonGrading"
import { getGradientStyleProps } from "@/lib/colors"

interface Subject {
  code: string
  title: string
  hasGradingInterface: boolean
  hasQuizManagement: boolean
  hasTestCases: boolean
  gradingType: 'lab_challenge' | 'simple_score' | 'sql' | 'python' | 'java' | null
  color: string
  quizSectionEnabled: boolean
}

export default function DynamicAdminDashboard() {
  const router = useRouter()
  const params = useParams()
  const subjectCode = (params?.subject as string)?.toUpperCase()

  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<'LA' | 'Lecturer' | 'Main Admin'>('LA')
  const [username, setUsername] = useState('')
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    async function fetchSubjectConfig() {
      try {
        const subjectRes = await fetch(`/api/subjects?code=${subjectCode}`)
        if (!subjectRes.ok) {
          setError(`Subject ${subjectCode} not found`)
          setLoading(false)
          return
        }

        const subjectData = await subjectRes.json()
        if (!subjectData.success || !subjectData.subjects || subjectData.subjects.length === 0) {
          setError(`Subject ${subjectCode} not found`)
          setLoading(false)
          return
        }

        setSubject(subjectData.subjects[0])

        const authRes = await fetch("/api/auth/me")
        const authData = await authRes.json()
        
        if (authData.role) {
          setRole(authData.role)
        }
        if (authData.username) {
          setUsername(authData.username)
        }

        const subjectPermissionKey = subjectCode.toLowerCase()
        if (authData.username === 'kanzaki_aito' || (authData.permissions && authData.permissions[subjectPermissionKey])) {
          setHasAccess(true)
        } else {
          router.push('/admin/dashboard')
        }
      } catch (err) {
        console.error("Failed to fetch subject configuration:", err)
        setError("Failed to load subject configuration")
      } finally {
        setLoading(false)
      }
    }

    if (subjectCode) {
      fetchSubjectConfig()
    }
  }, [subjectCode, router])

  if (loading || !hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-200 dark:border-slate-800 border-t-slate-600 dark:border-t-slate-400"></div>
          <p className="text-slate-500 dark:text-slate-400 mt-4">{loading ? 'Loading...' : 'Checking permissions...'}</p>
        </div>
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
        <nav className="sticky top-0 z-50 w-full border-b border-white/20 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2 md:gap-4">
              <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-500 hover:text-white transition-all shadow-sm hover:shadow-lg">
                <Home className="h-5 w-5" />
              </Link>
              <Link href="/admin/dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-500 hover:text-white transition-all shadow-sm hover:shadow-lg">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <ModeToggle />
              <LogoutButton />
            </div>
          </div>
        </nav>

        <main className="container mx-auto max-w-4xl px-4 py-16">
          <div className="glass-card p-8 rounded-2xl text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Subject Not Found</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const gradientProps = getGradientStyleProps(subject.color)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
            className={`absolute top-0 -left-4 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-5 dark:opacity-10 animate-float ${gradientProps.className}`}
            style={gradientProps.style}
        ></div>
        <div
          className={`absolute bottom-0 -right-4 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-5 dark:opacity-10 animate-float ${gradientProps.className}`}
          style={{ ...gradientProps.style, animationDelay: "3s" }}
        ></div>
      </div>

      <nav className="sticky top-0 z-50 w-full border-b border-white/20 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-500 hover:text-white transition-all shadow-sm hover:shadow-lg" title="Back to Main Page">
              <Home className="h-5 w-5" />
            </Link>
            <Link href="/admin/dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-500 hover:text-white transition-all shadow-sm hover:shadow-lg" title="Back to Dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div 
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg ${gradientProps.className}`}
                style={gradientProps.style}
            >
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 hidden sm:inline">
              {subjectCode} Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {subject.hasGradingInterface && (
              <Link href="/admin/lookup-credential" className="hidden sm:flex h-9 items-center justify-center px-3 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium text-sm hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors" title="Lookup Credentials">
                <Key className="w-4 h-4 mr-2" />
                Lookup
              </Link>
            )}
            <ModeToggle />
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-7xl px-4 py-8 relative z-10">
        {subject.hasGradingInterface && subject.gradingType === 'lab_challenge' ? (
          <LabChallengeGrading
            subjectCode={subjectCode}
            subjectTitle={subject.title}
            role={role}
            username={username}
            hasQuizManagement={subject.hasQuizManagement}
            hasTestCases={subject.hasTestCases}
            quizSectionEnabled={subject.quizSectionEnabled}
            color={subject.color}
          />
        ) : subject.hasGradingInterface && subject.gradingType === 'simple_score' ? (
          <SimpleScoreGrading
            subjectCode={subjectCode}
            subjectTitle={subject.title}
            role={role}
            username={username}
            hasQuizManagement={subject.hasQuizManagement}
            quizSectionEnabled={subject.quizSectionEnabled}
            color={subject.color}
          />
        ) : subject.hasGradingInterface && subject.gradingType === 'sql' ? (
          <SQLGrading
            subjectCode={subjectCode}
            subjectTitle={subject.title}
            role={role}
            username={username}
            hasQuizManagement={subject.hasQuizManagement}
            hasTestCases={subject.hasTestCases}
            quizSectionEnabled={subject.quizSectionEnabled}
            color={subject.color}
          />
        ) : subject.hasGradingInterface && subject.gradingType === 'python' ? (
          <PythonGrading
            subjectCode={subjectCode}
            subjectTitle={subject.title}
            role={role}
            username={username}
            hasQuizManagement={subject.hasQuizManagement}
            hasTestCases={subject.hasTestCases}
            quizSectionEnabled={subject.quizSectionEnabled}
            color={subject.color}
          />
        ) : subject.hasGradingInterface && !subject.gradingType ? (
          <div className="glass-card p-8 rounded-2xl text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Grading Type Not Set</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              This subject has grading enabled but no grading type configured.
            </p>
            <Link
              href="/admin/subjects"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all shadow-lg"
            >
              Configure in Subject Management
            </Link>
          </div>
        ) : !subject.hasGradingInterface ? (
          <div className="glass-card p-8 rounded-2xl text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-blue-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Grading Interface Disabled</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Enable grading features for this subject in Subject Management.
            </p>
            <Link
              href="/admin/subjects"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all shadow-lg"
            >
              Configure Subject
            </Link>
          </div>
        ) : (
          <div className="glass-card p-8 rounded-2xl text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Grading Type Not Supported Yet</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Grading type "<span className="font-mono">{subject.gradingType}</span>" will be added soon. Use the standard dashboard for now.
            </p>
            <Link
              href={`/admin/${subjectCode.toLowerCase()}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all shadow-lg"
            >
              Go to {subjectCode} Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
