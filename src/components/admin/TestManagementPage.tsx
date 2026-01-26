"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Plus, Trash2, Edit2, AlertCircle, CheckCircle, XCircle } from "lucide-react"

interface Lab {
  id: string
  labNumber: string
  title: string
  subject: string
  isActive: boolean
  fileName?: string
  testCases?: string // JSON string
  labType?: 'Lab' | 'Challenge'
  [key: string]: any // Allow dynamic access for taskKey
}

interface TestTask {
  id: string
  name: string
  order: number
}

interface TestCase {
  id: string
  name: string
  input: string
  expectedOutput: string
  matchMode?: 'trim' | 'exact' | 'regex'
  taskId?: string // Generic ID for task/subQuestion
  verificationCode?: string
  [key: string]: any // Allow legacy keys like TaskId or subQuestionId to be mapped
}

interface TestManagementPageProps {
  subjectCode: string
  subjectTitle: string
  taskKey?: 'Tasks' | 'subQuestions'
  taskLabel?: string
  hasChallengeMode?: boolean
  hasVerificationCode?: boolean
  hasTotalScore?: boolean
  allowedMatchModes?: ('trim' | 'exact' | 'regex')[]
  colorTheme?: {
    gradient: string
    primary: string
    secondary: string
    accent: string
  }
}

