"use client"

import { Terminal, ArrowLeft, Settings, Plus } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"

export default function ITCS123Admin() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/20 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
             <a href="/admin/dashboard" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
            </a>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white font-bold shadow-lg">
              <Terminal className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              ITCS123 OOP Config
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <LogoutButton />
           </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto max-w-4xl px-6 py-12">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Test Case Configuration</h1>
            <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-md transition-all">
                <Plus className="w-4 h-4" />
                Add Test Suite
            </button>
        </div>

        <div className="grid gap-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:border-orange-300 transition-colors">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Lab {i}: Intro to Java</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Contains 5 test cases. Last updated 2 days ago.</p>
                    </div>
                    <button className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/20 text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            ))}
        </div>
      </main>
    </div>
  )
}
