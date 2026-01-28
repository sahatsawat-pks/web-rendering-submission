"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, notFound } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import Footer from "@/components/Footer"
import { getSubjectConfig, isValidSubject, SubjectConfig } from "@/lib/subjectConfig"
import { fetchSubjectConfig } from "@/lib/subjectConfigCache"

export default function SubjectLandingPage() {
  const params = useParams()
  const router = useRouter()
  const subjectParam = typeof params?.subject === 'string' ? params.subject : ""
  
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [config, setConfig] = useState<SubjectConfig | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Existing static config for fallback/initial check
  const staticConfig = subjectParam ? getSubjectConfig(subjectParam) : null

  useEffect(() => {
    // Check if user is logged in
    fetch("/api/auth/check")
      .then(res => res.json())
      .then(data => {
        setIsLoggedIn(data.isAuthenticated)
      })
      .catch(() => setIsLoggedIn(false))

    // Fetch Subject Config Dynamically
    if (subjectParam) {
        fetchSubjectConfig(subjectParam as string)
        .then(config => {
            if (config) {
                setConfig(config)
            } else if (staticConfig) {
                setConfig(staticConfig)
            } else {
                notFound()
            }
        })
        .catch(() => {
             if (staticConfig) setConfig(staticConfig)
        })
        .finally(() => setLoading(false))
    }
  }, [subjectParam, router, staticConfig])

  // Return null while validating/loading
  if (!config || loading) {
    return null
  }

  // Filter cards based on quiz section status
  // Filter cards based on feature flags (flags are integrated into config via adapter now)
  const visibleCards = config.cards

  // Determine grid columns based on number of visible cards
  const gridCols = visibleCards.length === 4 
    ? 'lg:grid-cols-4' 
    : visibleCards.length === 3 
    ? 'lg:grid-cols-3' 
    : 'lg:grid-cols-2'

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} relative overflow-hidden animate-fade-in`}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 -left-4 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float ${config.blobColors?.one || 'bg-purple-300 dark:bg-purple-900'}`}></div>
        <div className={`absolute top-0 -right-4 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float ${config.blobColors?.two || 'bg-pink-300 dark:bg-pink-900'}`} style={{ animationDelay: '2s' }}></div>
        <div className={`absolute -bottom-8 left-20 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float ${config.blobColors?.three || 'bg-blue-300 dark:bg-blue-900'}`} style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              title="Back to Main Page"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <img 
              src="/logo.png" 
              alt="Logo" 
              className={`h-11 w-11 rounded-xl shadow-lg ${config.shadowColor}`} 
            />
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {config.code}
              </span>
              <p className={`text-xs ${config.accentColor} font-medium`}>
                {config.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {!isLoggedIn ? (
               <a
                 href="/admin/login"
                 className={`px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/60 flex items-center gap-2`}
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                 </svg>
                 Admin
               </a>
             ) : (
                <LogoutButton />
             )}
            <ModeToggle />
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 relative z-10 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="text-center mb-16 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-slate-100 mb-6 tracking-tight">
            Select <span className={`text-transparent bg-clip-text bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo}`}>Action</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {config.description}
          </p>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl ${subjectParam.toUpperCase() === 'ITCS123' ? 'max-w-7xl' : 'max-w-6xl'} animate-scale-in ${gridCols} ${visibleCards.length === 1 ? 'md:flex md:justify-center' : ''}`}>
          {visibleCards.map((card, index) => {
            const CardIcon = card.icon
            const isExternal = card.isExternal || false
            const Component = isExternal ? 'a' : Link

            return (
              <Component
                key={index}
                href={card.href}
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-2xl hover:${card.shadowColor} transition-all duration-500 hover:-translate-y-2`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-2xl ${card.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                    {CardIcon ? (
                      <CardIcon className={`w-10 h-10 ${card.iconColor}`} />
                    ) : (
                      // Quiz icon SVG
                      <svg className={`w-10 h-10 ${card.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                    {card.subtitle ? (
                      <>
                        {card.title.replace(card.subtitle, '')}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-indigo-500">
                          {card.subtitle}
                        </span>
                      </>
                    ) : (
                      card.title
                    )}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">
                    {card.description}
                  </p>
                </div>
              </Component>
            )
          })}
        </div>
      </main>

      <Footer />
    </div>
  )
}
