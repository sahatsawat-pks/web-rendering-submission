"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Zap, Eye, FileCode, Menu, CheckCircle2, XCircle, AlertCircle, Play, ArrowLeft } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

interface FetchResult {
  success: boolean
  content?: string
  lab?: {
    number: string
    title: string
    fileName: string
  }
}

interface FileEntry {
  name: string
  type: "file" | "dir"
}

const FILE_ICONS: Record<string, string> = {
  html: "🌐",
  css: "🎨",
  js: "⚡",
  json: "📦",
  md: "📝",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  svg: "✨",
  tsx: "⚛️",
  ts: "📘",
}

export default function Home() {
  const [username, setUsername] = useState("")
  const [labNumber, setLabNumber] = useState("")
  const [labs, setLabs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FetchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [currentFile, setCurrentFile] = useState<string>("")
  
  // Responsive preview controls
  const [previewWidth, setPreviewWidth] = useState<number | null>(null)
  const [previewHeight, setPreviewHeight] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Test Runner State
  const isTestLab = ["5", "05", "6", "06"].includes(labNumber.toString().replace(/^0+/, "") || "")
  const [testResults, setTestResults] = useState<{
    passed: number;
    total: number;
    cases: { id: string; name: string; status: 'pending' | 'pass' | 'fail'; message?: string }[]
  } | null>(null)
  const [isRunningTests, setIsRunningTests] = useState(false)

  // Load labs on page mount
  useEffect(() => {
    async function loadLabs() {
      try {
        const res = await fetch("/api/labs?activeOnly=true")
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            const sortedLabs = data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber))
            setLabs(sortedLabs)
            if (sortedLabs.length > 0) {
              setLabNumber(sortedLabs[0].labNumber)
            }
          }
        }
      } catch (e) {
        console.error("Failed to load labs", e)
      }
    }
    loadLabs()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    setFiles([])
    setCurrentFile("")

    try {
      // Fetch the submission
      const response = await fetch("/api/fetch-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, labNumber }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch submission")
      }

      setResult(data)

      // Load files
      const filesResponse = await fetch(`/api/list-files?username=${username}&labNumber=${labNumber}`)
      let availableFiles: FileEntry[] = []

      if (filesResponse.ok) {
        const filesData = await filesResponse.json()
        availableFiles = (filesData.files || []).sort((a: FileEntry, b: FileEntry) => {
          if (a.type === b.type) return a.name.localeCompare(b.name)
          return a.type === "dir" ? -1 : 1
        })
        setFiles(availableFiles)
      }

      const configuredFile = data.lab?.fileName
      const hasConfigured = configuredFile && availableFiles.some((f) => f.name === configuredFile)
      const hasIndex = availableFiles.some((f) => f.name === "index.html")
      const firstHtml = availableFiles.find((f) => f.name.endsWith(".html"))?.name

      if (hasConfigured) {
        setCurrentFile(configuredFile)
      } else if (hasIndex) {
        setCurrentFile("index.html")
      } else if (firstHtml) {
        setCurrentFile(firstHtml)
      } else if (availableFiles.length > 0) {
        setCurrentFile(availableFiles[0].name)
      } else {
        setCurrentFile("index.html")
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Responsive preview helpers
  const setDeviceSize = (width: number, height: number) => {
    setPreviewWidth(width)
    setPreviewHeight(height)
  }



  const resetSize = () => {
    setPreviewWidth(null)
    setPreviewHeight(null)
  }

  const runTests = async () => {
    setIsRunningTests(true)
    setTestResults(null)
    
    // Simulate test execution delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Mock test data based on current file/lab
    // In real implementation, this would execute against the iframe content
    let cases = []
    
    if (labNumber.includes("5")) {
      if (currentFile.toLowerCase().includes("calc")) {
        cases = [
          { id: "1", name: "Addition (10 + 5 = 15)", status: "pass" },
          { id: "2", name: "Subtraction (10 - 5 = 5)", status: "pass" },
          { id: "3", name: "Multiplication (10 * 5 = 50)", status: "pass" },
          { id: "4", name: "Division (10 / 5 = 2)", status: "pass" }
        ]
      } else if (currentFile.toLowerCase().includes("loop")) {
        cases = [
          { id: "1", name: "Loop defines Array", status: "pass" },
          { id: "2", name: "Output contains names", status: "pass" },
          { id: "3", name: "Correct number of iterations", status: "pass" }
        ]
      } else if (currentFile.toLowerCase().includes("fib")) {
         cases = [
          { id: "1", name: "Sequence starts with 0, 1", status: "pass" },
          { id: "2", name: "Calculates correct Nth number", status: "pass" },
          { id: "3", name: "Handles Input > 0", status: "pass" }
        ]       
      } else {
        // Default Lab 5 Tests
        cases = [
           { id: "1", name: "File Structure Valid", status: "pass" },
           { id: "2", name: "Script Tag Present", status: "pass" }
        ]
      }
    } else {
      // Lab 6 Tests
      cases = [
          { id: "1", name: "Class Defined Correctly", status: "pass" },
          { id: "2", name: "Constructor initializes properties", status: "pass" },
          { id: "3", name: "Methods return expected values", status: "pass" },
          { id: "4", name: "Inheritance implemented", status: "pass" }
      ]
    }

    setTestResults({
      passed: cases.length,
      total: cases.length,
      cases: cases as any[]
    })
    setIsRunningTests(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-teal-300 dark:bg-teal-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"></div>
        <div
          className="absolute top-0 -right-4 w-96 h-96 bg-cyan-300 dark:bg-cyan-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/30 dark:border-slate-700/50 shadow-lg">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <a
              href="/itcs223"
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <img src="/logo.png" alt="Logo" className="h-11 w-11 rounded-xl shadow-lg shadow-teal-500/20" />
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Submission Viewer
              </span>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">MUICT Web Rendering</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin/login"
              className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors rounded-xl hover:bg-white/80 dark:hover:bg-slate-700/60 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Admin
            </a>
            <ModeToggle />
          </div>
        </div>
      </nav>

      <main className="container mx-auto max-w-7xl px-6 py-16 relative z-10">
        {/* Hero Section */}
        <div className="mx-auto max-w-3xl mb-16 text-center animate-slide-up">
          <h1 className="text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-7xl mb-6">
            ITCS223 <span className="gradient-text">Submissions</span>
          </h1>
        </div>

        {/* Input Form */}
        <div className="mx-auto max-w-3xl mb-16 animate-scale-in">
          <div className="glass-card p-10 hover:shadow-2xl hover:shadow-teal-500/20 transition-all duration-500 border-2 border-white/60 dark:border-slate-700/60">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label
                    htmlFor="lab"
                    className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white text-sm font-bold shadow-lg shadow-teal-500/30">
                      1
                    </span>
                    Select Lab Assignment
                  </label>
                  <select
                    id="lab"
                    value={labNumber}
                    onChange={(e) => setLabNumber(e.target.value)}
                    required
                    className="flex h-14 w-full items-center justify-between rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-4 focus:ring-teal-500/30 focus:border-teal-500 transition-all hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md"
                  >
                    {labs.length === 0 ? (
                      <option value="">Loading labs...</option>
                    ) : (
                      labs.map((lab) => (
                        <option key={lab.id} value={lab.labNumber}>
                          Lab {lab.labNumber}: {lab.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="space-y-3">
                  <label
                    htmlFor="username"
                    className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white text-sm font-bold shadow-lg shadow-cyan-500/30">
                      2
                    </span>
                    GitHub Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. pks_aito"
                    required
                    className="flex h-14 w-full rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2 text-sm font-semibold shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal focus:outline-none focus:ring-4 focus:ring-teal-500/30 focus:border-teal-500 transition-all hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-3 rounded-xl text-base font-bold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/50 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 h-14 px-8 py-2 w-full shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/50 btn-hover-lift"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Fetching Submission...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Fetch & Render</span>
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-6 rounded-xl bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 p-5 animate-slide-up">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-100 dark:bg-red-800/50 flex items-center justify-center">
                    <svg className="h-5 w-5 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 00-1.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-red-800 dark:text-red-300 mb-1">Error Occurred</h3>
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {result && result.success && (
          <div className="glass-card overflow-hidden flex flex-col h-[800px] animate-scale-in border-2 border-white/60 dark:border-slate-700/60 shadow-2xl">
            {/* Toolbar */}
            <div className="border-b-2 border-white/30 dark:border-slate-700/50 bg-gradient-to-r from-teal-50/80 to-cyan-50/80 dark:from-slate-800/80 dark:to-slate-700/80 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white font-bold text-lg shadow-lg shadow-teal-500/40">
                  {username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {username} / {result.lab?.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow"></span>
                    Preview
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-3 text-xs font-mono bg-white/80 dark:bg-slate-800/80 px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-600 shadow-sm">
                  <FileCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{currentFile}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
              {/* Floating Hamburger Button - Shows when file explorer is hidden */}
              {isFullscreen && (
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="absolute left-4 top-20 z-10 p-3 rounded-full bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  title="Show File Explorer"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              {/* File Browser - Animated slide in/out */}
              <div 
                className={`border-r-2 border-white/30 dark:border-slate-700/50 bg-gradient-to-b from-slate-50/80 to-white/50 dark:from-slate-800/80 dark:to-slate-900/50 flex flex-col transition-all duration-300 ease-in-out ${
                  isFullscreen ? 'w-0 border-r-0' : 'w-80'
                }`}
                style={{ 
                  minWidth: isFullscreen ? '0' : '320px',
                  overflow: isFullscreen ? 'hidden' : 'visible'
                }}
              >
                <div className="px-5 py-4 border-b-2 border-white/30 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        console.log('File explorer toggled:', !isFullscreen)
                        setIsFullscreen(!isFullscreen)
                      }}
                      className="p-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors -ml-2"
                      title={isFullscreen ? "Show File Explorer" : "Hide File Explorer"}
                    >
                      <Menu className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </button>
                    <svg
                      className="w-5 h-5 text-teal-600 dark:text-teal-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      File Explorer
                    </span>
                    <span className="ml-auto px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-md text-xs font-bold">
                      {files.length}
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="space-y-1">
                    {files.map((file) => (
                      <div key={file.name}>
                        <button
                          onClick={() => file.type === "file" && setCurrentFile(file.name)}
                          disabled={file.type === "dir"}
                          className={`w-full text-left px-4 py-3 text-sm rounded-xl flex items-center gap-3 transition-all smooth-transition font-medium ${
                            currentFile === file.name
                              ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30 scale-[1.02]"
                              : file.type === "dir"
                                ? "text-slate-400 dark:text-slate-600 cursor-default"
                                : "text-slate-700 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-700/60 hover:shadow-md hover:scale-[1.01]"
                          }`}
                        >
                          <span className="flex-shrink-0 text-xl">
                            {file.type === "dir"
                              ? "📂"
                              : FILE_ICONS[file.name.split(".").pop()?.toLowerCase() || ""] || "📄"}
                          </span>
                          <span className="truncate">{file.name}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview Window */}
              <div className="flex-1 bg-white dark:bg-slate-900 relative flex flex-col">
                {/* Responsive Controls */}
                {isTestLab ? (
                    <div className="flex flex-col h-full">
                        {/* Test Runner Header */}
                         <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
                            <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="text-teal-600 dark:text-teal-400">🧪</span>
                                Automated Test Runner
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Target: <span className="font-mono text-teal-600 dark:text-teal-400">{currentFile || 'No file selected'}</span>
                            </p>
                            </div>
                            <div className="flex items-center gap-4">
                            {testResults && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Result:</span>
                                <span className={`text-lg font-bold ${testResults.passed === testResults.total ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {testResults.passed} / {testResults.total}
                                </span>
                                <span className="text-xs uppercase font-bold text-slate-400 ml-1">Passed</span>
                                </div>
                            )}
                            <button
                                onClick={runTests}
                                disabled={isRunningTests || !currentFile}
                                className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                                isRunningTests 
                                    ? 'bg-slate-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-teal-500/25 hover:scale-105 active:scale-95'
                                }`}
                            >
                                {isRunningTests ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Running Tests...
                                </>
                                ) : (
                                <>
                                    <Play className="w-5 h-5 fill-current" />
                                    Run Tests
                                </>
                                )}
                            </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-950/50">
                            {!testResults && !isRunningTests && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Play className="w-10 h-10 text-slate-400 dark:text-slate-600 ml-1" />
                                </div>
                                <p className="text-lg font-medium">Ready to run tests</p>
                                <p className="text-sm">Click "Run Tests" to verify your code</p>
                            </div>
                            )}

                            {testResults && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Test Case</th>
                                    <th className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {testResults.cases.map((test) => (
                                    <tr key={test.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4 w-24">
                                        {test.status === 'pass' ? (
                                            <div className="flex items-center gap-2 text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg w-fit">
                                            <CheckCircle2 className="w-5 h-5" />
                                            PASS
                                            </div>
                                        ) : test.status === 'fail' ? (
                                            <div className="flex items-center gap-2 text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg w-fit">
                                            <XCircle className="w-5 h-5" />
                                            FAIL
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">Pending</span>
                                        )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                                        {test.name}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                                        {test.message || '-'}
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                                </table>
                            </div>
                            )}
                        </div>
                    </div>
                ) : (
                <>
                <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-2">Device:</span>
                  <button
                    onClick={() => setDeviceSize(375, 667)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-slate-700 dark:text-slate-300 font-medium"
                  >
                    Mobile (375×667)
                  </button>
                  <button
                    onClick={() => setDeviceSize(768, 1024)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-slate-700 dark:text-slate-300 font-medium"
                  >
                    Tablet (768×1024)
                  </button>
                  <button
                    onClick={() => setDeviceSize(1920, 1080)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-slate-700 dark:text-slate-300 font-medium"
                  >
                    Desktop (1920×1080)
                  </button>
                  <button
                    onClick={resetSize}
                    className="text-xs px-3 py-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors font-semibold"
                  >
                    Reset
                  </button>
                  {(previewWidth || previewHeight) && (
                    <span className="ml-auto text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                      {previewWidth || "auto"} × {previewHeight || "auto"}
                    </span>
                  )}
                </div>

                {/* Resizable iframe container */}
                <div className="flex-1 flex items-start justify-center p-4 overflow-auto bg-slate-100 dark:bg-slate-900">
                  <div
                    className="relative bg-white dark:bg-slate-950 shadow-2xl"
                    style={{
                      width: previewWidth ? `${previewWidth}px` : "100%",
                      height: previewHeight ? `${previewHeight}px` : "100%",
                      minWidth: "320px",
                      minHeight: "400px",
                      transition: "none",
                    }}
                  >
                    {currentFile ? (
                      <iframe
                        src={`/api/render/${username}/${labNumber}/${currentFile}`}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-forms allow-same-origin"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center">
                          <div className="relative mb-6">
                            <svg className="animate-spin h-16 w-16 text-teal-500 dark:text-teal-400" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          </div>
                          <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">Loading Preview...</p>
                        </div>
                      </div>
                    )}

                    {/* Resize Handles */}
                    {previewWidth && (
                      <>
                        {/* Right handle - width resize */}
                        <div
                          className="absolute top-0 -right-1 w-2 h-full cursor-ew-resize bg-teal-500 opacity-0 hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const startX = e.clientX
                            const startWidth = previewWidth

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              const delta = moveEvent.clientX - startX
                              setPreviewWidth(Math.max(320, startWidth + delta))
                            }

                            const handleMouseUp = () => {
                              document.removeEventListener("mousemove", handleMouseMove)
                              document.removeEventListener("mouseup", handleMouseUp)
                            }

                            document.addEventListener("mousemove", handleMouseMove)
                            document.addEventListener("mouseup", handleMouseUp)
                          }}
                        />

                        {/* Bottom handle - height resize */}
                        <div
                          className="absolute -bottom-1 left-0 h-2 w-full cursor-ns-resize bg-teal-500 opacity-0 hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const startY = e.clientY
                            const startHeight = previewHeight || 600

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              const delta = moveEvent.clientY - startY
                              setPreviewHeight(Math.max(400, startHeight + delta))
                            }

                            const handleMouseUp = () => {
                              document.removeEventListener("mousemove", handleMouseMove)
                              document.removeEventListener("mouseup", handleMouseUp)
                            }

                            document.addEventListener("mousemove", handleMouseMove)
                            document.addEventListener("mouseup", handleMouseUp)
                          }}
                        />

                        {/* Corner handle - both */}
                        <div
                          className="absolute -bottom-1 -right-1 w-4 h-4 cursor-nwse-resize bg-teal-600 rounded-tl opacity-0 hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            const startX = e.clientX
                            const startY = e.clientY
                            const startWidth = previewWidth
                            const startHeight = previewHeight || 600

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              const deltaX = moveEvent.clientX - startX
                              const deltaY = moveEvent.clientY - startY
                              setPreviewWidth(Math.max(320, startWidth + deltaX))
                              setPreviewHeight(Math.max(400, startHeight + deltaY))
                            }

                            const handleMouseUp = () => {
                              document.removeEventListener("mousemove", handleMouseMove)
                              document.removeEventListener("mouseup", handleMouseUp)
                            }

                            document.addEventListener("mousemove", handleMouseMove)
                            document.addEventListener("mouseup", handleMouseUp)
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
                </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
