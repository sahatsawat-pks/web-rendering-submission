"use client"

import { useState, useEffect } from "react"
import { Play, Code2, AlertCircle, CheckCircle2, XCircle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

interface TestCase {
  id: string
  name: string
  input: string
  expectedOutput: string
  actualOutput?: string
  status: 'pending' | 'running' | 'pass' | 'fail'
  errorMessage?: string
  matchMode?: 'trim' | 'exact' | 'regex'
}

export default function PythonTestRunner() {
  const [code, setCode] = useState(`# Write your Python code here
# Example: Read two integers and print their sum

a = int(input())
b = int(input())
print(a + b)`)
  const [labNumber, setLabNumber] = useState("")
  const [labs, setLabs] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [selectedTask, setSelectedTask] = useState<string>("all")
  const [runningTestId, setRunningTestId] = useState<string | null>(null)

  // Expanded results state
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)
  
  // Custom Run State
  const [customInput, setCustomInput] = useState("")
  const [customOutput, setCustomOutput] = useState<string | null>(null)

  const runCustomTest = async () => {
      setIsRunning(true)
      setCustomOutput(null)
      
      try {
        const response = await fetch('/api/run-python', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                input: customInput
            })
        })
        const result = await response.json()
        setCustomOutput((result.output || "") + (result.error ? `\nError:\n${result.error}` : ""))
      } catch (e) {
          setCustomOutput("Execution failed: Server Error")
      } finally {
          setIsRunning(false)
      }
  }

  // Load labs on mount
  useEffect(() => {
    async function loadLabs() {
      try {
        const res = await fetch("/api/labs?activeOnly=true&subject=ITCS251")
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            const sortedLabs = data.labs
              .sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber))
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

  // Update test cases when lab changes
  useEffect(() => {
    if (labNumber && labs.length > 0) {
      const currentLab = labs.find(l => l.labNumber === labNumber)
      if (currentLab && currentLab.testCases) {
        try {
            const parsed = JSON.parse(currentLab.testCases)
            // Parse tasks if available
            let tasksData: any[] = []
            if (currentLab.subQuestions) {
              try {
                tasksData = JSON.parse(currentLab.subQuestions)
              } catch (e) {
                console.error("Error parsing tasks", e)
              }
            }
            // Map test cases with task info
            const mappedTests = parsed.map((t: any) => {
              const task = tasksData.find(sq => sq.id === t.subQuestionId)
              return {
                ...t,
                status: 'pending',
                actualOutput: undefined,
                taskName: task?.name || null
              }
            })
            setTestCases(mappedTests)
            setSelectedTask("all")
        } catch (e) {
            console.error("Error parsing test cases", e)
            setTestCases([])
        }
      } else {
        setTestCases([])
      }
    }
  }, [labNumber, labs])

  const runSingleTest = async (testId: string) => {
    setRunningTestId(testId)
    
    const testIndex = testCases.findIndex(t => t.id === testId)
    if (testIndex === -1) return
    
    const test = testCases[testIndex]
    
    setTestCases(prev => prev.map(t => 
      t.id === testId ? { ...t, status: 'running' as const, actualOutput: undefined, errorMessage: undefined } : t
    ))
    
    try {
      const response = await fetch('/api/run-python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          input: test.input
        })
      })
      
      const result = await response.json()
      
      setTestCases(prev => prev.map(t => {
        if (t.id !== testId) return t
        
        const updatedTest = { ...t }
        
        if (result.error && !result.output) {
          updatedTest.status = 'fail'
          updatedTest.actualOutput = result.output || ''
          updatedTest.errorMessage = result.error
        } else {
          const rawActual = result.output || ''
          const rawExpected = updatedTest.expectedOutput
          
          const actualNorm = rawActual.replace(/\r\n/g, '\n')
          const expectedNorm = rawExpected.replace(/\r\n/g, '\n')
          
          const mode = updatedTest.matchMode || 'trim'
          let passed = false
          
          if (mode === 'trim') {
            passed = actualNorm.trim() === expectedNorm.trim()
          } else if (mode === 'exact') {
            passed = actualNorm === expectedNorm
          } else if (mode === 'regex') {
            try {
                const regex = new RegExp(expectedNorm.trim())
                passed = regex.test(actualNorm)
            } catch (e: any) {
                passed = false
                updatedTest.errorMessage = "Invalid Regex Pattern: " + e.message
            }
          }
          
          updatedTest.status = passed ? 'pass' : 'fail'
          updatedTest.actualOutput = (result.output || '') + (result.error ? `\n\nError Stream:\n${result.error}` : '')
        }
        
        return updatedTest
      }))
    } catch (e: any) {
      console.error("Test execution failed", e)
      setTestCases(prev => prev.map(t => 
        t.id === testId ? { ...t, status: 'fail', errorMessage: "Network or Server Error" } : t
      ))
    } finally {
      setRunningTestId(null)
    }
  }

  const runTests = async () => {
    setIsRunning(true)
    setCustomOutput(null)
    
    // Filter tests by selected task
    const testsToRun = selectedTask === "all" 
      ? testCases 
      : testCases.filter(t => (t as any).taskName === selectedTask)
    
    // First, reset ALL tests to pending (clear old results)
    setTestCases(prev => prev.map(t => ({ 
      ...t, 
      status: 'pending', 
      actualOutput: undefined, 
      errorMessage: undefined 
    })))
    
    // Then set only the tests we're about to run to 'running'
    setTestCases(prev => prev.map(t => {
      const shouldRun = selectedTask === "all" || (t as any).taskName === selectedTask
      return shouldRun ? { ...t, status: 'running' } : t
    }))

    for (let i = 0; i < testsToRun.length; i++) {
        const test = testsToRun[i]
        const originalIndex = testCases.findIndex(tc => tc.id === test.id)
        
        try {
            const response = await fetch('/api/run-python', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    input: test.input
                })
            })
            
            const result = await response.json()
            
            setTestCases(prev => prev.map(t => {
                if (t.id !== test.id) return t

                const updatedTest = { ...t }
                
                // Logging for debug
                console.log(`Test ${test.id} result:`, result)

                if (result.error && !result.output) {
                     updatedTest.status = 'fail'
                     updatedTest.actualOutput = result.output || ''
                     updatedTest.errorMessage = result.error
                } else {
                    const rawActual = result.output || ''
                    const rawExpected = updatedTest.expectedOutput
                    
                    const actualNorm = rawActual.replace(/\r\n/g, '\n')
                    const expectedNorm = rawExpected.replace(/\r\n/g, '\n')
                    
                    const mode = updatedTest.matchMode || 'trim'
                    let passed = false
                    
                    if (mode === 'trim') {
                        passed = actualNorm.trim() === expectedNorm.trim()
                    } else if (mode === 'exact') {
                        passed = actualNorm === expectedNorm
                    } else if (mode === 'regex') {
                        try {
                            const regex = new RegExp(expectedNorm.trim())
                            passed = regex.test(actualNorm)
                        } catch (e: any) {
                            passed = false
                            updatedTest.errorMessage = "Invalid Regex Pattern: " + e.message
                        }
                    }
                    
                    updatedTest.status = passed ? 'pass' : 'fail'
                    updatedTest.actualOutput = (result.output || '') + (result.error ? `\n\nError Stream:\n${result.error}` : '')
                }
                
                return updatedTest
            }))

        } catch (e: any) {
            console.error("Test execution failed", e)
             setTestCases(prev => prev.map(t => {
                if (t.id !== test.id) return t
                return {
                    ...t,
                    status: 'fail',
                    errorMessage: "Network or Server Error"
                }
            }))
        }
    }
    
    setIsRunning(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-mono animate-fade-in">
       {/* Navigation */}
       <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
             <a
              href="/itcs251"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-100"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
             <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">
              <span className="text-xs">PY</span>
            </div>
            <span className="font-bold text-slate-100">
              ITCS251 Programming in Python
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Code Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Lab Selection */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 space-y-2 md:space-y-3">
                <div className="flex items-center gap-4">
                    <label className="text-xs text-slate-400 font-bold">LAB:</label>
                    <select
                        value={labNumber}
                        onChange={e => setLabNumber(e.target.value)}
                        className="flex-1 bg-slate-800 text-slate-200 px-3 py-1.5 rounded text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Choose Lab</option>
                        {labs.map(lab => (
                            <option key={lab.id} value={lab.labNumber}>
                                Lab {lab.labNumber}: {lab.title}
                            </option>
                        ))}
                    </select>
                </div>
                {labNumber && testCases.length > 0 && (() => {
                  const tasks = Array.from(new Set(testCases.map(t => (t as any).taskName).filter(Boolean)))
                  if (tasks.length > 0) {
                    return (
                      <div className="flex items-center gap-4">
                        <label className="text-xs text-slate-400 font-bold">TASK:</label>
                        <select
                          value={selectedTask}
                          onChange={e => setSelectedTask(e.target.value)}
                          className="flex-1 bg-slate-800 text-slate-200 px-3 py-1.5 rounded text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Tasks</option>
                          {tasks.map(task => (
                            <option key={task} value={task}>{task}</option>
                          ))}
                        </select>
                      </div>
                    )
                  }
                  return null
                })()}
            </div>

            {/* Editor Header */}
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    solution.py
                </span>
            </div>
            
            <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                className="flex-1 bg-slate-950 p-4 font-mono text-sm resize-none focus:outline-none text-slate-300 leading-relaxed"
                spellCheck={false}
                placeholder="Paste your Python code here..."
            />
        </div>

        {/* Right Panel - Test Runner */}
        <div className="w-full lg:w-96 flex flex-col bg-slate-900/50 border-t lg:border-t-0 lg:border-l border-slate-800 max-h-[50vh] lg:max-h-none">
             <div className="bg-slate-900 px-4 py-4 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-100">Input/Output Tests</h2>
                </div>
            </div>

            {/* Test runner */}
            <div className="p-3 md:p-4 border-b border-slate-800 bg-slate-900/30 space-y-2 md:space-y-3">
                 <div className="flex gap-2">
                    <button 
                        onClick={runTests}
                        disabled={isRunning || !labNumber || testCases.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-700"
                    >
                        {isRunning ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Play className="w-4 h-4 fill-current" />}
                        {testCases.length === 0 ? "No Tests Configured" : "Run All Tests"}
                    </button>
                </div>
                
                <div className="pt-2 border-t border-white/5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">Custom Input Test</label>
                    <div className="space-y-2">
                         <textarea 
                            value={customInput} 
                            onChange={(e) => setCustomInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 resize-none" 
                            placeholder="Enter input (one value per line)&#10;Example:&#10;5&#10;10"
                            rows={4}
                         />
                         <button
                            onClick={runCustomTest}
                            disabled={isRunning}
                            className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                         >
                            {isRunning ? <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div> : <Play className="w-3 h-3" />}
                            Run Custom Input
                         </button>
                    </div>
                    {customOutput && (
                        <div className="mt-2 bg-slate-950 p-2 rounded border border-slate-800 animate-fade-in">
                            <span className="text-[10px] text-slate-500 block mb-1">Output:</span>
                            <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap">{customOutput}</div>
                        </div>
                    )}
                </div>

                {/* Test Results Summary */}
                {(() => {
                    const filteredTests = selectedTask === "all" 
                      ? testCases 
                      : testCases.filter(t => (t as any).taskName === selectedTask)
                    const hasResults = filteredTests.some(t => t.status === 'pass' || t.status === 'fail')
                    
                    if (!hasResults || isRunning || filteredTests.length === 0) return null
                    
                    return (
                    <div className="pt-2 border-t border-white/5">
                        {(() => {
                            const totalTests = filteredTests.length
                            const passedTests = filteredTests.filter(t => t.status === 'pass').length
                            const percentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
                            
                            let bgColor, borderColor, textColor, icon, message
                            
                            if (passedTests === totalTests) {
                                bgColor = 'bg-green-950/30'
                                borderColor = 'border-green-500/50'
                                textColor = 'text-green-400'
                                icon = <CheckCircle2 className="w-5 h-5" />
                                message = '🎉 Congratulations! All tests passed!'
                            } else if (passedTests === 0) {
                                bgColor = 'bg-red-950/30'
                                borderColor = 'border-red-500/50'
                                textColor = 'text-red-400'
                                icon = <XCircle className="w-5 h-5" />
                                message = 'Keep trying! Review the test results below.'
                            } else {
                                bgColor = 'bg-amber-950/30'
                                borderColor = 'border-amber-500/50'
                                textColor = 'text-amber-400'
                                icon = <AlertCircle className="w-5 h-5" />
                                message = 'Almost there! Try again to pass all tests.'
                            }
                            
                            return (
                                <div className={`${bgColor} border ${borderColor} rounded-lg p-3 space-y-2 animate-fade-in`}>
                                    <div className="flex items-start gap-2">
                                        <div className={textColor}>{icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-bold text-sm ${textColor}`}>{message}</div>
                                            <div className="text-slate-400 text-xs mt-1">
                                                Passed: <span className={`font-bold ${textColor}`}>{passedTests}/{totalTests}</span> 
                                                <span className="text-slate-600 mx-1">•</span> 
                                                {percentage}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                    )
                })()}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/50">
                {!labNumber && (
                    <div className="text-amber-400 italic flex items-center gap-2 text-xs p-2">
                        <AlertCircle className="w-4 h-4" />
                        Please select a lab first.
                    </div>
                )}
                
                {(() => {
                  // Filter tests by selected task
                  const filteredTests = selectedTask === "all" 
                    ? testCases 
                    : testCases.filter(t => (t as any).taskName === selectedTask)
                  
                  // Group tests by task
                  const grouped: { [key: string]: typeof testCases } = {}
                  filteredTests.forEach(test => {
                    const key = (test as any).taskName || '__no_task__'
                    if (!grouped[key]) grouped[key] = []
                    grouped[key].push(test)
                  })
                  
                  return Object.entries(grouped).map(([taskName, tests]) => (
                    <div key={taskName}>
                      {taskName !== '__no_task__' && (
                        <div className="mb-2 px-2">
                          <div className="text-xs font-bold text-blue-400 uppercase tracking-wide">{taskName}</div>
                          <div className="h-px bg-blue-500/30 mt-1"></div>
                        </div>
                      )}
                      {tests.map((test) => (
                    <div key={test.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-slate-700 transition-colors">
                        <div className="p-3 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-slate-200 truncate pr-2">{test.name}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    {test.status === 'pending' && <span className="text-xs text-slate-500 flex items-center gap-1">Not run</span>}
                                    {test.status === 'running' && <span className="text-xs text-blue-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div> Running...</span>}
                                    {test.status === 'pass' && <span className="text-xs text-green-400 flex items-center gap-1 font-bold"><CheckCircle2 className="w-3 h-3" /> Passed</span>}
                                    {test.status === 'fail' && <span className="text-xs text-red-400 flex items-center gap-1 font-bold"><XCircle className="w-3 h-3" /> Failed</span>}
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-3 pb-3 flex items-center justify-between gap-2">
                            <button 
                                onClick={() => runSingleTest(test.id)}
                                disabled={runningTestId === test.id || isRunning}
                                className="text-[10px] font-bold uppercase tracking-wider text-white bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed"
                            >
                                {runningTestId === test.id ? (
                                  <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div>
                                ) : (
                                  <Play className="w-3 h-3" />
                                )}
                                {runningTestId === test.id ? 'Running' : 'Run Test'}
                            </button>
                            <button 
                                onClick={() => setExpandedTestId(expandedTestId === test.id ? null : test.id)}
                                className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                            >
                                {expandedTestId === test.id ? 'Hide' : 'Details'}
                                {expandedTestId === test.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                        </div>

                        {/* Expanded Details */}
                        {expandedTestId === test.id && (
                            <div className="bg-slate-950/50 border-t border-slate-800 p-3 text-xs font-mono space-y-2 animate-slide-up">
                                <div>
                                    <span className="text-slate-500 block mb-0.5">Input:</span>
                                    <div className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 whitespace-pre-wrap">{test.input || <span className="text-slate-600 italic">None</span>}</div>
                                </div>
                                <div>
                                    <span className="text-slate-500 block mb-0.5">Expected Output:</span>
                                    <div className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 whitespace-pre-wrap">{test.expectedOutput}</div>
                                </div>
                                {test.actualOutput !== undefined && (
                                    <>
                                        <div>
                                            <span className="text-slate-500 block mb-0.5">Actual Output:</span>
                                            <div className={`bg-slate-900 border border-slate-800 rounded px-2 py-1 whitespace-pre-wrap ${test.status === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                                                {test.actualOutput || <span className="text-slate-600 italic">No output received</span>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                    </div>
                  ))
                })()}

                {testCases.length === 0 && (
                   <div className="text-center py-10 px-4">
                       <div className="bg-slate-900/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-800 text-slate-600">
                           <Code2 className="w-8 h-8" />
                       </div>
                       <h3 className="text-slate-400 font-semibold text-sm">No tests created</h3>
                       <p className="text-slate-600 text-xs mt-1">Create a test case to verify your code logic.</p>
                   </div>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}
