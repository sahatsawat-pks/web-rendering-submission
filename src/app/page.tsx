"use client"

import { Zap, Code2, Layers, BarChart3, Terminal, Smartphone, Code, Database } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import Link from "next/link"
import { useEffect, useState } from "react"
import LogoutButton from "@/components/LogoutButton"
import Footer from "@/components/Footer"

interface Subject {
  id: string
  code: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  shadow: string
  link: string
  isVisible?: boolean
  displayOrder?: number
}

export default function LandingPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])

  useEffect(() => {
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        if (data.isAuthenticated) setIsAdmin(true)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    // Fetch subjects from API
    fetch('/api/subjects')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.subjects) {
          // Map database subjects to UI format
          const iconMap: Record<string, React.ReactNode> = {
            'ITCS223': <Code2 className="w-6 h-6" />,
            'ITCS227': <BarChart3 className="w-6 h-6" />,
            'ITGE162': <Layers className="w-6 h-6" />,
            'ITCS123': <Terminal className="w-6 h-6" />,
            'ITCS251': <Code className="w-6 h-6" />,
            'ITCS255': <Database className="w-6 h-6" />,
            'ITDS283': <Smartphone className="w-6 h-6" />
          }
          
          const colorMap: Record<string, string> = {
            'ITCS223': 'from-teal-500 to-cyan-500',
            'ITCS227': 'from-indigo-500 to-violet-500',
            'ITGE162': 'from-emerald-500 to-green-500',
            'ITCS123': 'from-orange-500 to-amber-500',
            'ITCS251': 'from-blue-500 to-sky-500',
            'ITCS255': 'from-purple-500 to-pink-500',
            'ITDS283': 'from-rose-500 to-red-500'
          }
          
          const shadowMap: Record<string, string> = {
            'ITCS223': 'shadow-teal-500/30',
            'ITCS227': 'shadow-indigo-500/30',
            'ITGE162': 'shadow-emerald-500/30',
            'ITCS123': 'shadow-orange-500/30',
            'ITCS251': 'shadow-blue-500/30',
            'ITCS255': 'shadow-purple-500/30',
            'ITDS283': 'shadow-rose-500/30'
          }

          const descriptionMap: Record<string, string> = {
            'ITCS223': 'Full-stack web submission rendering & testing.',
            'ITCS227': 'Lab score tracking and grading system.',
            'ITGE162': 'Physical Science and Computation.',
            'ITCS123': 'Java JUnit test runner and code validator.',
            'ITCS251': 'Programming in Python',
            'ITCS255': 'Structured Query Language Essentials',
            'ITDS283': 'Mobile dev labs gradebook and score tracking.'
          }

          const mappedSubjects = data.subjects
            .filter((s: any) => s.is_visible) // Only show visible subjects
            .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
            .map((s: any) => ({
              id: s.code.toLowerCase(),
              code: s.code,
              title: s.name || s.title,
              description: descriptionMap[s.code] || 'Subject information.',
              icon: iconMap[s.code] || <Code2 className="w-6 h-6" />,
              color: colorMap[s.code] || 'from-slate-500 to-gray-500',
              shadow: shadowMap[s.code] || 'shadow-slate-500/30',
              link: `/${s.code.toLowerCase()}`,
              isVisible: s.is_visible,
              displayOrder: s.display_order
            }))
          
          setSubjects(mappedSubjects)
        }
      })
      .catch(err => {
        console.error('Failed to fetch subjects:', err)
        // Fallback to empty array if fetch fails
        setSubjects([])
      })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden animate-fade-in flex flex-col font-sans">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-teal-300 dark:bg-teal-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"></div>
        <div
          className="absolute top-0 -right-4 w-96 h-96 bg-indigo-300 dark:bg-indigo-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute -bottom-8 left-20 w-96 h-96 bg-orange-300 dark:bg-orange-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-3">
            <img src="/logo.png" alt="Logo" className="h-9 w-9 md:h-11 md:w-11 rounded-xl shadow-lg shadow-slate-500/20" />
            <div>
              <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                MUICT Submissions
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">Centralized Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {!loading && (
              <>
                {isAdmin ? (
                  <>
                     <Link
                      href="/admin/dashboard"
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/60 flex items-center gap-1 md:gap-2"
                    >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                    <LogoutButton />
                  </>
                ) : (
                  <Link
                    href="/admin/login"
                    className="px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/60 flex items-center gap-1 md:gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Staff Login</span>
                  </Link>
                )}
              </>
            )}
            <ModeToggle />
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto max-w-7xl px-6 py-16 relative z-10 flex flex-col items-center justify-center text-center">
        {/* Hero Section */}
        <div className="mx-auto max-w-4xl mb-16 animate-slide-up">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl mb-6 leading-tight">
            Select Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-indigo-500">Subject</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Choose the course module below to access labs, submissions, or grading systems.
          </p>
        </div>

        {/* Subject Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto w-full animate-scale-in mb-24">
          {subjects.map((subject, index) => (
             <Link 
                key={subject.id} 
                href={subject.link}
                className="group relative flex flex-col"
                style={{ animationDelay: `${index * 100}ms` }}
            >
                <div className="glass-card flex-1 p-8 text-left hover:scale-[1.03] transition-all duration-300 border-2 border-white/60 dark:border-slate-700/60 group-hover:shadow-2xl flex flex-col">
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white shadow-lg ${subject.shadow} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        {subject.icon}
                    </div>
                    <div className="mb-4">
                        <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                            {subject.code}
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{subject.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 flex-1">
                        {subject.description}
                    </p>
                    <div className="flex items-center text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:translate-x-1 transition-transform">
                        Enter Module <Zap className="w-4 h-4 ml-2 text-amber-500" />
                    </div>
                </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
