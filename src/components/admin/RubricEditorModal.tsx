"use client"

import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, GripVertical, Star, Pencil, Check, RotateCcw } from 'lucide-react'

export interface RubricLevel {
  score: number
  description: string
}

interface RubricEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (levels: RubricLevel[]) => void
  initialLevels: RubricLevel[]
  color?: string
}

const DEFAULT_LEVELS: RubricLevel[] = [
  { score: 0, description: 'Not Submitted' },
  { score: 1, description: 'Partial' },
  { score: 2, description: 'Complete' },
]

export default function RubricEditorModal({
  isOpen,
  onClose,
  onSave,
  initialLevels,
  color,
}: RubricEditorModalProps) {
  const [levels, setLevels] = useState<RubricLevel[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const [removingIndex, setRemovingIndex] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLevels(initialLevels.length > 0 ? [...initialLevels] : [...DEFAULT_LEVELS])
      setEditingIndex(null)
      setRemovingIndex(null)
    }
  }, [isOpen, initialLevels])

  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingIndex])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (editingIndex !== null) {
          setEditingIndex(null)
        } else {
          onClose()
        }
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, editingIndex, onClose])

  if (!isOpen) return null

  // Tier color mapping
  const tierColors = [
    { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800', badge: 'bg-red-500', dot: 'bg-red-400' },
    { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-500', dot: 'bg-amber-400' },
    { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-500', dot: 'bg-emerald-400' },
    { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-500', dot: 'bg-blue-400' },
    { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', badge: 'bg-violet-500', dot: 'bg-violet-400' },
    { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800', badge: 'bg-pink-500', dot: 'bg-pink-400' },
  ]

  function getTier(index: number) {
    if (levels.length <= 1) return tierColors[2]
    const ratio = index / (levels.length - 1)
    const tierIndex = Math.round(ratio * (tierColors.length - 1))
    return tierColors[tierIndex]
  }

  function startEditing(index: number) {
    setEditingIndex(index)
    setEditValue(levels[index].description)
  }

  function saveEdit() {
    if (editingIndex === null) return
    const updated = [...levels]
    updated[editingIndex].description = editValue.trim() || updated[editingIndex].description
    setLevels(updated)
    setEditingIndex(null)
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      setEditingIndex(null)
    }
  }

  function addLevel() {
    const nextScore = levels.length > 0 ? levels[levels.length - 1].score + 1 : 0
    setLevels([...levels, { score: nextScore, description: '' }])
    // Auto-focus the new level for editing
    setTimeout(() => {
      setEditingIndex(levels.length)
      setEditValue('')
    }, 50)
  }

  function removeLevel(index: number) {
    if (levels.length <= 1) return
    setRemovingIndex(index)
    setTimeout(() => {
      const updated = levels.filter((_, i) => i !== index)
      // Re-number scores sequentially
      updated.forEach((level, i) => { level.score = i })
      setLevels(updated)
      setRemovingIndex(null)
      if (editingIndex === index) setEditingIndex(null)
      else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1)
    }, 280)
  }

  function resetToDefault() {
    setLevels([...DEFAULT_LEVELS])
    setEditingIndex(null)
  }

  function handleSave() {
    onSave(levels)
    onClose()
  }

  function getScoreLabel(index: number) {
    if (levels.length <= 1) return 'Score Level'
    if (index === 0) return 'Lowest'
    if (index === levels.length - 1) return 'Highest'
    return 'Intermediate'
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 animate-scale-in transform transition-all duration-300 ease-out my-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 sm:p-5 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  Edit Grading Rubric
                </h3>
                <p className="text-violet-200 text-xs sm:text-sm">
                  Customize score levels and descriptions
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 flex-shrink-0"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Summary */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Levels</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{levels.length}</p>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Range</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {levels.length > 0 ? `${levels[0].score} → ${levels[levels.length - 1].score}` : '—'}
                </p>
              </div>
            </div>
            <button
              onClick={resetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              title="Reset to default (0-2)"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Score Level Cards */}
          <div className="space-y-2 mb-4">
            {levels.map((level, index) => {
              const tier = getTier(index)
              const isRemoving = removingIndex === index
              const isEditing = editingIndex === index

              return (
                <div
                  key={`${level.score}-${index}`}
                  className={`group relative rounded-xl border transition-all duration-300 ${tier.border} ${tier.bg} ${
                    isRemoving ? 'opacity-0 translate-x-8 scale-95' : 'opacity-100 translate-x-0 scale-100'
                  }`}
                >
                  {/* Left accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${tier.badge}`} />

                  <div className="pl-4 pr-3 py-3">
                    <div className="flex items-center gap-3">
                      {/* Score badge */}
                      <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${tier.badge} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{level.score}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                          {getScoreLabel(index)}
                        </p>

                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={saveEdit}
                              placeholder="Enter description..."
                              className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-violet-300 dark:border-violet-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-sm"
                            />
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={saveEdit}
                              className="flex-shrink-0 w-7 h-7 rounded-md bg-violet-500 hover:bg-violet-600 text-white flex items-center justify-center transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p
                            className={`text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity ${tier.text} ${!level.description ? 'italic opacity-60' : ''}`}
                            onClick={() => startEditing(index)}
                            title="Click to edit"
                          >
                            {level.description || 'Click to add description...'}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => startEditing(index)}
                          className="w-7 h-7 rounded-md hover:bg-white/50 dark:hover:bg-slate-600/50 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          title="Edit description"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeLevel(index)}
                          disabled={levels.length <= 1}
                          className="w-7 h-7 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Remove level"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add Level Button */}
          <button
            onClick={addLevel}
            className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 hover:border-violet-400 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Score Level
          </button>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="w-full sm:flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="w-full sm:flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-xl"
            >
              <Check className="w-4 h-4" />
              Save Rubric
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
