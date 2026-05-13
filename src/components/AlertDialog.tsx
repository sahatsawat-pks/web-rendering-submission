"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

interface AlertDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

export function AlertDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default'
}: AlertDialogProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  if (!isOpen) return null

  const isDangerous = variant === 'destructive'

  return (
    <>
      {/* Backdrop with fade animation */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal with scale and fade animation */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div 
          className="bg-[#161b22] border border-white/10 rounded-xl shadow-2xl max-w-sm w-full mx-4 pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with slide down animation */}
          <div className="flex items-start justify-between p-6 border-b border-white/5 animate-slide-down" style={{ animationDelay: '50ms' }}>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">{title}</h2>
              {description && (
                <p className="text-sm text-slate-400 mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-slate-500 hover:text-slate-400 transition-colors hover:rotate-90 duration-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content with fade in animation */}
          {children && (
            <div className="px-6 py-4 text-sm text-slate-300 animate-fade-in" style={{ animationDelay: '100ms' }}>
              {children}
            </div>
          )}

          {/* Footer with slide up animation */}
          <div className="flex gap-3 p-6 border-t border-white/5 justify-end animate-slide-up" style={{ animationDelay: '150ms' }}>
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors duration-200"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                isDangerous
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                  : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(-30px);
          }
          60% {
            opacity: 1;
            transform: scale(1.08);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slide-down {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-slide-down {
          animation: slide-down 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms forwards;
        }

        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 300ms forwards;
        }
      `}</style>
    </>
  )
}
