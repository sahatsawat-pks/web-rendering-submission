"use client"

import { cn } from "@/lib/utils"
import { useMemo, memo } from "react"

interface QuizNavigationProps {
  totalQuestions: number
  currentQuestion: number
  answeredQuestions: Set<number>
  onQuestionSelect: (index: number) => void
  categories?: { id: string; name: string; questionIds?: string[] }[]
  questions?: any[]
}

export const QuizNavigation = memo(function QuizNavigation({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  onQuestionSelect,
  categories,
  questions
}: QuizNavigationProps) {
  const groupedQuestions = useMemo(() => {
    if (!categories || !questions) {
      return [{ category: null, indices: Array.from({ length: totalQuestions }, (_, i) => i) }]
    }

    const result: Array<{ category: { id: string; name: string; questionIds?: string[] } | null; indices: number[] }> = []
    const categorizedIndices = new Set<number>()

    categories.forEach(cat => {
      const indices: number[] = []
      questions.forEach((q, idx) => {
        if (q.category === cat.id) {
          indices.push(idx)
          categorizedIndices.add(idx)
        }
      })
      if (indices.length > 0) {
        result.push({ category: cat, indices })
      }
    })

    // Add uncategorized questions
    const uncategorized: number[] = []
    for (let idx = 0; idx < questions.length; idx++) {
      if (!categorizedIndices.has(idx)) {
        uncategorized.push(idx)
      }
    }

    if (uncategorized.length > 0) {
      result.push({ category: null, indices: uncategorized })
    }

    return result
  }, [categories, questions, totalQuestions])

  return (
    <div className="glass-card p-6 sticky top-28 shadow-xl border-2 border-slate-200/50 dark:border-slate-700/50">
      <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
        <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Question Navigator
      </h3>
      
      <div className="space-y-6">
        {groupedQuestions.map((group, groupIdx) => (
          <div key={groupIdx}>
            {group.category && (
              <h4 className="text-sm font-bold text-teal-700 dark:text-teal-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {group.category.name}
              </h4>
            )}
            <div className="flex flex-wrap gap-2">
              {group.indices.map((index) => (
                <button
                  key={index}
                  onClick={() => onQuestionSelect(index)}
                  className={cn(
                    "w-12 h-12 rounded-lg font-semibold text-sm transition-all hover:scale-110 shadow-sm",
                    currentQuestion === index && "ring-2 ring-offset-2 ring-teal-400 dark:ring-teal-500 scale-105",
                    answeredQuestions.has(index)
                      ? currentQuestion === index
                        ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/40"
                        : "bg-teal-100 dark:bg-teal-900/30 border-2 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:shadow-md hover:border-teal-400 dark:hover:border-teal-600"
                      : currentQuestion === index
                      ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/40"
                      : "bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-slate-200 dark:hover:bg-slate-750"
                  )}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/30"></div>
            <span className="text-slate-600 dark:text-slate-400">Current</span>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">1</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-100 dark:bg-teal-900/30 border-2 border-teal-300 dark:border-teal-700"></div>
            <span className="text-slate-600 dark:text-slate-400">Answered</span>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{answeredQuestions.size}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700"></div>
            <span className="text-slate-600 dark:text-slate-400">Unanswered</span>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{totalQuestions - answeredQuestions.size}</span>
        </div>
      </div>
    </div>
  )
})
