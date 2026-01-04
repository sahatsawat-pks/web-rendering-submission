"use client"

import { Zap, Code2, Layers, BarChart3, Terminal } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import Link from "next/link"
import { useEffect, useState } from "react"
import LogoutButton from "@/components/LogoutButton"

export default function LandingPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        if (data.isAuthenticated) setIsAdmin(true)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const subjects = [
    {
      id: "itcs223",
      code: "ITCS223",
      title: "Introduction to Web Development",
      description: "Full-stack web submission rendering & testing.",
      icon: <Code2 className="w-6 h-6" />,
      color: "from-teal-500 to-cyan-500",
      shadow: "shadow-teal-500/30",
      link: "/itcs223"
    },
    {
      id: "itcs227",
      code: "ITCS227",
      title: "Introduction to Data Science",
      description: "Lab score tracking and grading system.",
      icon: <BarChart3 className="w-6 h-6" />,
      color: "from-indigo-500 to-violet-500",
      shadow: "shadow-indigo-500/30",
      link: "/itcs227"
    },
    {
      id: "itge162",
      code: "ITGE162",
      title: "Physical Science and Computation",
      description: "Lab score tracking and grading system.",
      icon: <Layers className="w-6 h-6" />,
      color: "from-emerald-500 to-green-500",
      shadow: "shadow-emerald-500/30",
      link: "/itge162"
    },
    {
      id: "itcs123",
      code: "ITCS123",
      title: "Object Oriented Programming",
      description: "Java JUnit test runner and code validator.",
      icon: <Terminal className="w-6 h-6" />,
      color: "from-orange-500 to-amber-500",
      shadow: "shadow-orange-500/30",
      link: "/itcs123"
    }
  ]

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
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-11 w-11 rounded-xl shadow-lg shadow-slate-500/20" />
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                MUICT Submissions
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Centralized Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!loading && (
              <>
                {isAdmin ? (
                  <>
                     <Link
                      href="/admin/dashboard"
                      className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/60 flex items-center gap-2"
                    >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      Dashboard
                    </Link>
                    <LogoutButton />
                  </>
                ) : (
                  <Link
                    href="/admin/login"
                    className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/60 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Staff Login
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

      {/* Footer */}
      <footer className="w-full py-6 text-center text-slate-400 dark:text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} MUICT Web Rendering Platform.</p>
      </footer>
    </div>
  )
}
