"use client"

import { ArrowLeft } from "lucide-react"
import LogoutButton from "@/components/LogoutButton"
import { ModeToggle } from "@/components/mode-toggle"

interface SubjectNavbarProps {
  code: string
  subtitle: string
  accentColor: string
  shadowColor: string
  isAuthenticated: boolean
}

export default function SubjectNavbar({ code, subtitle, accentColor, shadowColor, isAuthenticated }: SubjectNavbarProps) {
  return (
    <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
      <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            title="Back to Main Page"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <img 
            src="/logo.png" 
            alt="Logo" 
            className={`h-11 w-11 rounded-xl shadow-lg ${shadowColor}`} 
          />
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {code}
            </span>
            <p className={`text-xs ${accentColor} font-medium`}>
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {!isAuthenticated ? (
             <a
               href="/admin/login"
               className={`px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/60 flex items-center gap-2`}
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
               </svg>
               Admin
             </a>
           ) : (
              <LogoutButton />
           )}
          <ModeToggle />
        </div>
      </div>
    </nav>
  )
}
