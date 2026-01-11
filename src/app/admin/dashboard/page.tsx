"use client"

import { Code2, BarChart3, Layers, Terminal, ArrowRight, Shield, Key, Home, BookOpen, Database, Smartphone } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import LogoutButton from "@/components/LogoutButton"
import Link from "next/link"
import { useState, useEffect } from "react"
import Footer from "@/components/Footer"

export default function AdminHub() {
  const modules = [
    {
      code: "ITCS123",
      title: "Object Oriented Programming",
      desc: "Java test case configuration and logs.",
      icon: <Terminal className="w-8 h-8" />,
      color: "from-orange-500 to-amber-500",
      href: "/admin/itcs123"
    },
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
      desc: "Gradebook management and score tracking.",
      icon: <Layers className="w-8 h-8" />,
      color: "from-emerald-500 to-green-500",
      href: "/admin/itge162"
    },
    {
      code: "ITCS251",
      title: "Programming in Python",
      desc: "Python test runner and gradebook management.",
      icon: <Code2 className="w-8 h-8" />,
      color: "from-blue-500 to-sky-500",
      href: "/admin/itcs251"
    },
    {
      code: "ITCS255",
      title: "Structured Query Language Essentials",
      desc: "SQL query management and score tracking.",
      icon: <Database className="w-8 h-8" />,
      color: "from-purple-500 to-pink-500",
      href: "/admin/itcs255"
    },
    {
      code: "ITDS283",
      title: "Mobile Development",
      desc: "Mobile dev labs gradebook and score tracking.",
      icon: <Smartphone className="w-8 h-8" />,
      color: "from-rose-500 to-red-500",
      href: "/admin/itds283"
    }
  ]

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [username, setUsername] = useState<string>("")
  const [role, setRole] = useState<'LA' | 'Lecturer'>('LA')
  const [permissions, setPermissions] = useState<any>({})
  const [loading, setLoading] = useState(true)

  // Fetch user data on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.username) {
          setUsername(data.username)
          setRole(data.role || 'LA')
          setPermissions(data.permissions || {})
        }
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch user", err)
        setLoading(false)
      })
  }, [])

  async function handlePasswordChange(e: React.FormEvent) {
      e.preventDefault()
      setPasswordLoading(true)
      setPasswordError(null)
      setPasswordSuccess(false)

      try {
          const res = await fetch("/api/auth/change-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentPassword, newPassword })
          })
          
          const data = await res.json()
          
          if (res.ok) {
              setPasswordSuccess(true)
              setCurrentPassword("")
              setNewPassword("")
              setTimeout(() => {
                  setShowPasswordModal(false)
                  setPasswordSuccess(false)
              }, 2000)
          } else {
              setPasswordError(data.error || "Failed to change password")
          }
      } catch (err) {
          setPasswordError("An unexpected error occurred")
      } finally {
          setPasswordLoading(false)
      }
  }

  const visibleModules = modules.filter(mod => {
      // Main admin sees all
      if (username === "kanzaki_aito") return true;
      // Check specific permission
      const key = mod.code.toLowerCase();
      return permissions[key] === true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden animate-fade-in">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/20 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
             <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-teal-500 hover:text-white dark:hover:bg-teal-500 dark:hover:text-white transition-all shadow-sm hover:shadow-lg" title="Back to Main Page">
                <Home className="h-5 w-5" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold shadow-lg">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 hidden sm:inline">
              Admin Portal
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <ModeToggle />
            <div className="relative hidden md:block">
                <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                    <Key className="w-4 h-4" />
                    <span>Password</span>
                </button>
            </div>
            <div className="relative md:hidden">
                <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="flex items-center justify-center w-10 h-10 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                    title="Change Password"
                >
                    <Key className="w-5 h-5" />
                </button>
            </div>
            <LogoutButton />
           </div>
        </div>
      </nav>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in relative">
                <button 
                    onClick={() => setShowPasswordModal(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Key className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Change Password</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Update your account security credentials.</p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Current Password</label>
                        <input 
                            type="password" 
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                            placeholder="Enter current password"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                        <input 
                            type="password" 
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                            placeholder="Min. 6 characters"
                        />
                    </div>

                    {passwordError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                             <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                             {passwordError}
                        </div>
                    )}
                    
                    {passwordSuccess && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center gap-2">
                             <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                             Password updated successfully!
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={passwordLoading}
                        className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {passwordLoading ? 'Updating...' : 'Change Password'}
                    </button>
                </form>
            </div>
        </div>
      )}

      <main className="flex-1 container mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12 text-center animate-slide-up">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-3 sm:mb-4">
                Select Administration Module
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
                Choose a course context to manage content, grades, and settings.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto animate-scale-in">
            {visibleModules.map((mod, idx) => (
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

        {!loading && (role === 'Lecturer' || username === 'kanzaki_aito') && (
          <>
            <div className="mt-16 mb-8 text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Global Management
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                    System-wide settings and configurations.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto animate-scale-in" style={{ animationDelay: '0.3s' }}>

             {username === "kanzaki_aito" && (
             <Link 
                href="/admin/users"
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
                <div className="h-2 animate-pulse bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <div className="p-8 flex items-start gap-6">
                    <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Account Management</h3>
                         <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">System Admins</h4>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Manage admin users and permissions.
                        </p>
                    </div>
                </div>
                 <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Manage Accounts</span>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform group-hover:text-slate-900 dark:group-hover:text-slate-200" />
                </div>
            </Link>
            )}

            {(role === 'Lecturer' || username === 'kanzaki_aito') && (
            <Link 
                href="/admin/labs"
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
                <div className="h-2 animate-pulse bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                <div className="p-8 flex items-start gap-6">
                    <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Lab Management</h3>
                        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Global Config</h4>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Configure labs, deadlines, and sections.
                        </p>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Manage Labs</span>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform group-hover:text-slate-900 dark:group-hover:text-slate-200" />
                </div>
            </Link>
            )}

            {(role === 'Lecturer' || username === 'kanzaki_aito') && (
            <Link 
                href="/admin/subjects"
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
                <div className="h-2 animate-pulse bg-gradient-to-r from-amber-500 to-orange-500"></div>
                <div className="p-8 flex items-start gap-6">
                    <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Subject Management</h3>
                        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Module Visibility</h4>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Control subject display and ordering on main page.
                        </p>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Manage Subjects</span>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform group-hover:text-slate-900 dark:group-hover:text-slate-200" />
                </div>
            </Link>
            )}

            <a 
                href="https://academic.ict.mahidol.ac.th/Admin/TeachingAttendance/Default.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
                <div className="h-2 animate-pulse bg-gradient-to-r from-green-500 to-emerald-500"></div>
                <div className="p-8 flex items-start gap-6">
                    <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white shadow-lg">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Teaching Attendance</h3>
                        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Check-in System</h4>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            Record and manage teaching attendance sessions.
                        </p>
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Check In</span>
                    <svg className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform group-hover:text-slate-900 dark:group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </div>
            </a>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
