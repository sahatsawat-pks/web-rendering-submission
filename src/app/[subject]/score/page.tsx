"use client"

import React, { useState, useEffect } from "react"
import { Search, Loader2, ArrowLeft } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import Footer from "@/components/Footer"
import { useParams, useRouter, notFound } from "next/navigation"
import { getSubjectConfig, isValidSubjectAsync, SubjectConfig } from "@/lib/subjectConfig"
import { fetchSubjectConfig } from "@/lib/subjectConfigCache"

interface LabRow {
    lab: string
    title: string
    score: string
    totalScore?: number
    challengeScore?: string
    challengeTotalScore?: number
    feedback?: string
    // Criteria scoring
    ethics?: string
    understanding?: string
    reflection?: string
    isCriteria?: boolean
}

interface MultiQuestionLabRow {
    lab: string
    title: string
    isMultiQuestion: true
    questions: { [key: string]: string } // e.g., { "Q1": "2", "Q2": "1" }
    totalScore?: number
}

type LabRowType = LabRow | MultiQuestionLabRow

interface ActiveLab {
    labNumber: string
    title: string
    totalScore?: number
    labType?: string
    subQuestions?: string
    challengeEnabled?: boolean
    isActive?: boolean
}

interface QuizScore {
    id: string
    labNumber: string
    score: number
    totalQuestions: number
    correctAnswers: number
    submittedAt: string
}

