import { Zap, Beaker, Sparkles } from "lucide-react"
import Link from "next/link"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { getSubjects } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"
import { adaptSubjectConfig } from "@/lib/subjectConfigAdapter"
import { getIconByName } from "@/lib/iconMap"

export const revalidate = 60;

export default async function LandingPage() {
  const [subjectsData, authUser] = await Promise.all([
    getSubjects(),
    getAuthUser()
  ]);

  const mappedSubjects = (subjectsData || [])
    .filter((s: any) => s.isVisible)
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map((s: any) => {
      const config = adaptSubjectConfig(s);
      const IconComponent = getIconByName(s.icon || 'Code');
      const colorGradient = `${config.gradientFrom} ${config.gradientTo}`;
      
      // Parse shadowColor for CSS vs class usage
      let shadowClass = '';
      let shadowStyle = {};
      if (config.shadowColor.startsWith('[box-shadow:')) {
        const cssMatch = config.shadowColor.match(/\[box-shadow:([^\]]+)\]/);
        if (cssMatch) {
          shadowStyle = { boxShadow: cssMatch[1].replace(/_/g, ' ') };
        }
      } else {
        shadowClass = config.shadowColor;
      }
      
      const displayCode = config.code || s.code
      return {
        id: s.code.toLowerCase(),
        code: displayCode,
        title: config.title,
        description: config.description,
        icon: IconComponent ? <IconComponent className="w-6 h-6" /> : <Zap className="w-6 h-6" />,
        color: colorGradient,
        shadow: shadowClass,
        shadowStyle: shadowStyle,
        link: `/${displayCode.toLowerCase()}`,
        hasGradingInterface: s.hasGradingInterface !== false,
        hasQuizManagement: s.hasQuizManagement ?? false,
      };
    })

  const scoringSubjects = mappedSubjects.filter((s: any) => s.hasGradingInterface)
  const quizOnlySubjects = mappedSubjects.filter((s: any) => !s.hasGradingInterface && s.hasQuizManagement)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden animate-fade-in flex flex-col font-sans">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-teal-300 dark:bg-teal-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"></div>
        <div
          className="absolute top-0 -right-4 w-96 h-96 bg-indigo-300 dark:bg-indigo-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute -bottom-8 left-20 w-96 h-96 bg-orange-300 dark:bg-orange-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      <Navbar isAuthenticated={!!authUser} />

      <main className="flex-1 container mx-auto max-w-7xl px-6 py-12 relative z-10 flex flex-col items-center justify-center text-center">
        {/* Hero Section */}
        <div className="mx-auto max-w-4xl mb-12 animate-slide-up">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl mb-4 leading-tight">
            Select Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-indigo-500">Course Module</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Choose a course below to access lab submissions, score status, or knowledge quizzes.
          </p>
        </div>

        {/* SECTION 1: Lab & Score Grading Courses */}
        {scoringSubjects.length > 0 && (
          <div className="w-full mb-14">
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-200 dark:border-slate-800 text-left">
              <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
                <Beaker className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Lab & Score Grading Courses</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Courses with lab assignments, auto-grading, and score verification.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full animate-scale-in">
              {scoringSubjects.map((subject, index) => (
                <Link 
                  key={subject.id} 
                  href={subject.link}
                  className="group relative flex flex-col"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="glass-card flex-1 p-8 text-left hover:scale-[1.03] transition-all duration-300 border-2 border-white/60 dark:border-slate-700/60 group-hover:shadow-2xl flex flex-col">
                    <div 
                      className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white shadow-lg ${subject.shadow} mb-6 group-hover:scale-110 transition-transform duration-300`}
                      style={subject.shadowStyle}
                    >
                      {subject.icon}
                    </div>
                    <div className="mb-4">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        {subject.code}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{subject.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 flex-1">
                      {subject.description}
                    </p>
                    <div className="flex items-center text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:translate-x-1 transition-transform">
                      Enter Module <Zap className="w-4 h-4 ml-2 text-amber-500" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: Quiz-Only Courses */}
        {quizOnlySubjects.length > 0 && (
          <div className="w-full mb-16">
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-200 dark:border-slate-800 text-left">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quiz & Knowledge Check Courses</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Exclusively for self-assessment quizzes and multi-language question banks.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full animate-scale-in">
              {quizOnlySubjects.map((subject, index) => (
                <Link 
                  key={subject.id} 
                  href={subject.link}
                  className="group relative flex flex-col"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="glass-card flex-1 p-8 text-left hover:scale-[1.03] transition-all duration-300 border-2 border-purple-100/80 dark:border-purple-900/40 group-hover:shadow-2xl flex flex-col">
                    <div 
                      className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white shadow-lg ${subject.shadow} mb-6 group-hover:scale-110 transition-transform duration-300`}
                      style={subject.shadowStyle}
                    >
                      {subject.icon}
                    </div>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                        {subject.code}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                        Quiz Only
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{subject.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6 flex-1">
                      {subject.description}
                    </p>
                    <div className="flex items-center text-sm font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                      Start Quizzes <Zap className="w-4 h-4 ml-2 text-amber-500" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
