"use client"

import React from 'react'
import { AlertCircle, User, Hash, FileText, CheckCircle, X, Star, Award, Target, AlertTriangle } from 'lucide-react'

// Grading type definitions
type GradingType = 'simple' | 'lab_challenge' | 'criteria' | 'multi_question' | 'python' | 'sql'

interface CriteriaScores {
  ethics: string | number
  understanding: string | number
  reflection: string | number
}

interface MultiQuestionScores {
  [questionId: string]: string | number
}

interface GradeSubmissionDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  studentId: string
  studentName?: string
  studentSurname?: string
  labNumber: string
  subjectCode: string
  isLoading?: boolean
  
  // Grading type and scores
  gradingType: GradingType
  score?: string | number  // For simple/python/sql scoring
  challengeScore?: string | number  // For lab_challenge scoring
  criteriaScores?: CriteriaScores  // For criteria scoring
  multiQuestionScores?: MultiQuestionScores  // For multi-question scoring
  questionLabels?: string[]  // Labels for multi-question scoring
  additionalInfo?: string  // Optional additional information to display
  existingScore?: string | number  // Existing score for this student+lab combination
}

export default function GradeSubmissionDialog({
  isOpen,
  onClose,
  onConfirm,
  studentId,
  studentName,
  studentSurname,
  labNumber,
  subjectCode,
  isLoading = false,
  gradingType,
  score,
  challengeScore,
  criteriaScores,
  multiQuestionScores,
  questionLabels,
  additionalInfo,
  existingScore
}: GradeSubmissionDialogProps) {
  if (!isOpen) return null

  const displayName = studentName && studentSurname 
    ? `${studentName} ${studentSurname}`
    : 'Name not available'

  // Check if there's an existing score
  const hasExistingScore = existingScore !== undefined && existingScore !== null && existingScore !== ''

  // Function to render score details based on grading type
  const renderScoreDetails = () => {
    switch (gradingType) {
      case 'lab_challenge':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-slate-600 dark:text-slate-400">Lab Score</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{score}</p>
            </div>
            <div className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-slate-600 dark:text-slate-400">Challenge</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{challengeScore}</p>
            </div>
          </div>
        )
      
      case 'criteria':
        return (
          <div className="grid gap-2">
            {criteriaScores && Object.entries(criteriaScores).map(([criterion, value]) => (
              <div key={criterion} className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-slate-600 dark:text-slate-400 capitalize">{criterion}</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{value}/2</p>
              </div>
            ))}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-2 rounded-lg border border-amber-300 dark:border-amber-700">
              <p className="text-xs text-slate-600 dark:text-slate-400">Total Score</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {criteriaScores ? Object.values(criteriaScores).reduce((acc: number, val) => acc + Number(val), 0) : 0}/6
              </p>
            </div>
          </div>
        )
      
      case 'multi_question':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {multiQuestionScores && Object.entries(multiQuestionScores).map(([questionId, value], index) => (
                <div key={questionId} className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {questionLabels?.[index] || `Question ${index + 1}`}
                  </p>
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-2 rounded-lg border border-amber-300 dark:border-amber-700">
              <p className="text-xs text-slate-600 dark:text-slate-400">Total Score</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {multiQuestionScores ? Object.values(multiQuestionScores).reduce((acc: number, val) => acc + Number(val), 0) : 0}
              </p>
            </div>
          </div>
        )
      
      default: // simple, python, sql
        return (
          <div className="bg-white dark:bg-slate-700 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-slate-600 dark:text-slate-400">Score</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{score}</p>
          </div>
        )
    }
  }

  // Get assignment title based on grading type
  const getAssignmentTitle = () => {
    switch (gradingType) {
      case 'criteria':
        return `Lab ${labNumber} - Criteria Assessment`
      case 'multi_question':
        return `Lab ${labNumber} - Multi-Question Assessment`
      case 'lab_challenge':
        return `Lab ${labNumber} - Lab & Challenge`
      default:
        return `Lab ${labNumber} - ${subjectCode}`
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 animate-scale-in transform transition-all duration-300 ease-out my-4">
        <div className="relative">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6 rounded-t-2xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse flex-shrink-0">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-xl font-bold text-white truncate">
                    Confirm Score Submission
                  </h3>
                  <p className="text-blue-100 text-xs sm:text-sm">
                    Review details before submitting
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
          
          {/* Content */}
          <div className="p-4 sm:p-6">
            {/* Warning banner for existing score */}
            {hasExistingScore && (
              <div className="mb-4 p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-400 dark:border-orange-600 rounded-xl animate-pulse">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-bold text-orange-900 dark:text-orange-100">
                      Existing Score Warning
                    </p>
                    <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-200 mt-1">
                      This student already has a score of <span className="font-bold">{existingScore}</span> for this lab. 
                      Submitting will overwrite the existing score.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 sm:mb-3 flex items-center gap-2">
                <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                Submission Details
              </h4>
              
              <div className="grid gap-2 sm:gap-3">
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all duration-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Student ID</p>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-mono bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded mt-1 inline-block truncate max-w-full">{studentId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 hover:shadow-md transition-all duration-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Student Name</p>
                    <p className="text-sm sm:text-base text-green-700 dark:text-green-300 font-medium truncate">{displayName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl border border-purple-200 dark:border-purple-800 hover:shadow-md transition-all duration-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Assignment</p>
                    <p className="text-sm sm:text-base text-purple-700 dark:text-purple-300 font-medium truncate">{getAssignmentTitle()}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800 hover:shadow-md transition-all duration-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center animate-pulse flex-shrink-0">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Score Details</p>
                    <div className="mt-2">
                      {renderScoreDetails()}
                    </div>
                    {additionalInfo && (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                        {additionalInfo}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="animate-pulse">Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirm & Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}