// Helper function to calculate gradient color based on score percentage
function getScoreColor(score: number, maxScore: number | undefined): string {
  if (!maxScore || maxScore === 0) {
    // Default behavior when no totalScore is set
    if (score === 2) return 'text-green-500 dark:text-green-400 font-bold';
    if (score === 1) return 'text-yellow-500 dark:text-yellow-400 font-bold';
    if (score === 0) return 'text-red-500 dark:text-red-400 font-bold';
    return 'text-slate-500 dark:text-slate-400';
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

// Simple dot component for legend
function StatusDot({ color }: { color: string }) {
    return <div className={`w-3 h-3 rounded-full ${color} mr-2`} />
}

function StatusChecker({ subject, config, isAdmin = false }: { subject: string, config: SubjectConfig, isAdmin?: boolean }) {
  const [credential, setCredential] = useState("")
  const [scores, setScores] = useState<any | null>(null)
  const [activeLabs, setActiveLabs] = useState<ActiveLab[]>([])
  const [quizScores, setQuizScores] = useState<QuizScore[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchedId, setSearchedId] = useState("")

  // Determine grading types
  const isLabChallenge = config.grading?.hasChallenge === true
  const isPythonSqlMultiCriteria = config.grading?.showCumulativeScore === false
  const isNormal = config.grading?.showCumulativeScore === true && !config.grading?.hasChallenge
  const isPythonOrSql = subject === 'ITCS251' || subject === 'ITCS255'
  
  const assignmentLabel = isPythonOrSql ? 'Week' : 'Lab'

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!credential.trim()) return

    setLoading(true)
    setError(null)
    setScores(null)
    setQuizScores([])
    setSearchedId("")

    try {
      // Credential check logic
      const credentialRes = await fetch(`/api/credentials?credential=${credential.trim()}`)
      let studentId = "";
      
      if (credentialRes.ok) {
        const credentialData = await credentialRes.json()
        if (credentialData.success && credentialData.studentId) {
            studentId = credentialData.studentId
        }
      }
      
      // Fallback
      if (!studentId) {
          const allCredRes = await fetch(`/api/credentials`)
          if (allCredRes.ok) {
              const allCredData = await allCredRes.json()
              const match = allCredData.credentials?.find((c: any) => 
                  c.credential.toUpperCase() === credential.trim().toUpperCase()
              )
              if (match) {
                  studentId = match.studentId
              }
          }
      }

      if (!studentId) {
        // If user is admin, allow searching by Student ID directly
        if (isAdmin) {
             studentId = credential.trim();
        } else {
             setError("Invalid credential code. Please check your code and try again.")
             setLoading(false)
             return
        }
      }

      setSearchedId(studentId)

      const scoreRes = await fetch(`/api/scores?subject=${subject}&username=${studentId}&bypassCache=true&t=${Date.now()}`)
      const labsRes = await fetch(`/api/labs?subject=${subject}&activeOnly=true`)

      let quizRes;
      if (config.hasQuiz) {
          quizRes = await fetch(`/api/quiz/scores?subject=${subject}&studentId=${studentId}`)
      }

      if (scoreRes.ok && labsRes.ok) {
        const scoreData = await scoreRes.json()
        const labsData = await labsRes.json()

        if (quizRes && quizRes.ok) {
            const quizData = await quizRes.json()
            if (quizData.scores) setQuizScores(quizData.scores)
        }

        if (scoreData.scores) {
            setScores(scoreData.scores)
            
            if (labsData.labs) {
                // For Lab & Challenge subjects, we only want to show rows for "Lab" type labs
                // The "Challenge" scores are columns in the same row
                if (isLabChallenge) {
                    setActiveLabs(labsData.labs.filter((lab: ActiveLab) => (lab.labType || 'Lab') === 'Lab'))
                } else {
                    setActiveLabs(labsData.labs)
                }
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

  const labRows: LabRowType[] = []
  
  if (scores && activeLabs.length > 0) {
      activeLabs.forEach(lab => {
          // If in Lab & Challenge mode, we already filtered out separate Challenge rows in handleSearch
          // But we need to make sure we don't accidentally process them if logic changes
          if (isLabChallenge && lab.labType === 'Challenge') return;

          // Check if this is a multi-question lab
          const isMultiQuestion = lab.subQuestions && lab.subQuestions.trim() !== ''
          
          if (isMultiQuestion) {
              try {
                  const subQuestions = JSON.parse(lab.subQuestions!)
                  const questions: { [key: string]: string } = {}
                  
                  // Get the lab number as integer
                  const labNum = parseInt(lab.labNumber).toString()
                  
                  // Find all available question columns for this lab in the scores
                  const availableQuestionKeys = Object.keys(scores).filter(key => 
                      key.startsWith(`l${labNum}-q`)
                  )
                  
                  // Extract question numbers from available keys
                  const availableQuestions = availableQuestionKeys.map(key => {
                      const match = key.match(/^l\d+-q(\d+)$/)
                      return match ? match[1] : null
                  }).filter(q => q !== null).sort((a, b) => parseInt(a!) - parseInt(b!))
                  
                  // Use available questions instead of configured subQuestions
                  availableQuestions.forEach((questionNum) => {
                      const qKey = `l${labNum}-q${questionNum}`
                      questions[`Q${questionNum}`] = scores[qKey] !== undefined && scores[qKey] !== null && scores[qKey] !== '' 
                          ? scores[qKey].toString() 
                          : '0'
                  })
                  
                  labRows.push({
                      lab: lab.labNumber.padStart(2, '0'),
                      title: lab.title,
                      isMultiQuestion: true,
                      questions,
                      totalScore: lab.totalScore
                  } as MultiQuestionLabRow)
              } catch (e) {
                  // Fall back to regular lab processing if parsing fails
                  processRegularLab(lab, scores, labRows)
              }
          } else {
              processRegularLab(lab, scores, labRows)
          }
      })
      
      labRows.sort((a, b) => a.lab.localeCompare(b.lab))
  }
  
  function processRegularLab(lab: any, scores: any, labRows: LabRowType[]) {
          const plainNum = parseInt(lab.labNumber).toString()
          
          // Check for criteria scoring columns
          // For tab-per-lab subjects (ITCS258): "Lab 1 Ethics", "Lab 2 Ethics", etc.
          // For single-sheet subjects (ITCS362): "Ethics", "Code Understanding", "Reflection"
          
          // Try lab-specific criteria columns first (tab-per-lab format)
          let ethicsKey = `Lab ${plainNum} Ethics`
          let understandingKey = `Lab ${plainNum} Code Understanding`
          let reflectionKey = `Lab ${plainNum} Reflection`
          
          let hasEthics = scores[ethicsKey] !== undefined
          let hasUnderstanding = scores[understandingKey] !== undefined
          let hasReflection = scores[reflectionKey] !== undefined
          
          // If not found, try plain column names (single-sheet format)
          if (!hasEthics && !hasUnderstanding && !hasReflection) {
              ethicsKey = 'Ethics'
              understandingKey = 'Code Understanding'
              reflectionKey = 'Reflection'
              
              hasEthics = scores[ethicsKey] !== undefined
              hasUnderstanding = scores[understandingKey] !== undefined
              hasReflection = scores[reflectionKey] !== undefined
          }
          
          // If any criteria columns exist, this is a criteria-based lab
          if (hasEthics || hasUnderstanding || hasReflection) {
              labRows.push({
                  lab: lab.labNumber.padStart(2, '0'),
                  title: lab.title,
                  score: '0', // Not used for criteria
                  totalScore: lab.totalScore,
                  ethics: (scores[ethicsKey] === undefined || scores[ethicsKey] === null || scores[ethicsKey] === '') ? '0' : scores[ethicsKey],
                  understanding: (scores[understandingKey] === undefined || scores[understandingKey] === null || scores[understandingKey] === '') ? '0' : scores[understandingKey],
                  reflection: (scores[reflectionKey] === undefined || scores[reflectionKey] === null || scores[reflectionKey] === '') ? '0' : scores[reflectionKey],
                  isCriteria: true,
                  isMultiQuestion: false
              } as LabRow)
              return
          }
          
          // For ITCS251/ITCS255, look for "W X" format instead of "Lab X"
          let exactKey, normalizedKey, inClassKey, inClassKeyNormalized;
          
          if (isPythonOrSql) {
              exactKey = `W ${lab.labNumber}`
              normalizedKey = `W ${plainNum}`
              inClassKey = `In-Class ${lab.labNumber}`
              inClassKeyNormalized = `In-Class ${plainNum}`
          } else {
              exactKey = `Lab ${lab.labNumber}`
              normalizedKey = `Lab ${plainNum}`
              inClassKey = `In-Class ${lab.labNumber}`
              inClassKeyNormalized = `In-Class ${plainNum}`
          }
          
          // Challenge Mapping
          const chKeyExact = `Challenge ${lab.labNumber}`
          const chKeyNorm = `Challenge ${plainNum}`
          const chKeyShort = `Ch ${plainNum}` 
          const chKeyShortExact = `Ch ${lab.labNumber}`
          
          let validKey = null
          if (scores[exactKey] !== undefined) validKey = exactKey
          else if (scores[normalizedKey] !== undefined) validKey = normalizedKey

          // Check for In-Class status
          let inClassStatus = false
          if (scores[inClassKey] && String(scores[inClassKey]).toUpperCase() === 'TRUE') inClassStatus = true
          else if (scores[inClassKeyNormalized] && String(scores[inClassKeyNormalized]).toUpperCase() === 'TRUE') inClassStatus = true

          let scoreValue = validKey ? scores[validKey] : undefined
          
          // Automatic full score logic if In-Class is checked
          if (inClassStatus && (scoreValue === undefined || scoreValue === null || scoreValue === '' || scoreValue === '0')) {
              if (lab.totalScore) scoreValue = lab.totalScore.toString()
          }

          // Challenge Score Logic (not applicable for Python/SQL)
          let chScoreValue: string | undefined = undefined;
          
          // Check if challenge is enabled for this lab
          const challengeEnabled = lab.challengeEnabled !== false && lab.isActive !== false;
          
          if (!isPythonOrSql && challengeEnabled) {
              if (scores[chKeyExact] !== undefined) chScoreValue = scores[chKeyExact]
              else if (scores[chKeyNorm] !== undefined) chScoreValue = scores[chKeyNorm]
              else if (scores[chKeyShort] !== undefined) chScoreValue = scores[chKeyShort]
              else if (scores[chKeyShortExact] !== undefined) chScoreValue = scores[chKeyShortExact]
          }
          else if (scores[chKeyShortExact] !== undefined && challengeEnabled) chScoreValue = scores[chKeyShortExact]

          labRows.push({
              lab: lab.labNumber.padStart(2, '0'),
              title: lab.title, 
              score: (scoreValue === undefined || scoreValue === null || scoreValue === '') ? '0' : scoreValue,
              totalScore: lab.totalScore,
              challengeScore: challengeEnabled ? ((chScoreValue === undefined || chScoreValue === null || chScoreValue === '') ? '0' : chScoreValue) : '-',
              challengeTotalScore: lab.totalScore, // Assuming challenge has same max weight? usually 2?
              isCriteria: false,
              isMultiQuestion: false
          } as LabRow)
      }
  
  // Type guard functions
  function isMultiQuestionLab(row: LabRowType): row is MultiQuestionLabRow {
      return 'isMultiQuestion' in row && row.isMultiQuestion === true
  }

  // Render Logic for Lab & Challenge Review
  if (isLabChallenge && scores) {
      // Use config value if available, otherwise calculate based on active labs
      const maxLabScore = config.grading?.labMaxScore || (activeLabs.length * 2); // Use database value or calculate dynamically
      // Only count labs where challenge is enabled and active
      const enabledChallengesCount = activeLabs.filter(lab => lab.challengeEnabled !== false && lab.isActive !== false).length;
      const maxChallengeScore = enabledChallengesCount * 2; // Maximum possible challenge score (enabled challenges × 2 points)
      
      // Calculate totals
      const totalLab = labRows.reduce((acc, row) => {
          if (isMultiQuestionLab(row)) {
              // Sum all question scores for multi-question labs
              const questionTotal = Object.values(row.questions).reduce((qAcc, qScore) => {
                  const val = parseFloat(qScore)
                  return qAcc + (isNaN(val) ? 0 : val)
              }, 0)
              return acc + questionTotal
          } else {
              const val = parseFloat(row.score);
              return acc + (isNaN(val) ? 0 : val);
          }
      }, 0);
      
      const totalCh = labRows.reduce((acc, row) => {
          if (isMultiQuestionLab(row)) {
              return acc; // Multi-question labs don't have challenge scores in this context
          } else {
              // Skip disabled challenges (marked as '-')
              if (row.challengeScore === '-') return acc;
              const val = parseFloat(row.challengeScore || '0');
              return acc + (isNaN(val) ? 0 : val);
          }
      }, 0);
      
      const labPercentage = (totalLab / maxLabScore) * 10; // Lab scores count for 10% only

      return (
        <div className="w-full">
            <div className={`glass-card p-2 rounded-2xl shadow-lg shadow-orange-500/10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8`}>
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder={isAdmin ? "Enter credential code or Student ID" : "Enter your credential code here"}
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

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-center font-medium animate-fade-in mb-8">
                    {error}
                </div>
            )}

            {/* Profile Header */}
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

                {/* Score Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{assignmentLabel}</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Title</th>
                                {isPythonOrSql ? (
                                    <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Score</th>
                                ) : (
                                    <>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Main Score (Max 2)</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Challenge (Max 2)</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {labRows.length > 0 ? (
                                <>
                                {labRows.map((row) => (
                                    <React.Fragment key={row.lab}>
                                        {isMultiQuestionLab(row) ? (
                                            // Multi-question lab row
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-mono" rowSpan={Object.keys(row.questions).length + 1}>
                                                    <span className="inline-block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-400">
                                                        {row.lab}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium" rowSpan={Object.keys(row.questions).length + 1}>
                                                    {row.title}
                                                    <div className="mt-1">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                                            Multi-Question
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right" colSpan={2}>
                                                    <div className="space-y-1">
                                                        {Object.entries(row.questions).map(([question, score]) => (
                                                            <div key={question} className="flex justify-between items-center">
                                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{question}:</span>
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2
                                                                    ${'2' === score ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                                                      '1' === score ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                    {score}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            // Regular lab row
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                                                    {row.challengeScore === '-' ? (
                                                        <span className="text-slate-400 dark:text-slate-500 font-medium">-</span>
                                                    ) : (
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                            ${row.challengeScore === '2' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                                              row.challengeScore === '1' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                            {row.challengeScore}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {/* Total Score Summary */}
                                <tr className="bg-orange-50 dark:bg-orange-900/20 font-bold border-t-2 border-orange-200 dark:border-orange-800">
                                    <td colSpan={2} className="px-6 py-4 text-right text-slate-900 dark:text-slate-100">
                                        Total {assignmentLabel} Score (Max {maxLabScore})
                                    </td>
                                    <td colSpan={2} className="px-6 py-4 text-right text-orange-600 dark:text-orange-400 text-lg">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">
                                            ({labPercentage.toFixed(2)}% / 10%)  
                                        </span>
                                        {totalLab}
                                    </td>
                                </tr>
                                <tr className="bg-teal-50 dark:bg-teal-900/20 font-bold border-t-2 border-teal-200 dark:border-teal-800">
                                    <td colSpan={2} className="px-6 py-4 text-right text-slate-900 dark:text-slate-100">
                                        Total Challenge Score (Max {maxChallengeScore})
                                    </td>
                                    <td colSpan={2} className="px-6 py-4 text-right text-teal-600 dark:text-teal-400 text-lg">
                                        {totalCh}
                                    </td>
                                </tr>
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
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">{assignmentLabel}</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Score</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {quizScores.map((quiz) => (
                                        <tr key={quiz.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-3 text-slate-900 dark:text-slate-200 font-mono">
                                                <span className="inline-block bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded text-xs font-bold text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                                                    {assignmentLabel} {quiz.labNumber}
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
                
                {/* Legend */}
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
        </div>
      );
  }

  // --- STANDARD UI (unchanged) ---
  const primaryColor = config.accentColor.split(' ')[0].replace('text-', 'text-');
  
  return (
    <div className="w-full">
         <div className={`glass-card p-2 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8 ${config.shadowColor}`}>
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Enter your credential code here" 
                        value={credential}
                        onChange={(e) => setCredential(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-opacity-50 outline-none transition-all placeholder:text-slate-400 text-lg font-medium"
                        style={{ '--tw-ring-color': 'var(--accent-color)' } as React.CSSProperties} 
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={loading || !credential.trim()}
                    className={`text-white font-bold py-4 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center shrink-0 shadow-lg bg-gradient-to-r ${config.gradientFrom.replace('/5', '')} ${config.gradientTo.replace('/5', '')}`}
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
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${config.iconBg} ${config.iconColor}`}>
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
                            <p className={`text-xs ${config.accentColorDark} flex items-center gap-2 mt-1`}>
                                <span className="font-mono opacity-80">ID: {searchedId}</span>
                                {scores.Section && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 font-bold border border-white/20">
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
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{assignmentLabel}</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Title</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {labRows.length > 0 ? (
                                <>
                                {labRows.map((row) => (
                                    <React.Fragment key={row.lab}>
                                        {isMultiQuestionLab(row) ? (
                                            // Multi-question lab row
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-mono">
                                                    <span className="inline-block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-400">
                                                        {row.lab}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                                                    {row.title}
                                                    <div className="mt-1">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                                            Multi-Question
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="space-y-1">
                                                        {Object.entries(row.questions).map(([question, score]) => (
                                                            <div key={question} className="flex justify-between items-center">
                                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{question}:</span>
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getScoreColor(parseFloat(score) || 0, row.totalScore)}`}>
                                                                    {score === '-' ? 'Not Graded' : 
                                                                     score === '-1' && (subject === 'ITCS251' || subject === 'ITCS255') ? `0${row.totalScore ? `/${row.totalScore}` : ''}` :
                                                                     `${score}${row.totalScore ? `/${row.totalScore}` : ''}`}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : row.isCriteria ? (
                                            // Criteria-based lab row
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-mono">
                                                    <span className="inline-block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-400">
                                                        {row.lab}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                                                    {row.title}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ethics:</span>
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getScoreColor(parseFloat(row.ethics || '0') || 0, 2)}`}>
                                                                {row.ethics}/2
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Code Understanding:</span>
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getScoreColor(parseFloat(row.understanding || '0') || 0, 2)}`}>
                                                                {row.understanding}/2
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reflection:</span>
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getScoreColor(parseFloat(row.reflection || '0') || 0, 2)}`}>
                                                                {row.reflection}/2
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            // Regular lab row
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                                                        {row.score === '-' ? 'Not Graded' : 
                                                         row.score === '-1' && (subject === 'ITCS251' || subject === 'ITCS255') ? `0${row.totalScore ? `/${row.totalScore}` : ''}` :
                                                         `${row.score}${row.totalScore ? `/${row.totalScore}` : ''}`}
                                                    </span>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                
                                {/* Conditional Total Score Display based on grading type */}
                                {isNormal && config.grading?.showCumulativeScore && subject !== 'ITCS251' && subject !== 'ITCS255' && (() => {
                                    // Check if any labs are multi-question or criteria-based
                                    const hasMultiQuestionOrCriteria = labRows.some(row => 
                                        isMultiQuestionLab(row) || row.isCriteria
                                    );
                                    
                                    // Don't show total score for multi-question or criteria subjects
                                    if (hasMultiQuestionOrCriteria) {
                                        return null;
                                    }
                                    
                                    // Calculate total {assignmentLabel} score
                                    const totalLabScore = labRows.reduce((acc, row) => {
                                        if (isMultiQuestionLab(row)) {
                                            // Sum all question scores for multi-question labs
                                            // Each question in multi-question labs contributes to the total
                                            // For example: Lab 1 with Q1(2) + Q2(2) + Q3(2) = 6 total
                                            const questionTotal = Object.values(row.questions).reduce((qAcc, qScore) => {
                                                const val = parseFloat(qScore)
                                                return qAcc + (isNaN(val) ? 0 : val)
                                            }, 0)
                                            return acc + questionTotal
                                        } else {
                                            const val = parseFloat(row.score);
                                            return acc + (isNaN(val) ? 0 : val);
                                        }
                                    }, 0);
                                    
                                    // Calculate max {assignmentLabel} score
                                    // For multi-question labs: this represents the max possible score across all questions in all labs
                                    // The percentage shows: (actualScore/maxScore) * labWeight
                                    // Example: 38 out of 30 max = 126.67% efficiency, worth 20% of final grade
                                    const maxLabScore = config.grading.labMaxScore || labRows.length * 2;
                                    
                                    // Calculate percentage
                                    const labWeight = config.grading.labWeight || 20;
                                    const percentage = maxLabScore > 0 ? (totalLabScore / maxLabScore) * labWeight : 0;

                                    return (
                                        <>
                                            <tr className="bg-slate-50 dark:bg-slate-900/80 font-bold border-t border-slate-200 dark:border-slate-700">
                                                <td colSpan={2} className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
                                                    Total Score (Max {maxLabScore})
                                                </td>
                                                <td className={`px-6 py-4 text-right ${config.accentColor}`}>
                                                    <span className="text-lg">{totalLabScore}</span> <span className="text-xs text-slate-500 font-normal ml-1">({percentage.toFixed(2)}% / {labWeight}%)</span>
                                                </td>
                                            </tr>
                                            <tr className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700">
                                                <td colSpan={3} className="px-6 py-3">
                                                    <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-red-200 dark:bg-red-500/30 border border-red-500/50"></div>
                                                            <span>0 = No Submission</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-yellow-200 dark:bg-yellow-500/30 border border-yellow-500/50"></div>
                                                            <span>1 = Incomplete</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-green-200 dark:bg-green-500/30 border border-green-500/50"></div>
                                                            <span>2 = Complete</span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </>
                                    );
                                })()}

                                {/* Python/SQL/Multi-Question/Criteria Grading: No total score display */}
                                {isPythonSqlMultiCriteria && (
                                    <tr className="bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700">
                                        <td colSpan={3} className="px-6 py-3">
                                            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-red-200 dark:bg-red-500/30 border border-red-500/50"></div>
                                                    <span>0 = No Submission</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-yellow-200 dark:bg-yellow-500/30 border border-yellow-500/50"></div>
                                                    <span>1 = Incomplete</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-green-200 dark:bg-green-500/30 border border-green-500/50"></div>
                                                    <span>2 = Complete</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )} 
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

                {quizScores && quizScores.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-800">
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-3 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <svg className={`w-4 h-4 ${config.accentColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Practice Question Scores
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">{assignmentLabel}</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Score</th>
                                        <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {quizScores.map((quiz) => (
                                        <tr key={quiz.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-3 text-slate-900 dark:text-slate-200 font-mono">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${config.iconBg} ${config.iconColor} border-opacity-30`}>
                                                    {assignmentLabel} {quiz.labNumber}
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
            </div>
        )}
    </div>
  )
}

export default function SubjectScorePage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isValidSubject, setIsValidSubject] = useState<boolean | null>(null)
  const params = useParams()
  const router = useRouter()
  const subject = typeof params?.subject === 'string' ? params.subject : ""

  /* REMOVED: const config = subject ? getSubjectConfig(subject) : null */
  const [config, setConfig] = useState<SubjectConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Static fallback
  const staticConfig = subject ? getSubjectConfig(subject) : null

  useEffect(() => {
    if (subject) {
      // Check if subject is valid first
      isValidSubjectAsync(subject).then(valid => {
        setIsValidSubject(valid)
        if (!valid) {
          notFound()
          return
        }
        
        // If valid, fetch the config
        return fetchSubjectConfig(subject)
      }).then(data => {
        if (data) setConfig(data)
        else if (staticConfig) setConfig(staticConfig)
        else notFound()
      }).catch(err => {
        console.error(err)
        if (staticConfig) setConfig(staticConfig)
      }).finally(() => setLoadingConfig(false))
    }
  }, [subject, staticConfig])
  
  useEffect(() => {
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        if (data.isAuthenticated) setIsAdmin(true)
      })
      .catch(err => console.error(err))
  }, [subject, router])

  if (loadingConfig || !config || isValidSubject === null) return null

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} relative overflow-hidden animate-fade-in`}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 -left-4 w-72 sm:w-96 h-72 sm:h-96 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float bg-current ${config.accentColor.replace('text-', 'text-')}`}></div>
      </div>

      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-3">
            <a
              href={`/${subject}`}
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              title={`Back to ${config.code}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <img src="/logo.png" alt="Logo" className={`h-9 w-9 md:h-11 md:w-11 rounded-xl shadow-lg ${config.shadowColor}`} />
            <div>
              <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {config.code}
              </span>
              <p className={`text-xs ${config.accentColor} font-medium hidden sm:block`}>{config.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {!isAdmin ? (
              <a
                href="/admin/login"
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:${config.accentColor} transition-colors rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/60 flex items-center gap-1 md:gap-2`}
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
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl mb-4">
            {config.code} <span className={`bg-clip-text text-transparent bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo}`}>Score Check</span>
          </h1>
        </div>

        <div className="mx-auto max-w-3xl mb-16 animate-slide-up">
             <div className="border-t border-b border-slate-200 dark:border-slate-800 py-6 text-center mb-6 sm:mb-8">
                 <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Check Your Lab Scores</h2>
                 <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Enter your credential code to view your progress</p>
             </div>
             
             <StatusChecker subject={config.code} config={config} isAdmin={isAdmin} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
