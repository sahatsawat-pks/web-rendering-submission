"use client"

import { useState, useEffect } from "react"
import { ModeToggle } from "@/components/mode-toggle"
import { ArrowLeft, BookOpen, Database, Code } from "lucide-react"
import Link from "next/link"
import Footer from "@/components/Footer"

export default function ITCS255LandingPage() {
  const [quizSectionEnabled, setQuizSectionEnabled] = useState(true)
  
  useEffect(() => {
    fetch('/api/subjects?code=ITCS255')
      .then(res => res.json())
      .then(data => {
        if (data.subjects && data.subjects.length > 0) {
          setQuizSectionEnabled(data.subjects[0].quizSectionEnabled !== false)
        }
      })
      .catch(err => console.error('Failed to fetch subject info:', err))
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Navigation */}
       <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-3">
            <a
              href="/"
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <img src="/logo.png" alt="Logo" className="h-9 w-9 md:h-11 md:w-11 rounded-xl shadow-lg shadow-purple-500/20" />
            <div>
              <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                ITCS255
              </span>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium hidden sm:block">Structured Query Language Essentials</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-24 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="text-center mb-16 animate-slide-up">
           <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-slate-100 mb-6 tracking-tight">
              Select <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Action</span>
           </h1>
           <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Choose to run SQL tests or check your lab scores.
           </p>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl animate-scale-in ${quizSectionEnabled ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
           {/* Card 1: SQL Test Runner */}
           <Link href="/itcs255/test-case" className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col items-center text-center">
                 <div className="w-20 h-20 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <Database className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">SQL Test Runner</h2>
                 <p className="text-slate-500 dark:text-slate-400">
                    Execute and validate SQL queries for your lab submissions.
                 </p>
              </div>
           </Link>

           {/* Card 2: Scores */}
           <Link href="/itcs255/score" className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl hover:shadow-purple-500/20 transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col items-center text-center">
                 <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                    <BookOpen className="w-10 h-10 text-red-600 dark:text-red-400" />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Check <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Lab Scores</span></h2>
                 <p className="text-slate-500 dark:text-slate-400">
                    View your grade status, feedback, and lab completion progress.
                 </p>
              </div>
           </Link>

           {/* Card 3: Quiz - Conditionally Rendered */}
           {quizSectionEnabled && (
             <a href="https://muictta.space" target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex flex-col items-center text-center">
                   <div className="w-20 h-20 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <svg className="w-10 h-10 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                   </div>
                   <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Check Your Understanding</h2>
                   <p className="text-slate-500 dark:text-slate-400">
                      Test your knowledge with quizzes for each lab.
                   </p>
                </div>
             </a>
           )}


        </div>
      </main>

      <Footer />
    </div>
  )
}
