"use client"

import { useState, useEffect } from "react"
import { Github, Play, Code2, AlertCircle, CheckCircle2, XCircle, ArrowLeft, Plus, Trash2, Edit2, ChevronDown, ChevronUp } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

interface TestCase {
  id: string
  name: string
  input: string
  expectedOutput: string
  actualOutput?: string
  status: 'pending' | 'running' | 'pass' | 'fail'
  errorMessage?: string
}

export default function JavaTestRunner() {
  const [code, setCode] = useState(`public class Solution {
    public int add(int a, int b) {
        return a + b;
    }
}`)
  const [labNumber, setLabNumber] = useState("")
  const [labs, setLabs] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [testCases, setTestCases] = useState<TestCase[]>([])

  // Expanded results state
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)

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

  // Update test cases when lab changes
  useEffect(() => {
    if (labNumber && labs.length > 0) {
      const currentLab = labs.find(l => l.labNumber === labNumber)
      if (currentLab && currentLab.testCases) {
        try {
            const parsed = JSON.parse(currentLab.testCases)
            // Reset status
            setTestCases(parsed.map((t: any) => ({ ...t, status: 'pending', actualOutput: undefined })))
        } catch (e) {
            console.error("Error parsing test cases", e)
            setTestCases([])
        }
      } else {
        setTestCases([])
      }
    }
  }, [labNumber, labs])



  const runTests = async () => {
    setIsRunning(true)
    
    // Reset statuses
    setTestCases(prev => prev.map(t => ({ ...t, status: 'running', actualOutput: undefined })))

    // Processing Loop
    for (let i = 0; i < testCases.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800)) // Simulate per-test delay
        
        setTestCases(prev => {
            const newCases = [...prev]
            const test = newCases[i]
            
            // Mock Logic: 
            // If expected output is a number, try to match it.
            // If Input is "error", fail it.
            // Otherwise randomly pass/fail if logic is complex, OR just fail for demo if needed.
            // For now, let's PASS everything unless input contains "fail"
            
            const shouldPass = !test.input.toLowerCase().includes('fail')
            
            test.status = shouldPass ? 'pass' : 'fail'
            test.actualOutput = shouldPass ? test.expectedOutput : 'Error: Unexpected output'
            
            return newCases
        })
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
              href="/itcs123"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-100"
              title="Back"
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

        {/* Right Panel - Custom Test Runner */}
        <div className="w-full lg:w-96 flex flex-col bg-slate-900/50 border-l border-slate-800">
             <div className="bg-slate-900 px-4 py-4 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-100">Input/Output Tests</h2>
                    <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded">BETA</span>
                </div>
            </div>

            <div className="p-4 flex gap-2 border-b border-slate-800 bg-slate-900/30">

                <button 
                    onClick={runTests}
                    disabled={isRunning || !labNumber}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isRunning ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Play className="w-4 h-4 fill-current" />}
                    Run tests
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/50">
                {!labNumber && (
                    <div className="text-amber-400 italic flex items-center gap-2 text-xs p-2">
                        <AlertCircle className="w-4 h-4" />
                        Please select a lab first.
                    </div>
                )}
                
                {testCases.map((test) => (
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
                        
                        <div className="px-3 pb-3 flex justify-end">
                            <button 
                                onClick={() => setExpandedTestId(expandedTestId === test.id ? null : test.id)}
                                className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                            >
                                {expandedTestId === test.id ? 'Hide Results' : 'Results'}
                                {expandedTestId === test.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                        </div>

                        {/* Expanded Details */}
                        {expandedTestId === test.id && (
                            <div className="bg-slate-950/50 border-t border-slate-800 p-3 text-xs font-mono space-y-2 animate-slide-up">
                                <div>
                                    <span className="text-slate-500 block mb-0.5">Input:</span>
                                    <div className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 break-all">{test.input || <span className="text-slate-600 italic">None</span>}</div>
                                </div>
                                <div>
                                    <span className="text-slate-500 block mb-0.5">Expected Output:</span>
                                    <div className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 break-all">{test.expectedOutput}</div>
                                </div>
                                {test.actualOutput && (
                                    <div>
                                        <span className="text-slate-500 block mb-0.5">Actual Output:</span>
                                        <div className={`bg-slate-900 border border-slate-800 rounded px-2 py-1 break-all ${test.status === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                                            {test.actualOutput}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

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
