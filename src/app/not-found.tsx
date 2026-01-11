"use client"

import Link from "next/link"
import { Home, ArrowLeft, FileQuestion } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import Footer from "@/components/Footer"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0d1117] dark:via-[#161b22] dark:to-[#0d1117] flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 flex justify-end">
        <ModeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center space-y-8">
          
          {/* 404 Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-pulse">
                <FileQuestion className="w-16 h-16 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-2xl opacity-30 animate-pulse"></div>
            </div>
          </div>

          {/* 404 Text */}
          <div className="space-y-4">
            <h1 className="text-8xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
              Page Not Found
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              href="/"
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300"
            >
              <Home className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Back to Home
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="group flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#161b22] text-slate-700 dark:text-slate-300 border-2 border-slate-300 dark:border-slate-700 rounded-xl font-semibold hover:border-purple-500 dark:hover:border-purple-500 hover:text-purple-500 dark:hover:text-purple-400 hover:scale-105 transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Go Back
            </button>
          </div>

          {/* Additional Info */}
          <div className="pt-8 text-sm text-slate-500 dark:text-slate-500">
            <p>If you believe this is an error, please contact the administrator.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
