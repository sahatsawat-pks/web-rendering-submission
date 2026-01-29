"use client"

import Link from "next/link"
import LogoutButton from "@/components/LogoutButton"
import { ModeToggle } from "@/components/mode-toggle"

export default function Navbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
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
          {isAuthenticated ? (
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
          <ModeToggle />
        </div>
      </div>
    </nav>
  )
}
