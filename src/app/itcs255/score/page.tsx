"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, ArrowLeft } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import Footer from "@/components/Footer"

interface LabRow {
    lab: string
    title: string
    score: string
    totalScore?: number
}

interface ActiveLab {
    labNumber: string
    title: string
    totalScore?: number
}

// Helper function to calculate gradient color based on score percentage
function getScoreColor(score: number, maxScore: number | undefined): string {
  if (!maxScore || maxScore === 0) {
    if (score === 2) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (score === 1) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (score === 0) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
  }

  const percentage = score / maxScore;
  
  if (percentage <= 0) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  } else if (percentage < 0.5) {
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
  } else if (percentage < 0.75) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  } else if (percentage < 1) {
    return 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400';
  } else {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  }
}

export default function ITCS255ScorePage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [credential, setCredential] = useState("")
  const [scores, setScores] = useState<any | null>(null)
  const [activeLabs, setActiveLabs] = useState<ActiveLab[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchedId, setSearchedId] = useState("")

  useEffect(() => {
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        if (data.isAuthenticated) setIsAdmin(true)
      })
      .catch(err => console.error(err))
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!credential.trim()) return

    setLoading(true)
    setError(null)
    setScores(null)
    setSearchedId("")

    try {
      const credentialRes = await fetch(`/api/credentials?credential=${credential.trim()}`)
      if (!credentialRes.ok) {
        setError("Failed to validate credential")
        setLoading(false)
        return
      }

      const credentialData = await credentialRes.json()
      if (!credentialData.success || !credentialData.studentId) {
        setError("Invalid credential code. Please check your code and try again.")
        setLoading(false)
        return
      }

      const studentId = credentialData.studentId
      setSearchedId(studentId)

      const scoreRes = await fetch(`/api/scores?subject=ITCS255&username=${studentId}`)
      const labsRes = await fetch(`/api/labs?subject=ITCS255&activeOnly=true`)

      if (scoreRes.ok && labsRes.ok) {
        const scoreData = await scoreRes.json()
        const labsData = await labsRes.json()

        if (scoreData.scores) {
            setScores(scoreData.scores)
            if (labsData.labs) {
                setActiveLabs(labsData.labs)
            }
        } else {
             setScores(null)
             setError("Student ID not found in records.")
        }
      } else {
         const errData = await scoreRes.json().catch(() => ({}))
         setError(errData.error || "Failed to fetch data")
      }
    } catch (e) {
      console.error(e)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const labRows: LabRow[] = []
  if (scores && activeLabs.length > 0) {
      activeLabs.forEach(lab => {
          const plainNum = parseInt(lab.labNumber).toString()
          const exactKey = `Lab ${lab.labNumber}`
          const normalizedKey = `Lab ${plainNum}`
          
          let validKey = null
          if (scores[exactKey] !== undefined) validKey = exactKey
          else if (scores[normalizedKey] !== undefined) validKey = normalizedKey

          const scoreValue = validKey ? scores[validKey] : undefined
          labRows.push({
              lab: lab.labNumber.padStart(2, '0'),
              title: lab.title, 
              score: (scoreValue === undefined || scoreValue === null || scoreValue === '') ? '0' : scoreValue,
              totalScore: lab.totalScore
          })
      })
      
      labRows.sort((a, b) => a.lab.localeCompare(b.lab))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"></div>
        <div
          className="absolute top-0 -right-4 w-96 h-96 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute -bottom-8 left-20 w-96 h-96 bg-fuchsia-300 dark:bg-fuchsia-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-3">
            <a
              href="/itcs255"
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              title="Back to ITCS255"
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
          <div className="flex items-center gap-2 md:gap-4">
            {!isAdmin ? (
              <a
                href="/admin/login"
                className="px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/60 flex items-center gap-1 md:gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="hidden sm:inline">Admin</span>
              </a>
            ) : (
              <LogoutButton />
            )}
            <ModeToggle />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-7xl px-6 py-16 relative z-10">
        <div className="mx-auto max-w-3xl mb-16 text-center animate-slide-up">
          <h1 className="text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-7xl mb-6">
            ITCS255 <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Score Check</span>
          </h1>
        </div>

        <div className="mx-auto max-w-3xl mb-16 animate-slide-up">
             <div className="border-t border-b border-slate-200 dark:border-slate-800 py-8 text input mb-8">
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Check Your Lab Scores</h2>
                 <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Enter your credential code to view your progress</p>
             </div>
             
             <div className="glass-card p-2 rounded-2xl shadow-lg shadow-purple-500/10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Enter your credential code here" 
                        value={credential}
                        onChange={(e) => setCredential(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-400 text-lg font-medium"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading || !credential.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center shrink-0 shadow-lg shadow-indigo-500/30"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Check Status"}
                </button>
            </form>
        </div>

        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-center font-medium animate-fade-in mb-8">
                {error}
            </div>
        )}

        {scores && (
            <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 animate-scale-in">
                <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                            {scores.name && scores.surname ? 
                                `${scores.name.charAt(0)}${scores.surname.charAt(0)}`.toUpperCase() : 
                                'ID'}
                         </div>
                         <div>
                            <h2 className="text-lg font-bold">
                                {scores.name || scores.surname ? 
                                    `${scores.name || ''} ${scores.surname || ''}` : 
                                    `Student ${searchedId}`}
                            </h2>
                            <p className="text-xs text-blue-400">
                                {scores.Section && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-500 font-bold border border-purple-500/20">
                                        Section: {scores.Section}
                                    </span>
                                )}
                            </p>
                         </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Lab</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Title</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {labRows.length > 0 ? (
                                <>
                                {labRows.map((row) => (
                                    <tr key={row.lab} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-mono">
                                            <span className="inline-block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-400">
                                                {row.lab}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                                            {row.title}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(parseFloat(row.score) || 0, row.totalScore)}`}>
                                                {row.score === '-' ? 'Not Graded' : row.totalScore ? `${row.score}/${row.totalScore}` : row.score}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                </>
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                        No active labs found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