export default function TestManagementPage({
  subjectCode,
  subjectTitle,
  taskKey = 'Tasks',
  taskLabel = 'Task',
  hasChallengeMode = false,
  hasVerificationCode = false,
  hasTotalScore = false,
  allowedMatchModes = ['trim', 'exact'],
  colorTheme = {
    gradient: "from-blue-50 via-white to-indigo-50",
    primary: "text-blue-600",
    secondary: "bg-blue-600",
    accent: "blue"
  }
}: TestManagementPageProps) {
  
  const accentGradients: Record<string, string> = {
    blue: "from-blue-600 to-indigo-600",
    teal: "from-teal-600 to-cyan-600",
    emerald: "from-emerald-600 to-green-600",
    indigo: "from-indigo-600 to-purple-600",
    purple: "from-purple-600 to-pink-600",
    orange: "from-orange-600 to-amber-600",
    rose: "from-rose-600 to-red-600",
    cyan: "from-cyan-600 to-blue-600",
    slate: "from-slate-600 to-gray-600",
  }
  const router = useRouter()
  const [labs, setLabs] = useState<Lab[]>([])
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [tasks, setTasks] = useState<TestTask[]>([])
  const [totalScore, setTotalScore] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [labTypeFilter, setLabTypeFilter] = useState<'Lab' | 'Challenge'>('Lab')
  const [role, setRole] = useState<'LA' | 'Lecturer' | null>(null)
  const [hasAccess, setHasAccess] = useState(false)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentTest, setCurrentTest] = useState<TestCase | null>(null)
  const [testName, setTestName] = useState("")
  const [testInput, setTestInput] = useState("")
  const [testOutput, setTestOutput] = useState("")
  const [testMatchMode, setTestMatchMode] = useState<'trim' | 'exact' | 'regex'>('trim')
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined)
  const [testVerificationCode, setTestVerificationCode] = useState("")

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<TestTask | null>(null)
  const [taskName, setTaskName] = useState("")

  useEffect(() => {
    // Check role and permissions first
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        setRole(data.role)
        const permissionKey = subjectCode.toLowerCase()
        if (data.username === 'kanzaki_aito' || (data.role === 'Lecturer' && data.permissions && data.permissions[permissionKey])) {
          setHasAccess(true)
          fetchLabs()
        } else {
          router.push(`/admin/${permissionKey}`)
        }
      })
      .catch(err => {
        console.error("Failed to fetch user permissions", err)
        router.push('/admin/dashboard')
      })
  }, [router, subjectCode])

  const fetchLabs = async () => {
    try {
      const res = await fetch(`/api/labs?subject=${subjectCode.toUpperCase()}`)
      const data = await res.json()
      if (data.success) {
        setLabs(data.labs)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError("Failed to fetch labs")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectLab = (lab: Lab) => {
    setSelectedLab(lab)
    setSuccess(null)
    setTotalScore(lab.totalScore)
    
    // Parse Test Cases
    if (lab.testCases) {
      try {
        const parsed: any[] = JSON.parse(lab.testCases)
        // Normalize TaskId/subQuestionId to taskId
        const normalized = parsed.map(t => ({
          ...t,
          taskId: t.taskId || t.TaskId || t.subQuestionId
        }))
        setTestCases(normalized)
      } catch (e) {
        console.error("Failed to parse test cases", e)
        setTestCases([])
      }
    } else {
      setTestCases([])
    }

    // Parse Tasks/SubQuestions
    if (lab[taskKey]) {
      try {
        setTasks(JSON.parse(lab[taskKey]))
      } catch (e) {
        console.error("Failed to parse tasks", e)
        setTasks([])
      }
    } else {
      setTasks([])
    }
  }

  const handleOpenModal = (test?: TestCase, taskId?: string) => {
    if (test) {
      setCurrentTest(test)
      setTestName(test.name)
      setTestInput(test.input)
      setTestOutput(test.expectedOutput)
      setTestMatchMode(test.matchMode || 'trim')
      setSelectedTaskId(test.taskId)
      setTestVerificationCode(test.verificationCode || "")
    } else {
      setCurrentTest(null)
      setTestName("")
      setTestInput("")
      setTestOutput("")
      setTestMatchMode('trim')
      setSelectedTaskId(taskId)
      setTestVerificationCode("")
    }
    setIsModalOpen(true)
  }

  const handleSaveTest = async () => {
    if (!testName || !selectedLab) return

    let updatedTestCases: TestCase[]
    if (currentTest) {
      // Edit
      updatedTestCases = testCases.map(t => 
        t.id === currentTest.id 
          ? { 
              ...t, 
              name: testName, 
              input: testInput, 
              expectedOutput: testOutput, 
              matchMode: testMatchMode, 
              taskId: selectedTaskId,
              verificationCode: hasVerificationCode ? testVerificationCode : undefined
            }
          : t
      )
    } else {
      // Create
      const newTest: TestCase = {
        id: crypto.randomUUID(),
        name: testName,
        input: testInput,
        expectedOutput: testOutput,
        matchMode: testMatchMode,
        taskId: selectedTaskId,
        verificationCode: hasVerificationCode ? testVerificationCode : undefined
      }
      updatedTestCases = [...testCases, newTest]
    }
    
    setTestCases(updatedTestCases)
    setIsModalOpen(false)

    // Auto-save logic integrated here or deferred to handleSaveChanges
    // For universal component, let's trigger save immediately like original
    await saveToBackend(updatedTestCases, tasks, totalScore)
  }

  const handleOpenTaskModal = (task?: TestTask) => {
    if (task) {
      setCurrentTask(task)
      setTaskName(task.name)
    } else {
      setCurrentTask(null)
      setTaskName("")
    }
    setIsTaskModalOpen(true)
  }

  const handleSaveTask = async () => {
    if (!taskName || !selectedLab) return

    let updatedTasks: TestTask[]
    if (currentTask) {
      // Edit
      updatedTasks = tasks.map(t => 
        t.id === currentTask.id ? { ...t, name: taskName } : t
      )
    } else {
      // Create
      const newTask: TestTask = {
        id: crypto.randomUUID(),
        name: taskName,
        order: tasks.length
      }
      updatedTasks = [...tasks, newTask]
    }
    
    setTasks(updatedTasks)
    setIsTaskModalOpen(false)
    await saveToBackend(testCases, updatedTasks, totalScore)
  }

  const handleDeleteTask = (id: string) => {
    if (confirm(`Are you sure? All test cases in this ${taskLabel.toLowerCase()} will be moved to 'No ${taskLabel.toLowerCase()}'.`)) {
      const updatedTasks = tasks.filter(t => t.id !== id)
      setTasks(updatedTasks)
      
      const updatedTestCases = testCases.map(tc => 
        tc.taskId === id ? { ...tc, taskId: undefined } : tc
      )
      setTestCases(updatedTestCases)

      saveToBackend(updatedTestCases, updatedTasks, totalScore)
    }
  }

  const handleDeleteTest = (id: string) => {
    if (confirm("Are you sure you want to delete this test case?")) {
      const updatedTestCases = testCases.filter(t => t.id !== id)
      setTestCases(updatedTestCases)
      saveToBackend(updatedTestCases, tasks, totalScore)
    }
  }

  const handleSaveChanges = () => {
    saveToBackend(testCases, tasks, totalScore)
  }

  const saveToBackend = async (
    currentTestCases: TestCase[], 
    currentTasks: TestTask[], 
    currentTotalScore?: number
  ) => {
    if (!selectedLab) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    // Denormalize taskId back to specific key if needed (TaskId or subQuestionId)
    // Actually, we should check what the backend expects.
    // The previous code verified that `Tasks` and `subQuestions` are updated.
    // But `testCases` array inside DB stores the object.
    
    // We map `taskId` back to the legacy key expected by other parts of the system if necessary.
    // ITCS123 uses `TaskId` inside testCase object.
    // ITCS251 uses `subQuestionId`.
    const denormalizedTestCases = currentTestCases.map(tc => {
       const newTc = { ...tc }
       if (taskKey === 'Tasks') {
         newTc['TaskId'] = tc.taskId
         delete newTc.taskId
       } else {
         newTc['subQuestionId'] = tc.taskId
         delete newTc.taskId
       }
       return newTc
    })

    try {
      const body: any = {
        id: selectedLab.id,
        testCases: JSON.stringify(denormalizedTestCases),
        // Dynamic key for tasks
        [taskKey]: JSON.stringify(currentTasks)
      }
      
      if (hasTotalScore) {
        body.totalScore = currentTotalScore
      }

      const res = await fetch("/api/labs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      
      const data = await res.json()
      if (data.success) {
        setSuccess("Saved successfully!")
        
        // Update local labs state
        setLabs(prev => prev.map(l => 
          l.id === selectedLab.id 
            ? { ...l, testCases: JSON.stringify(denormalizedTestCases), [taskKey]: JSON.stringify(currentTasks), totalScore: currentTotalScore } 
            : l
        ))
      } else {
        setError(data.error || "Failed to save changes")
      }
    } catch (err) {
      setError("An error occurred while saving")
    } finally {
      setSaving(false)
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-10 w-10 border-4 border-${colorTheme.accent}-200 dark:border-${colorTheme.accent}-800 border-t-${colorTheme.accent}-600 dark:border-t-${colorTheme.accent}-400`}></div>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Checking permissions...</p>
        </div>
      </div>
    )
  }

  // Filter labs if Challenge Mode is enabled
  const displayedLabs = hasChallengeMode 
    ? labs.filter(lab => (lab.labType || 'Lab') === labTypeFilter)
    : labs

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colorTheme.gradient} dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden`}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 -left-4 w-96 h-96 bg-${colorTheme.accent}-300 dark:bg-${colorTheme.accent}-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float`}></div>
        <div className={`absolute top-0 -right-4 w-96 h-96 bg-${colorTheme.accent === 'blue' ? 'indigo' : 'orange'}-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float`} style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push(`/admin/${subjectCode.toLowerCase()}`)} 
              className={`p-2 hover:bg-${colorTheme.accent}-50 dark:hover:bg-${colorTheme.accent}-900/20 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-${colorTheme.accent}-600`}>
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className={`text-3xl font-bold bg-gradient-to-r ${accentGradients[colorTheme.accent] || accentGradients.blue} bg-clip-text text-transparent`}>
                Manage Test Cases
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">{subjectCode.toUpperCase()} - {subjectTitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Lab List Sidebar */}
            <div className="lg:col-span-1 animate-fade-in">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-200">Select Lab</h2>
                </div>
                
                {hasChallengeMode && (
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
                      <button
                          onClick={() => setLabTypeFilter('Lab')}
                          className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                              labTypeFilter === 'Lab'
                              ? `bg-${colorTheme.accent}-600 text-white`
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                      >
                          Labs
                      </button>
                      <button
                          onClick={() => setLabTypeFilter('Challenge')}
                          className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                              labTypeFilter === 'Challenge'
                              ? `bg-purple-600 text-white`
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                      >
                          Challenges
                      </button>
                  </div>
                )}
                
                <div className="space-y-2">
                    {loading ? (
                        <div className="text-slate-500 dark:text-slate-400 animate-pulse">Loading labs...</div>
                    ) : (
                        displayedLabs.map(lab => (
                            <button
                                key={lab.id}
                                onClick={() => handleSelectLab(lab)}
                                className={`w-full text-left p-4 rounded-xl transition-all border ${
                                    selectedLab?.id === lab.id 
                                    ? `bg-${colorTheme.accent}-50 dark:bg-${colorTheme.accent}-500/20 border-${colorTheme.accent}-200 dark:border-${colorTheme.accent}-500/50 text-slate-900 dark:text-slate-200`
                                    : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
                                }`}
                            >
                                <div className="font-medium">{lab.title}</div>
                                <div className="text-xs opacity-70 mt-1">
                                    {hasChallengeMode && lab.labType === 'Challenge' ? 'Challenge' : 'Lab'} {lab.labNumber}
                                </div>
                            </button>
                        ))
                    )}
                </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="lg:col-span-2 space-y-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                {selectedLab ? (
                    <>
                        <div className="flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{selectedLab.title}</h2>
                                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                                    {testCases.length} Test Case{testCases.length !== 1 && 's'} Defined
                                    {tasks.length > 0 && <span className="mx-2">•</span>}
                                    {tasks.length > 0 && `${tasks.length} ${taskLabel.toLowerCase()}${tasks.length !== 1 ? 's' : ''}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleOpenTaskModal()}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-all border border-purple-500/20"
                                >
                                    <Plus size={18} />
                                    Add {taskLabel}
                                </button>
                                <button 
                                    onClick={() => handleOpenModal()}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                                >
                                    <Plus size={18} />
                                    Add Test Case
                                </button>
                                <button 
                                    onClick={handleSaveChanges}
                                    disabled={saving}
                                    className={`flex items-center gap-2 px-6 py-2 ${colorTheme.secondary} text-white rounded-lg hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {saving ? (
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    Save Changes
                                </button>
                            </div>
                        </div>

                        {hasTotalScore && (
                          <div className="bg-[#161b22] p-6 rounded-2xl border border-white/5">
                              <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                      <label className="text-sm font-medium text-slate-300 block mb-2">
                                          Total Score (Max Points)
                                      </label>
                                      <input 
                                          type="number" 
                                          value={totalScore ?? ''}
                                          onChange={(e) => setTotalScore(e.target.value ? parseInt(e.target.value) : undefined)}
                                          placeholder="e.g. 100"
                                          className="w-full max-w-xs bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                          min="0"
                                      />
                                      <p className="text-xs text-slate-500 mt-2">
                                          Used for gradient color display (red → yellow → green)
                                      </p>
                                  </div>
                              </div>
                          </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3 animate-slide-down">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div className="p-4 bg-green-50 dark:bg-emerald-500/10 border border-green-200 dark:border-emerald-500/20 rounded-xl text-green-600 dark:text-emerald-400 flex items-center gap-3 animate-slide-down">
                                <CheckCircle size={20} />
                                {success}
                            </div>
                        )}

                        {/* Test Cases List */}
                        <div className="space-y-6">
                            {/* No task Section */}
                            {testCases.some(tc => !tc.taskId) && (
                                <div className="space-y-3">
                                    {tasks.length > 0 && (
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                                            <span className="text-slate-500 dark:text-slate-400">No {taskLabel.toLowerCase()}</span>
                                        </h3>
                                    )}
                                    <div className="grid gap-3 md:gap-4">
                                        {testCases
                                            .map((test, idx) => ({ test, originalIndex: idx }))
                                            .filter(({ test }) => !test.taskId)
                                            .map(({ test, originalIndex }) => (
                                            <div key={test.id} className="bg-[#161b22] p-4 md:p-6 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-mono text-sm border border-white/5">
                                                            {originalIndex + 1}
                                                        </div>
                                                        <h3 className="font-semibold text-white text-lg">{test.name}</h3>
                                                        {test.matchMode === 'exact' && (
                                                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/30">EXACT</span>
                                                        )}
                                                        {test.matchMode === 'regex' && (
                                                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">REGEX</span>
                                                        )}
                                                        {test.verificationCode && (
                                                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold border border-yellow-500/30">VERIFIED</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleOpenModal(test)}
                                                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteTest(test.id)}
                                                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Input</label>
                                                        <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-700 dark:text-slate-300 min-h-[60px] whitespace-pre-wrap">
                                                            {test.input || <span className="text-slate-400 dark:text-slate-600 italic">No input</span>}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Expected Output</label>
                                                        <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm text-green-600 dark:text-emerald-400/90 min-h-[60px] whitespace-pre-wrap">
                                                            {test.expectedOutput}
                                                        </div>
                                                    </div>
                                                    {test.verificationCode && (
                                                      <div className="col-span-1 md:col-span-2 space-y-2">
                                                        <label className="text-xs font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Verification Code (Hidden from Student)</label>
                                                        <div className="bg-yellow-900/10 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/30 font-mono text-sm text-yellow-700 dark:text-yellow-300 min-h-[40px] whitespace-pre-wrap">
                                                            {test.verificationCode}
                                                        </div>
                                                      </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tasks Sections */}
                            {tasks.sort((a, b) => a.order - b.order).map((task) => {
                                const taskTests = testCases
                                    .map((test, idx) => ({ test, originalIndex: idx }))
                                    .filter(({ test }) => test.taskId === task.id);
                                
                                return (
                                    <div key={task.id} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                                                <span className={`text-${colorTheme.accent}-600 dark:text-${colorTheme.accent}-400`}>{task.name}</span>
                                                <span className="text-sm text-slate-500 dark:text-slate-400">({taskTests.length} test{taskTests.length !== 1 ? 's' : ''})</span>
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleOpenModal(undefined, task.id)}
                                                    className="px-3 py-1.5 text-xs bg-green-50 dark:bg-emerald-500/10 text-green-600 dark:text-emerald-400 rounded-lg hover:bg-green-100 dark:hover:bg-emerald-500/20 transition-all border border-green-200 dark:border-emerald-500/20 flex items-center gap-1.5"
                                                >
                                                    <Plus size={14} />
                                                    Add Test
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenTaskModal(task)}
                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                    title="Edit task"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                    title="Delete task"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid gap-3 md:gap-4">
                                            {taskTests.map(({ test, originalIndex }) => (
                                                <div key={test.id} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-blue-500/20 group hover:border-blue-300 dark:hover:border-blue-500/40 transition-all shadow-sm">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-mono text-sm border border-slate-200 dark:border-slate-600">
                                                                {originalIndex + 1}
                                                            </div>
                                                            <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-lg">{test.name}</h3>
                                                              {test.matchMode === 'exact' && (
                                                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/30">EXACT</span>
                                                              )}
                                                              {test.matchMode === 'regex' && (
                                                                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">REGEX</span>
                                                              )}
                                                              {test.verificationCode && (
                                                                <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-bold border border-yellow-500/30">VERIFIED</span>
                                                              )}
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => handleOpenModal(test)}
                                                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                                            >
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteTest(test.id)}
                                                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Input</label>
                                                            <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm text-slate-700 dark:text-slate-300 min-h-[60px] whitespace-pre-wrap">
                                                                {test.input || <span className="text-slate-400 dark:text-slate-600 italic">No input</span>}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Expected Output</label>
                                                            <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm text-green-600 dark:text-emerald-400/90 min-h-[60px] whitespace-pre-wrap">
                                                                {test.expectedOutput}
                                                            </div>
                                                        </div>
                                                        {test.verificationCode && (
                                                          <div className="col-span-1 md:col-span-2 space-y-2">
                                                            <label className="text-xs font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Verification Code (Hidden from Student)</label>
                                                            <div className="bg-yellow-900/10 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/30 font-mono text-sm text-yellow-700 dark:text-yellow-300 min-h-[40px] whitespace-pre-wrap">
                                                                {test.verificationCode}
                                                            </div>
                                                          </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {testCases.length === 0 && (
                                <div className="text-center py-12 text-slate-500 bg-[#161b22] rounded-2xl border border-white/5 border-dashed">
                                    <div className="mb-4 flex justify-center">
                                        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                                            <Plus size={32} className="opacity-50" />
                                        </div>
                                    </div>
                                    <p className="text-lg font-medium text-slate-400">No test cases defined</p>
                                    <p className="text-sm mt-1">Create a new test case to get started</p>
                                    <button 
                                        onClick={() => handleOpenModal()}
                                        className="mt-6 px-6 py-2 bg-blue-600/10 text-blue-400 rounded-lg hover:bg-blue-600/20 transition-all font-medium"
                                    >
                                        Create First Test Case
                                    </button>
                                </div>
                            )}
                        </div>

                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 min-h-[400px]">
                        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center">
                            <AlertCircle size={40} className="opacity-50" />
                        </div>
                        <p className="text-xl font-medium">Select a lab to manage test cases</p>
                    </div>
                )}
            </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-[#161b22] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">
                            {currentTest ? "Edit Test Case" : "New Test Case"}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                            <XCircle size={24} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Test Name</label>
                            <input 
                                type="text" 
                                value={testName}
                                onChange={(e) => setTestName(e.target.value)}
                                placeholder="e.g. Basic Addition"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        
                        {tasks.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">{taskLabel} (Optional)</label>
                                <select
                                    value={selectedTaskId || ''}
                                    onChange={(e) => setSelectedTaskId(e.target.value || undefined)}
                                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="">No {taskLabel.toLowerCase()}</option>
                                    {tasks.sort((a, b) => a.order - b.order).map(sq => (
                                        <option key={sq.id} value={sq.id}>{sq.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Input (standard in)</label>
                            <textarea 
                                value={testInput}
                                onChange={(e) => setTestInput(e.target.value)}
                                placeholder="The input for the test"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono min-h-[120px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Expected output</label>
                            <textarea 
                                value={testOutput}
                                onChange={(e) => setTestOutput(e.target.value)}
                                placeholder="The expected output for the test"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono min-h-[120px]"
                            />
                        </div>

                        <div className="space-y-2">
                             <select
                                value={testMatchMode}
                                onChange={(e) => setTestMatchMode(e.target.value as 'trim' | 'exact' | 'regex')}
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                             >
                                {allowedMatchModes.includes('trim') && <option value="trim">Match (Trim Whitespace)</option>}
                                {allowedMatchModes.includes('exact') && <option value="exact">Match (Exact)</option>}
                                {allowedMatchModes.includes('regex') && <option value="regex">Match (Regular Expression)</option>}
                             </select>
                        </div>

                        {hasVerificationCode && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <label className="text-sm font-medium text-yellow-400">Verification Code (Optional - For File I/O)</label>
                                <p className="text-xs text-slate-500 mb-1">
                                    Python code that runs AFTER student code. Use this to check for file existence or content.
                                    Defaults to student's output if left empty.
                                </p>
                                <textarea 
                                    value={testVerificationCode}
                                    onChange={(e) => setTestVerificationCode(e.target.value)}
                                    placeholder={'import os\\n# Check if file exists silently\\nassert os.path.exists("output.txt"), "File output.txt missing"\\n# If valid, do nothing. If invalid, raise error.'}
                                    className="w-full bg-[#0d1117] border border-yellow-500/20 rounded-lg p-3 text-yellow-100 focus:outline-none focus:border-yellow-500 transition-colors font-mono min-h-[120px] text-xs leading-relaxed"
                                    spellCheck={false}
                                />
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-[#0d1117]/50">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveTest}
                            className={`px-6 py-2 ${colorTheme.secondary} text-white rounded-lg hover:opacity-90 transition-colors font-medium`}
                        >
                            {currentTest ? "Update Test Case" : "Create Test Case"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Task Modal */}
        {isTaskModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-[#161b22] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">
                            {currentTask ? `Edit ${taskLabel}` : `New ${taskLabel}`}
                        </h3>
                        <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-white">
                            <XCircle size={24} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">{taskLabel} Name</label>
                            <input 
                                type="text" 
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                placeholder={`e.g. Question 1, Part A`}
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-[#0d1117]/50">
                        <button 
                            onClick={() => setIsTaskModalOpen(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveTask}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors font-medium"
                        >
                            {currentTask ? `Update ${taskLabel}` : `Create ${taskLabel}`}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}
