"use client"

import { useState, useEffect } from "react"
import { Github, Play, Code2, AlertCircle, CheckCircle2, XCircle, ArrowLeft } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export default function JavaTestRunner() {
  const [code, setCode] = useState(`public class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}`)
  const [labNumber, setLabNumber] = useState("")
  const [labs, setLabs] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<'success' | 'failure' | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [testStats, setTestStats] = useState<{ passed: number; total: number } | null>(null)

  // Load labs on mount
  useEffect(() => {
    async function loadLabs() {
      try {
        const res = await fetch("/api/labs?activeOnly=true")
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            const sortedLabs = data.labs
              .filter((lab: any) => lab.subject === "ITCS123")
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

  const runTests = async () => {
    setIsRunning(true)
    setLogs(["Compiling Java code...", "Running JUnit test cases..."])
    setResult(null)
    setTestStats(null)

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Mock Logic: Random pass/fail for demonstration
    const totalTests = 5
    const passedTests = code.length > 50 ? Math.floor(Math.random() * (totalTests + 1)) : 0

    if (passedTests === 0) {
        setLogs(prev => [...prev, "Compilation Error: Syntax error detected.", "Test Suite Aborted."])
        setResult('failure')
        setTestStats({ passed: 0, total: totalTests })
    } else {
        const newLogs = [
            ...logs,
            `Test 1: testAdd() - ${passedTests > 0 ? 'PASS ✓' : 'FAIL ✗'}`,
            `Test 2: testSubtract() - ${passedTests > 1 ? 'PASS ✓' : 'FAIL ✗'}`,
            `Test 3: testMultiply() - ${passedTests > 2 ? 'PASS ✓' : 'FAIL ✗'}`,
            `Test 4: testDivide() - ${passedTests > 3 ? 'PASS ✓' : 'FAIL ✗'}`,
            `Test 5: testEdgeCases() - ${passedTests > 4 ? 'PASS ✓' : 'FAIL ✗'}`,
            `\nResult: ${passedTests}/${totalTests} test cases passed.`
        ]
        setLogs(newLogs)
        setResult(passedTests === totalTests ? 'success' : 'failure')
        setTestStats({ passed: passedTests, total: totalTests })
    }
    setIsRunning(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-mono">
       {/* Navigation */}
       <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
             <a
              href="/"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-100"
              title="Back to Main Page"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
             <div className="flex h-8 w-8 items-center justify-center rounded bg-orange-600 text-white font-bold">
              <span className="text-xs">JS</span>
            </div>
            <span className="font-bold text-slate-100">
              ITCS123 Object Oriented Programming
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Lab & Editor */}
        <div className="flex-1 flex flex-col border-r border-slate-800">
            {/* Lab Selection */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center gap-4">
                <label className="text-xs text-slate-400 font-bold">LAB:</label>
                <select
                    value={labNumber}
                    onChange={e => setLabNumber(e.target.value)}
                    className="bg-slate-800 text-slate-200 px-3 py-1.5 rounded text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                    <option value="">Select Lab</option>
                    {labs.map(lab => (
                        <option key={lab.id} value={lab.labNumber}>
                            Lab {lab.labNumber}: {lab.title}
                        </option>
                    ))}
                </select>
            </div>

            {/* Editor Header */}
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    Solution.java
                </span>
            </div>
            
            <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                className="flex-1 bg-slate-950 p-4 font-mono text-sm resize-none focus:outline-none text-slate-300 leading-relaxed"
                spellCheck={false}
                placeholder="Paste your Java code here..."
            />
        </div>

        {/* Right Panel - Output & Results */}
        <div className="w-full lg:w-96 flex flex-col bg-slate-900/50">
             <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center h-[52px]">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Test Output</span>
                <button
                    onClick={runTests}
                    disabled={isRunning || !labNumber}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                        isRunning || !labNumber
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'
                    }`}
                >
                    {isRunning ? (
                        <>Running...</>
                    ) : (
                        <>
                            <Play className="w-3 h-3 fill-current" />
                            Run Tests
                        </>
                    )}
                </button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2">
                {!labNumber && (
                    <div className="text-amber-400 italic flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Please select a lab first.
                    </div>
                )}
                
                {logs.length === 0 && labNumber && (
                    <div className="text-slate-600 italic">No output to display. Run tests to see results.</div>
                )}
                
                {logs.map((log, i) => (
                    <div key={i} className={`${
                        log.includes('PASS') ? 'text-green-400' : 
                        log.includes('FAIL') ? 'text-red-400' :
                        log.includes('Error') ? 'text-red-400' : 
                        'text-slate-300'
                    }`}>
                        {log}
                    </div>
                ))}
                
                {testStats && (
                    <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded">
                        <div className="text-slate-300 font-bold mb-2">Test Summary</div>
                        <div className={`text-2xl font-bold ${testStats.passed === testStats.total ? 'text-green-400' : 'text-amber-400'}`}>
                            {testStats.passed}/{testStats.total}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">test cases passed</div>
                    </div>
                )}
                
                {result === 'success' && (
                    <div className="mt-4 p-3 bg-green-900/20 border border-green-800 rounded text-green-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        All tests passed!
                    </div>
                )}
                
                {result === 'failure' && testStats && testStats.passed > 0 && (
                    <div className="mt-4 p-3 bg-amber-900/20 border border-amber-800 rounded text-amber-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Some tests failed
                    </div>
                )}
                
                {result === 'failure' && testStats && testStats.passed === 0 && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        All tests failed
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}
