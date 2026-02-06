"use client"

import React, { useEffect } from 'react'
import { CheckCircle, User, Trophy, Sparkles } from 'lucide-react'

interface SuccessNotificationProps {
  isVisible: boolean
  onHide: () => void
  studentId: string
  studentName?: string
  labNumber: string
  score: string | number
  challengeScore?: string | number
  subjectCode: string
  additionalInfo?: string
}

export default function SuccessNotification({
  isVisible,
  onHide,
  studentId,
  studentName,
  labNumber,
  score,
  challengeScore,
  subjectCode,
  additionalInfo
}: SuccessNotificationProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide()
      }, 4000) // Auto-hide after 4 seconds

      return () => clearTimeout(timer)
    }
  }, [isVisible, onHide])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-2xl shadow-2xl max-w-sm border border-green-400 animate-success-bounce">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse">
            <Trophy className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-white" />
              <h4 className="font-bold text-white">Score Submitted Successfully!</h4>
            </div>

            <div className="space-y-1 text-green-50 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{studentName || `Student ${studentId}`}</span>
              </div>

              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Lab {labNumber} - {subjectCode}</span>
              </div>

              <div className="mt-3 bg-white/20 rounded-lg p-2">
                {challengeScore !== undefined ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="opacity-90">Lab:</span>
                      <span className="font-bold ml-1">{score}</span>
                    </div>
                    <div>
                      <span className="opacity-90">Challenge:</span>
                      <span className="font-bold ml-1">{challengeScore}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs">
                    <span className="opacity-90">Score:</span>
                    <span className="font-bold ml-1 text-lg">{score}</span>
                    {additionalInfo && (
                      <div className="mt-2 text-xs text-green-50 italic opacity-90">
                        {additionalInfo}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onHide}
          className="absolute top-2 right-2 w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200"
        >
          <span className="text-white text-sm">✕</span>
        </button>
      </div>
    </div>
  )
}