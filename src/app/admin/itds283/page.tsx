"use client"

import { Home, Smartphone } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import Link from "next/link"

export default function ITDS283AdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-red-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-red-600 text-white font-bold shadow-lg">
                <Smartphone className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                ITDS283 Admin
              </span>
            </div>

            <div className="flex items-center gap-4 md:gap-6">
              <Link
                href="/admin/dashboard"
                className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors whitespace-nowrap"
              >
                &larr; <span className="hidden sm:inline">Back to Dashboard</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
            ITDS283 - Mobile Development
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Mobile dev labs score management and grading system
          </p>
        </div>

        <div className="glass-card p-8 rounded-2xl text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Admin Dashboard Coming Soon
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Score entry and management features will be available here.
          </p>
        </div>
      </main>
    </div>
  )
}
