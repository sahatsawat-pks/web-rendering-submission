"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, User, ArrowLeft } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import Footer from "@/components/Footer"

export default function AdminLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Login failed")
        return
      }

      router.push("/admin/dashboard")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 flex flex-col relative overflow-hidden animate-fade-in">
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-300 dark:bg-teal-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"></div>
        <div
          className="absolute top-1/3 -right-20 w-96 h-96 bg-cyan-300 dark:bg-cyan-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "3s" }}
        ></div>
        <div
          className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "6s" }}
        ></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full relative z-10 animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white mb-4 sm:mb-6 animate-float shadow-2xl shadow-teal-500/50">
            <Lock className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-2 sm:mb-3">
            <span className="gradient-text">Admin Portal</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-700 dark:text-slate-400">Secure access to the management dashboard</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-6 sm:p-8 md:p-10 hover:shadow-2xl hover:shadow-teal-500/20 transition-all duration-500 border-2 border-white/60 dark:border-slate-700/60">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label
                htmlFor="username"
                className="block text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"
              >
                <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-base font-semibold focus:ring-4 focus:ring-teal-500/30 focus:border-teal-500 transition-all outline-none shadow-sm hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md"
                placeholder="Enter your username"
              />
            </div>

            <div className="space-y-3">
              <label
                htmlFor="password"
                className="block text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-base font-semibold focus:ring-4 focus:ring-teal-500/30 focus:border-teal-500 transition-all outline-none shadow-sm hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-5 py-4 rounded-xl flex items-start gap-3 animate-slide-up">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-red-100 dark:bg-red-800/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-sm">Authentication Failed</p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold tracking-wide py-4 px-6 rounded-xl transition-all duration-300 shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/50 disabled:cursor-not-allowed btn-hover-lift flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6 sm:mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Submission Viewer
          </Link>
        </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
