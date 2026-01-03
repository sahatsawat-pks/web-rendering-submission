"use client"

import type React from "react"

import { useState } from "react"
import { Search, Loader2 } from "lucide-react"

export default function StudentStatusPage() {
  const [studentId, setStudentId] = useState("")
  const [scores, setScores] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchedId, setSearchedId] = useState("")

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId.trim()) return

    setLoading(true)
    setError(null)
    setScores(null)
    setSearchedId(studentId)

    try {
      const res = await fetch(`/api/scores?subject=ITGE162&username=${studentId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.scores) {
            setScores(data.scores)
        } else {
             // If array empty or user not found
             setScores(null)
             setError("Student ID not found in records.")
        }
      } else {
         const errData = await res.json()
         setError(errData.error || "Failed to fetch scores")
      }
    } catch (e) {
      console.error(e)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Parse scores object into array for table
  // API returns object like: { username: "...", "Lab 1": "2", "Lab 2": "1", ... }
  // We need to map this to rows.
  // Assumption: Labs are "Lab 1", "Lab 2", etc.
  const labRows = []
  if (scores) {
      // Find all keys starting with "Lab " but NOT ending with "Feedback"
      Object.keys(scores).forEach(key => {
          if (key.match(/^Lab \d+$/)) {
              const labNum = key.replace("Lab ", "")
              labRows.push({
                  lab: labNum.padStart(2, '0'),
                  title: `Lab Assignment ${labNum}`, // Generic title
                  score: scores[key] || "-"
              })
          }
      })
      labRows.sort((a, b) => a.lab.localeCompare(b.lab))
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
        
        {/* Header */}
        <div className="text-center space-y-4">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                ITGE162 Student Status
            </h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                Check your lab scores and submission status directly from the grading sheet.
            </p>
        </div>

        {/* Search Box */}
        <div className="glass-card p-2 rounded-2xl shadow-lg shadow-teal-500/10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Enter Student ID (e.g. 6488xxx)" 
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder:text-slate-400 text-lg font-medium"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading || !studentId.trim()}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center shrink-0 shadow-lg shadow-teal-500/30"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Check Status"}
                </button>
            </form>
        </div>

        {/* Results Area */}
        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-center font-medium animate-fade-in">
                {error}
            </div>
        )}

        {scores && (
            <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 animate-scale-in">
                <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold">
                            ID
                         </div>
                         <div>
                            <h2 className="text-lg font-bold">Student {searchedId}</h2>
                            <p className="text-xs text-slate-400">Lab Performance Report</p>
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
                                labRows.map((row) => (
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
                                                  row.score === '0' || row.score === '-' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400' :
                                                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                {row.score === '-' ? 'Not Graded' : row.score}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                        No lab scores recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}
