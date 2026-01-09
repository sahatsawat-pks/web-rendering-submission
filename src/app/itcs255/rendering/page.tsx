"use client"

import { useState, useEffect } from "react"
import { Play, Database, AlertCircle, CheckCircle2, XCircle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

interface TestCase {
  id: string
  name: string
  input: string
  expectedOutput: string
  actualOutput?: string
  status: 'pending' | 'running' | 'pass' | 'fail'
  errorMessage?: string
  matchMode?: 'trim' | 'exact'
  // SQL-specific fields
  setupSql?: string
  verificationSql?: string
  testType?: 'query_result' | 'structure_check' | 'data_check'
  shouldFail?: boolean
  cleanupSql?: string
}

export default function SQLTestRunner() {
  const [query, setQuery] = useState(`-- Write your SQL query here
-- Example: Select all records from a table

SELECT * FROM students;`)
  const [labNumber, setLabNumber] = useState("")
  const [labs, setLabs] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)
  const [customInput, setCustomInput] = useState("")
  const [customOutput, setCustomOutput] = useState<string | null>(null)

  const runCustomTest = async () => {
      setIsRunning(true)
      setCustomOutput(null)
      
      try {
        const response = await fetch('/api/run-sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
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

  useEffect(() => {
    async function loadLabs() {
      try {
        const res = await fetch("/api/labs?activeOnly=true&subject=ITCS255")
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

  useEffect(() => {
    if (labNumber && labs.length > 0) {
      const currentLab = labs.find(l => l.labNumber === labNumber)
      if (currentLab && currentLab.testCases) {
        try {
            const parsed = JSON.parse(currentLab.testCases)
            // Parse sub-questions if available
            let subQuestionsData: any[] = []
            if (currentLab.subQuestions) {
              try {
                subQuestionsData = JSON.parse(currentLab.subQuestions)
              } catch (e) {
                console.error("Error parsing sub-questions", e)
              }
            }
            // Map test cases with sub-question info and SQL fields
            const mappedTests = parsed.map((t: any) => {
              const subQ = subQuestionsData.find(sq => sq.id === t.subQuestionId)
              return {
                ...t,
                status: 'pending',
                actualOutput: undefined,
                subQuestionName: subQ?.name || null,
                // Preserve SQL-specific fields
                setupSql: t.setupSql,
                verificationSql: t.verificationSql,
                testType: t.testType || 'query_result',
                shouldFail: t.shouldFail || false,
                cleanupSql: t.cleanupSql
              }
            })
            setTestCases(mappedTests)
        } catch (e) {
            setTestCases([])
        }
      } else {
        setTestCases([])
      }
    }
  }, [labNumber, labs])

  const runTests = async () => {
    setIsRunning(true)
    setTestCases(prev => prev.map(t => ({ ...t, status: 'running', actualOutput: undefined, errorMessage: undefined })))

    const newCases = [...testCases]
    const currentLab = labs.find(l => l.labNumber === labNumber)
    const databaseStarter = currentLab?.databaseStarter
    
    // Generate session ID for database persistence
    const sessionId = `student_${Date.now()}_${labNumber}`
    
    for (let i = 0; i < newCases.length; i++) {
        const test = newCases[i]
        const isLastTest = i === newCases.length - 1
        
        try {
            const response = await fetch('/api/run-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    input: test.input,
                    setupSql: test.setupSql,
                    verificationSql: test.verificationSql,
                    cleanupSql: test.cleanupSql,
                    databaseStarter: i === 0 ? databaseStarter : undefined, // Only pass database starter on first test
                    testType: test.testType || 'query_result',
                    expectedOutput: test.expectedOutput,
                    matchMode: test.matchMode || 'trim',
                    sessionId: sessionId, // Track session across tests
                    isLastTest: isLastTest // Flag to cleanup database on last test
                })
            })
            
            const result = await response.json()
            
            setTestCases(prev => {
                const current = [...prev]
                const activeTest = current[i]
                
                // For shouldFail tests, check if error occurred as expected
                if (test.shouldFail) {
                    if (result.error) {
                        activeTest.status = 'pass'
                        activeTest.actualOutput = `Expected error occurred: ${result.error}`
                    } else {
                        activeTest.status = 'fail'
                        activeTest.actualOutput = `Expected error but query succeeded: ${result.output || ''}`
                    }
                } else if (result.error && !result.output) {
                    activeTest.status = 'fail'
                    activeTest.actualOutput = result.output || ''
                    activeTest.errorMessage = result.error
                } else {
                    // Use the passed flag from the API if available
                    if (result.passed !== undefined) {
                        activeTest.status = result.passed ? 'pass' : 'fail'
                        activeTest.actualOutput = (result.output || '') + (result.error ? `\n\nError:\n${result.error}` : '')
                    } else {
                        // Fallback to manual comparison
                        const rawActual = result.output || ''
                        const rawExpected = activeTest.expectedOutput
                        
                        const actualNorm = rawActual.replace(/\r\n/g, '\n')
                        const expectedNorm = rawExpected.replace(/\r\n/g, '\n')
                        
                        const mode = activeTest.matchMode || 'trim'
                        const passed = mode === 'trim' 
                            ? actualNorm.trim() === expectedNorm.trim()
                            : actualNorm === expectedNorm
                        
                        activeTest.status = passed ? 'pass' : 'fail'
                        activeTest.actualOutput = (result.output || '') + (result.error ? `\n\nError:\n${result.error}` : '')
                    }
                }
                
                return current
            })

        } catch (e: any) {
             setTestCases(prev => {
                const current = [...prev]
                current[i].status = 'fail'
                current[i].errorMessage = "Network or Server Error"
                return current
            })
        }
    }
    
    setIsRunning(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-mono animate-fade-in">
       <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
             <a href="/itcs255" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-100">
              <ArrowLeft className="w-4 h-4" />
            </a>
             <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-600 text-white font-bold">
              <span className="text-xs">SQL</span>
            </div>
            <span className="font-bold text-slate-100">ITCS255 Structured Query Language Essentials</span>
          </div>
          <ModeToggle />
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <label className="text-xs text-slate-400 font-bold">SELECT:</label>
                    <select
                        value={labNumber}
                        onChange={e => setLabNumber(e.target.value)}
                        className="flex-1 bg-slate-800 text-slate-200 px-3 py-1.5 rounded text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Choose Lab</option>
                        {labs.map(lab => (
                            <option key={lab.id} value={lab.labNumber}>Lab {lab.labNumber}: {lab.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    query.sql
                </span>
            </div>
            
            <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-slate-950 p-4 font-mono text-sm resize-none focus:outline-none text-slate-300 leading-relaxed"
                spellCheck={false}
                placeholder="Write your SQL query here..."
            />
        </div>

        <div className="w-full lg:w-96 flex flex-col bg-slate-900/50 border-t lg:border-t-0 lg:border-l border-slate-800 max-h-[50vh] lg:max-h-none">
             <div className="bg-slate-900 px-4 py-4 border-b border-slate-800">
                <h2 className="text-sm font-bold text-slate-100">Query Tests</h2>
            </div>

            <div className="p-3 md:p-4 border-b border-slate-800 bg-slate-900/30 space-y-2 md:space-y-3">
                 <button 
                    onClick={runTests}
                    disabled={isRunning || !labNumber || testCases.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white shadow-lg transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isRunning ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Play className="w-4 h-4 fill-current" />}
                    {testCases.length === 0 ? "No Tests" : "Run Tests"}
                </button>
                
                <div className="pt-2 border-t border-white/5">
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">Custom Test</label>
                    <button
                        onClick={runCustomTest}
                        disabled={isRunning}
                        className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isRunning ? <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div> : <Play className="w-3 h-3" />}
                        Execute Query
                    </button>
                    {customOutput && (
                        <div className="mt-2 bg-slate-950 p-2 rounded border border-slate-800 animate-fade-in">
                            <span className="text-[10px] text-slate-500 block mb-1">Result:</span>
                            <div className="font-mono text-xs text-slate-300 whitespace-pre-wrap">{customOutput}</div>
                        </div>
                    )}
                </div>

                {testCases.length > 0 && !isRunning && testCases.some(t => t.status === 'pass' || t.status === 'fail') && (
                    <div className="pt-2 border-t border-white/5">
                        {(() => {
                            const totalTests = testCases.length
                            const passedTests = testCases.filter(t => t.status === 'pass').length
                            const percentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
                            
                            return passedTests === totalTests ? (
                                <div className="bg-green-950/30 border border-green-500/50 rounded-lg p-3 animate-fade-in">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        <div>
                                            <div className="font-bold text-sm text-green-400">All tests passed! 🎉</div>
                                            <div className="text-slate-400 text-xs mt-1">
                                                {passedTests}/{totalTests} • {percentage}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-950/30 border border-amber-500/50 rounded-lg p-3 animate-fade-in">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-5 h-5 text-amber-400" />
                                        <div>
                                            <div className="font-bold text-sm text-amber-400">Review results</div>
                                            <div className="text-slate-400 text-xs mt-1">
                                                {passedTests}/{totalTests} • {percentage}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/50">
                {!labNumber && (
                    <div className="text-amber-400 italic flex items-center gap-2 text-xs p-2">
                        <AlertCircle className="w-4 h-4" />
                        Select a lab first
                    </div>
                )}
                
                {(() => {
                  // Group tests by sub-question
                  const grouped: { [key: string]: typeof testCases } = {}
                  testCases.forEach(test => {
                    const key = (test as any).subQuestionName || '__no_sub__'
                    if (!grouped[key]) grouped[key] = []
                    grouped[key].push(test)
                  })
                  
                  return Object.entries(grouped).map(([subQName, tests]) => (
                    <div key={subQName}>
                      {subQName !== '__no_sub__' && (
                        <div className="mb-2 px-2">
                          <div className="text-xs font-bold text-purple-400 uppercase tracking-wide">{subQName}</div>
                          <div className="h-px bg-purple-500/30 mt-1"></div>
                        </div>
                      )}
                      {tests.map((test) => (
                    <div key={test.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-3">
                            <h3 className="text-sm font-semibold text-slate-200">{test.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                {test.status === 'pending' && <span className="text-xs text-slate-500">Not run</span>}
                                {test.status === 'running' && <span className="text-xs text-purple-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div> Running...</span>}
                                {test.status === 'pass' && <span className="text-xs text-green-400 flex items-center gap-1 font-bold"><CheckCircle2 className="w-3 h-3" /> Passed</span>}
                                {test.status === 'fail' && <span className="text-xs text-red-400 flex items-center gap-1 font-bold"><XCircle className="w-3 h-3" /> Failed</span>}
                            </div>
                        </div>
                        
                        <div className="px-3 pb-3 flex justify-end">
                            <button 
                                onClick={() => setExpandedTestId(expandedTestId === test.id ? null : test.id)}
                                className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                            >
                                {expandedTestId === test.id ? 'Hide' : 'Show'}
                                {expandedTestId === test.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                        </div>

                        {expandedTestId === test.id && (
                            <div className="bg-slate-950/50 border-t border-slate-800 p-3 text-xs font-mono space-y-2">
                                {test.testType && (
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">Test Type:</span>
                                        <div className="inline-block bg-purple-600/20 border border-purple-500/30 rounded px-2 py-0.5 text-purple-300 text-[10px] font-bold uppercase">
                                            {test.testType.replace('_', ' ')}
                                        </div>
                                        {test.shouldFail && (
                                            <span className="ml-2 inline-block bg-orange-600/20 border border-orange-500/30 rounded px-2 py-0.5 text-orange-300 text-[10px] font-bold uppercase">
                                                Should Fail
                                            </span>
                                        )}
                                    </div>
                                )}
                                {test.setupSql && (
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">Setup SQL:</span>
                                        <div className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-400 whitespace-pre-wrap">{test.setupSql}</div>
                                    </div>
                                )}
                                {test.verificationSql && (
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">Verification SQL:</span>
                                        <div className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-400 whitespace-pre-wrap">{test.verificationSql}</div>
                                    </div>
                                )}
                                <div>
                                    <span className="text-slate-500 block mb-0.5">Expected:</span>
                                    <div className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 whitespace-pre-wrap">{test.expectedOutput}</div>
                                </div>
                                {test.actualOutput && (
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">Actual:</span>
                                        <div className={`bg-slate-900 border border-slate-800 rounded px-2 py-1 whitespace-pre-wrap ${test.status === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                                            {test.actualOutput}
                                        </div>
                                    </div>
                                )}
                                {test.cleanupSql && (
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">Cleanup SQL:</span>
                                        <div className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-400 whitespace-pre-wrap">{test.cleanupSql}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                    </div>
                  ))
                })()}

                {testCases.length === 0 && (
                   <div className="text-center py-10">
                       <Database className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                       <h3 className="text-slate-400 text-sm">No tests configured</h3>
                   </div>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}
