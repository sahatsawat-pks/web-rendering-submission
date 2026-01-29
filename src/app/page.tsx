import { Zap, Code2, Layers, BarChart3, Terminal, Smartphone, Code, Database } from "lucide-react"
import Link from "next/link"
import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { getSubjects } from "@/lib/db"
import { getAuthUser } from "@/lib/auth"

export const revalidate = 3600; // Cache for 1 hour

export default async function LandingPage() {
  const [subjectsData, authUser] = await Promise.all([
    getSubjects(),
    getAuthUser()
  ]);

  const iconMap: Record<string, React.ReactNode> = {
    'ITCS223': <Code2 className="w-6 h-6" />,
    'ITCS227': <BarChart3 className="w-6 h-6" />,
    'ITGE162': <Layers className="w-6 h-6" />,
    'ITCS123': <Terminal className="w-6 h-6" />,
    'ITCS251': <Code className="w-6 h-6" />,
    'ITCS255': <Database className="w-6 h-6" />,
    'ITDS283': <Smartphone className="w-6 h-6" />,
    'ITCS113': <Terminal className="w-6 h-6" />
  }
  
  const colorMap: Record<string, string> = {
    'ITCS223': 'from-teal-500 to-cyan-500',
    'ITCS227': 'from-indigo-500 to-violet-500',
    'ITGE162': 'from-emerald-500 to-green-500',
    'ITCS123': 'from-orange-500 to-amber-500',
    'ITCS251': 'from-blue-500 to-sky-500',
    'ITCS255': 'from-purple-500 to-pink-500',
    'ITDS283': 'from-rose-500 to-red-500',
    'ITCS113': 'from-yellow-500 to-orange-500'
  }
  
  const shadowMap: Record<string, string> = {
    'ITCS223': 'shadow-teal-500/30',
    'ITCS227': 'shadow-indigo-500/30',
    'ITGE162': 'shadow-emerald-500/30',
    'ITCS123': 'shadow-orange-500/30',
    'ITCS251': 'shadow-blue-500/30',
    'ITCS255': 'shadow-purple-500/30',
    'ITDS283': 'shadow-rose-500/30',
    'ITCS113': 'shadow-yellow-500/30'
  }

  const descriptionMap: Record<string, string> = {
    'ITCS223': 'Full-stack web submission rendering & testing.',
    'ITCS227': 'Lab score tracking and grading system.',
    'ITGE162': 'Physical Science and Computation.',
    'ITCS123': 'Java JUnit test runner and code validator.',
    'ITCS251': 'Python code execution and test validation.',
    'ITCS255': 'SQL score tracking and grading system.',
    'ITDS283': 'Mobile dev labs gradebook and score tracking.',
    'ITCS113': 'Python fundamentals with automated testing.'
  }

  const mappedSubjects = (subjectsData || [])
    .filter((s: any) => s.isVisible)
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map((s: any) => ({
      id: s.code.toLowerCase(),
      code: s.code,
      title: s.name || s.title,
      description: descriptionMap[s.code] || s.description || 'Subject information.',
      icon: iconMap[s.code] || <Code2 className="w-6 h-6" />,
      color: colorMap[s.code] || 'from-slate-500 to-gray-500',
      shadow: shadowMap[s.code] || 'shadow-slate-500/30',
      link: `/${s.code.toLowerCase()}`
    }))

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

      <main className="flex-1 container mx-auto max-w-7xl px-6 py-16 relative z-10 flex flex-col items-center justify-center text-center">
        {/* Hero Section */}
        <div className="mx-auto max-w-4xl mb-16 animate-slide-up">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl mb-6 leading-tight">
            Select Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-indigo-500">Subject</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Choose the course module below to access labs, submissions, or grading systems.
          </p>
        </div>

        {/* Subject Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto w-full animate-scale-in mb-24">
          {mappedSubjects.map((subject, index) => (
             <Link 
                key={subject.id} 
                href={subject.link}
                className="group relative flex flex-col"
                style={{ animationDelay: `${index * 100}ms` }}
            >
                <div className="glass-card flex-1 p-8 text-left hover:scale-[1.03] transition-all duration-300 border-2 border-white/60 dark:border-slate-700/60 group-hover:shadow-2xl flex flex-col">
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white shadow-lg ${subject.shadow} mb-6 group-hover:scale-110 transition-transform duration-300`}>
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
      </main>

      <Footer />
    </div>
  )
}
