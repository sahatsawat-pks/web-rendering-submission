"use client"

import { Code2, BarChart3, Layers, Terminal, ArrowRight, Shield } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import Link from "next/link"

export default function AdminHub() {
  const modules = [
    {
      code: "ITCS223",
      title: "Introduction to Web Development",
      desc: "Manage lab submissions, file rendering, and deadlines.",
      icon: <Code2 className="w-8 h-8" />,
      color: "from-teal-500 to-cyan-500",
      href: "/admin/itcs223"
    },
    {
      code: "ITCS227",
      title: "Introduction to Data Science",
      desc: "Gradebook management and score tracking.",
      icon: <BarChart3 className="w-8 h-8" />,
      color: "from-indigo-500 to-violet-500",
      href: "/admin/itcs227"
    },
    {
      code: "ITGE162",
      title: "Physical Science and Computation",
      desc: "CG lab score submissions and weekly tracking.",
      icon: <Layers className="w-8 h-8" />,
      color: "from-emerald-500 to-green-500",
      href: "/admin/itge162"
    },
    {
      code: "ITCS123",
      title: "Object Oriented Programming",
      desc: "Java test case configuration and logs.",
      icon: <Terminal className="w-8 h-8" />,
      color: "from-orange-500 to-amber-500",
      href: "/admin/itcs123"
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/20 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold shadow-lg">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Admin Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <LogoutButton />
           </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12 text-center animate-slide-up">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-4">
                Select Administration Module
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
                Choose a course context to manage content, grades, and settings.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto animate-scale-in">
            {modules.map((mod, idx) => (
                <Link 
                    key={mod.code} 
                    href={mod.href}
                    className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                >
                    <div className={`h-2 animate-pulse bg-gradient-to-r ${mod.color}`}></div>
                    <div className="p-8 flex items-start gap-6">
                        <div className={`flex-shrink-0 h-16 w-16 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-white shadow-lg`}>
                            {mod.icon}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{mod.code}</h3>
                            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{mod.title}</h4>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                {mod.desc}
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Enter Dashboard</span>
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform group-hover:text-slate-900 dark:group-hover:text-slate-200" />
                    </div>
                </Link>
            ))}
        </div>
      </main>
    </div>
  )
}
