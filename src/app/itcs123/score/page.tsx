"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, ArrowLeft } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"

interface LabRow {
    lab: string;
    title: string;
    score: string;
    challengeScore: string;
}

interface ActiveLab {
    labNumber: string;
    title: string;
}

interface QuizScore {
    id: string
    labNumber: string
    score: number
    totalQuestions: number
    correctAnswers: number
    submittedAt: string
}

function StatusChecker() {
  const [credential, setCredential] = useState("")
  const [scores, setScores] = useState<any | null>(null)
  const [activeLabs, setActiveLabs] = useState<ActiveLab[]>([])
  const [quizScores, setQuizScores] = useState<QuizScore[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchedId, setSearchedId] = useState("")

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!credential.trim()) return

    setLoading(true)
    setError(null)
    setScores(null)
    setQuizScores([])
    setSearchedId("")

    try {
      // First, validate credential and get student ID
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

      // Fetch Scores for ITCS123
      const scoreRes = await fetch(`/api/scores?subject=ITCS123&username=${studentId}`)
      
      // Fetch Active Labs for ITCS123
      const labsRes = await fetch(`/api/labs?subject=ITCS123&activeOnly=true`)

      // Fetch Quiz Scores
      const quizRes = await fetch(`/api/quiz/scores?subject=ITCS123&studentId=${studentId}`)

      if (scoreRes.ok && labsRes.ok) {
        const scoreData = await scoreRes.json()
        const labsData = await labsRes.json()

        if (quizRes.ok) {
            const quizData = await quizRes.json()
            if (quizData.scores) {
                setQuizScores(quizData.scores)
            }
        }

        if (scoreData.scores) {
            setScores(scoreData.scores)
            
            if (labsData.labs) {
                // Filter to only show Lab type (not Challenge) since Challenge scores are already in the table
                setActiveLabs(labsData.labs.filter((lab: any) => (lab.labType || 'Lab') === 'Lab'))
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

  // Parse scores object into array for table
  const labRows: LabRow[] = []
  if (scores && activeLabs.length > 0) {
      activeLabs.forEach(lab => {
          const plainNum = parseInt(lab.labNumber).toString()
          const exactKey = `Lab ${lab.labNumber}`
          const normalizedKey = `Lab ${plainNum}`
          const challengeKey = `Challenge ${plainNum}`
          
          let validKey = null
          if (scores[exactKey] !== undefined) validKey = exactKey
          else if (scores[normalizedKey] !== undefined) validKey = normalizedKey

          const labScoreValue = validKey ? scores[validKey] : undefined;
          const challengeScoreValue = scores[challengeKey];
          labRows.push({
              lab: lab.labNumber.padStart(2, '0'),
              title: lab.title, 
              score: (labScoreValue === undefined || labScoreValue === null || labScoreValue === '') ? '0' : labScoreValue,
              challengeScore: (challengeScoreValue === undefined || challengeScoreValue === null || challengeScoreValue === '') ? '0' : challengeScoreValue
          })
      })
      
      labRows.sort((a, b) => a.lab.localeCompare(b.lab))
  }

  return (
    <div className="w-full">
         {/* Search Box */}
         <div className="glass-card p-2 rounded-2xl shadow-lg shadow-orange-500/10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Enter your credential code here" 
                        value={credential}
                        onChange={(e) => setCredential(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-400 text-lg font-medium"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading || !credential.trim()}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center shrink-0 shadow-lg shadow-orange-500/30"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Check Status"}
                </button>
            </form>
        </div>

        {/* Results Area */}
        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-center font-medium animate-fade-in mb-8">
                {error}
            </div>
        )}

        {scores && (
            <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 animate-scale-in">
                <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm">
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
                            <p className="text-xs text-orange-400">
                                {scores.name || scores.surname ? `ID: ${searchedId}` : "Lab Performance Report"}
                                {scores.Section && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500 font-bold border border-orange-500/20">
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
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Main Score (Max 2)</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Challenge (Max 2)</th>
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
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${row.score === '2' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                                  row.score === '1' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {row.score}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${row.challengeScore === '2' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                                  row.challengeScore === '1' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {row.challengeScore}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {/* Total Score Summary */}
                                {(() => {
                                    const totalScore = labRows.reduce((acc, row) => {
                                        const val = parseFloat(row.score);
                                        return acc + (isNaN(val) ? 0 : val);
                                    }, 0);
                                    
                                    const totalChallenge = labRows.reduce((acc, row) => {
                                        const val = parseFloat(row.challengeScore);
                                        return acc + (isNaN(val) ? 0 : val);
                                    }, 0);
                                    
                                    const maxLabScore = 26; // Maximum possible lab score (13 labs × 2 points)
                                    const maxChallengeScore = 26; // Maximum possible challenge score (13 challenges × 2 points)
                                    const percentage = (totalScore / maxLabScore) * 10; // Lab scores count for 10% only
                                    
                                    return (
                                        <>
                                        <tr className="bg-orange-50 dark:bg-orange-900/20 font-bold border-t-2 border-orange-200 dark:border-orange-800">
                                            <td colSpan={2} className="px-6 py-4 text-right text-slate-900 dark:text-slate-100">
                                                Total Lab Score (Max {maxLabScore})
                                            </td>
                                            <td colSpan={2} className="px-6 py-4 text-right text-orange-600 dark:text-orange-400 text-lg">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">
                                                    ({percentage.toFixed(2)}% / 10%)  
                                                </span>
                                                {totalScore}
                                            </td>
                                        </tr>
                                        <tr className="bg-teal-50 dark:bg-teal-900/20 font-bold border-t-2 border-teal-200 dark:border-teal-800">
                                            <td colSpan={2} className="px-6 py-4 text-right text-slate-900 dark:text-slate-100">
                                                Total Challenge Score (Max {maxChallengeScore})
                                            </td>
                                            <td colSpan={2} className="px-6 py-4 text-right text-teal-600 dark:text-teal-400 text-lg">
                                                {totalChallenge}
                                            </td>
                                        </tr>
                                        </>
                                    );
                                })()}
                                </>
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        No active labs found or student has no scores for active labs.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {quizScores && quizScores.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-3 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Quiz Scores
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Lab</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Score</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {quizScores.map((quiz) => (
                                        <tr key={quiz.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-3 text-slate-900 dark:text-slate-200 font-mono">
                                                <span className="inline-block bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded text-xs font-bold text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                                                    Lab {quiz.labNumber}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold
                                                        ${quiz.score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                                          quiz.score >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                        {quiz.score}%
                                                    </span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-500">
                                                        ({quiz.correctAnswers}/{quiz.totalQuestions})
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right text-xs text-slate-500 font-mono">
                                                {new Date(quiz.submittedAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row gap-4 justify-between items-center bg-opacity-50">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                           <span className="w-2.5 h-2.5 rounded-full bg-red-100 border border-red-200 block"></span>
                           <span>0 = No Submission</span>
                        </div>
                         <div className="flex items-center gap-1.5">
                           <span className="w-2.5 h-2.5 rounded-full bg-yellow-100 border border-yellow-200 block"></span>
                           <span>1 = Submitted but can't explain the code</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <span className="w-2.5 h-2.5 rounded-full bg-green-100 border border-green-200 block"></span>
                           <span>2 = Submitted and truly understands the code</span>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  )
}

export default function ITCS123ScorePage() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        if (data.isAuthenticated) setIsAdmin(true)
      })
      .catch(err => console.error(err))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden animate-fade-in">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-orange-300 dark:bg-orange-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"></div>
        <div
          className="absolute top-0 -right-4 w-96 h-96 bg-amber-300 dark:bg-amber-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute -bottom-8 left-20 w-96 h-96 bg-red-300 dark:bg-red-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <a
              href="/itcs123"
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <img src="/logo.png" alt="Logo" className="h-11 w-11 rounded-xl shadow-lg shadow-orange-500/20" />
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                ITCS123
              </span>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Object Oriented Programming</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isAdmin ? (
              <a
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
                Admin
              </a>
            ) : (
              <LogoutButton />
            )}
            <ModeToggle />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-7xl px-6 py-16 relative z-10">
        {/* Hero Section */}
        <div className="mx-auto max-w-3xl mb-16 text-center animate-slide-up">
          <h1 className="text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-7xl mb-6">
            ITCS123 <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Score Check</span>
          </h1>
        </div>

        {/* --- STUDENT STATUS CHECKER --- */}
        <div className="mx-auto max-w-3xl mb-16 animate-slide-up">
             <div className="border-t border-b border-slate-200 dark:border-slate-800 py-8 text-center mb-8">
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Check Your Lab Scores</h2>
                 <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Enter your credential code to view your progress</p>
             </div>
             
             <StatusChecker />
        </div>
      </main>
    </div>
  )
}
