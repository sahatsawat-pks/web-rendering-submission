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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quiz navigation</h3>
      
      <div className="space-y-6">
        {groupedQuestions.map((group, groupIdx) => (
          <div key={groupIdx}>
            {group.category && (
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                {group.category.name}
              </h4>
            )}
            <div className="flex flex-wrap gap-2">
              {group.indices.map((index) => (
                <button
                  key={index}
                  onClick={() => onQuestionSelect(index)}
                  className={cn(
                    "w-12 h-12 rounded-lg border-2 font-semibold text-sm transition-all hover:scale-105",
                    currentQuestion === index && "ring-4 ring-offset-2",
                    answeredQuestions.has(index)
                      ? currentQuestion === index
                        ? "bg-blue-600 border-blue-600 text-white ring-blue-200 dark:ring-blue-800"
                        : "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300"
                      : currentQuestion === index
                      ? "bg-blue-600 border-blue-600 text-white ring-blue-200 dark:ring-blue-800"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500"
                  )}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-6 h-6 rounded bg-green-100 dark:bg-green-900/30 border-2 border-green-500"></div>
          <span className="text-slate-600 dark:text-slate-400">Answered</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-6 h-6 rounded bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600"></div>
          <span className="text-slate-600 dark:text-slate-400">Not answered</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-6 h-6 rounded bg-blue-600 border-2 border-blue-600"></div>
          <span className="text-slate-600 dark:text-slate-400">Current</span>
        </div>
      </div>
    </div>
  )
})
