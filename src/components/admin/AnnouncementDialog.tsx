"use client"

import React from 'react'
import { X, AlertCircle, Megaphone } from 'lucide-react'
import RichTextDisplay from '../RichTextDisplay'

interface AnnouncementDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  subjectCode: string
  isLoading?: boolean
  mode: 'create' | 'view'
  createdAt?: string
}

export default function AnnouncementDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  subjectCode,
  isLoading = false,
  mode,
  createdAt
}: AnnouncementDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">
                {mode === 'create' ? 'Create Announcement' : 'Announcement Details'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subjectCode} - {mode === 'create' ? 'Notify students' : `Posted ${createdAt ? new Date(createdAt).toLocaleString() : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Announcement Content */}
        <div className="space-y-4">
          {/* Title Display */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-1">Title</p>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100 break-words">{title}</p>
              </div>
            </div>
          </div>

          {/* Message Display */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Message</p>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <RichTextDisplay content={message} />
            </div>
          </div>

          {/* Info Banner */}
          {mode === 'create' && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                This announcement will be visible to all students on the {subjectCode} score page.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'create' ? 'Cancel' : 'Close'}
          </button>
          {mode === 'create' && (
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Megaphone className="w-4 h-4" />
                  <span>Publish Announcement</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
