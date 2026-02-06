"use client"

import React from 'react'
import { AlertCircle, User, Hash, FileText, CheckCircle, X, Star, Award, Target } from 'lucide-react'

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
  additionalInfo
}: GradeSubmissionDialogProps) {
  if (!isOpen) return null

  const displayName = studentName && studentSurname 
    ? `${studentName} ${studentSurname}`
    : 'Name not available'

  // Function to render score details based on grading type
  const renderScoreDetails = () => {
    switch (gradingType) {
      case 'lab_challenge':
        return (
          <div className="grid grid-cols-2 gap-2">
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
            <div className="grid grid-cols-3 gap-2">
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 animate-scale-in transform transition-all duration-300 ease-out">
        <div className="relative">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Confirm Score Submission
                  </h3>
                  <p className="text-blue-100 text-sm">
                    Review details before submitting to gradebook
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <div className="space-y-4 mb-8">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Submission Details
              </h4>
              
              <div className="grid gap-3">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all duration-200">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Hash className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Student ID</p>
                    <p className="text-base text-slate-700 dark:text-slate-300 font-mono bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded mt-1 inline-block">{studentId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 hover:shadow-md transition-all duration-200">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Student Name</p>
                    <p className="text-base text-green-700 dark:text-green-300 font-medium">{displayName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl border border-purple-200 dark:border-purple-800 hover:shadow-md transition-all duration-200">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assignment</p>
                    <p className="text-base text-purple-700 dark:text-purple-300 font-medium">{getAssignmentTitle()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800 hover:shadow-md transition-all duration-200">
                  <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center animate-pulse">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Score Details</p>
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
            <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
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