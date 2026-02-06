import { notFound } from "next/navigation"
import Link from "next/link"
import Footer from "@/components/Footer"
import SubjectNavbar from "@/components/SubjectNavbar"
import { getSubjectConfigServer } from "@/lib/subjectServer"
import { getAuthUser } from "@/lib/auth"

export const revalidate = 60; // Cache for 1 minute for faster updates

export default async function SubjectLandingPage(props: { params: Promise<{ subject: string }> }) {
  const params = await props.params;
  const subjectParam = params.subject;
  
  const [config, authUser] = await Promise.all([
    getSubjectConfigServer(subjectParam),
    getAuthUser()
  ]);

  if (!config) {
    notFound();
  }

  const visibleCards = config.cards;
  const gridCols = visibleCards.length === 4 
    ? 'lg:grid-cols-4' 
    : visibleCards.length === 3 
    ? 'lg:grid-cols-3' 
    : 'lg:grid-cols-2';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgGradient} relative overflow-hidden animate-fade-in`}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 -left-4 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float ${config.blobColors?.one || 'bg-purple-300 dark:bg-purple-900'}`}></div>
        <div className={`absolute top-0 -right-4 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float ${config.blobColors?.two || 'bg-pink-300 dark:bg-pink-900'}`} style={{ animationDelay: '2s' }}></div>
        <div className={`absolute -bottom-8 left-20 w-96 h-96 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float ${config.blobColors?.three || 'bg-blue-300 dark:bg-blue-900'}`} style={{ animationDelay: '4s' }}></div>
      </div>

      <SubjectNavbar 
        code={config.code}
        subtitle={config.subtitle}
        accentColor={config.accentColor}
        shadowColor={config.shadowColor}
        isAuthenticated={!!authUser}
      />

      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 relative z-10 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="text-center mb-16 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-slate-100 mb-6 tracking-tight">
            Select <span className={`text-transparent bg-clip-text bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo}`}>Action</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {config.description}
          </p>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl animate-scale-in ${gridCols} ${visibleCards.length === 1 ? 'md:flex md:justify-center' : ''}`}>
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
