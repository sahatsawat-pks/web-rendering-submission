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
  matchMode?: 'trim' | 'exact'
}

export default function JavaTestRunner() {
  const [code, setCode] = useState(`import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Write your code here
        // Example: Read two integers and print their sum
        if (scanner.hasNextInt()) {
            int a = scanner.nextInt();
            int b = scanner.nextInt();
            System.out.println(a + b);
        }
        scanner.close();
    }
}`)
  const [labNumber, setLabNumber] = useState("")
  const [labs, setLabs] = useState<any[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [labTypeFilter, setLabTypeFilter] = useState<'Lab' | 'Challenge'>('Lab')

  // Expanded results state
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)
  
  // Custom Run State
  const [customInput, setCustomInput] = useState("");
  const [customOutput, setCustomOutput] = useState<string | null>(null);

  // Helper function to show character differences
  const showDifferences = (expected: string, actual: string) => {
    if (expected === actual) return null;
    
    const diffs: { char: string; type: 'same' | 'expected' | 'actual'; index: number }[] = [];
    const maxLen = Math.max(expected.length, actual.length);
    
    for (let i = 0; i < maxLen; i++) {
      const expChar = expected[i];
      const actChar = actual[i];
      
      if (expChar === actChar) {
        if (expChar !== undefined) {
          diffs.push({ char: expChar, type: 'same', index: i });
        }
      } else {
        if (expChar !== undefined) {
          diffs.push({ char: expChar === '\n' ? '\\n' : expChar === ' ' ? '␣' : expChar, type: 'expected', index: i });
        }
        if (actChar !== undefined) {
          diffs.push({ char: actChar === '\n' ? '\\n' : actChar === ' ' ? '␣' : actChar, type: 'actual', index: i });
        }
      }
    }
    
    return diffs;
  };

  const runCustomTest = async () => {
      setIsRunning(true);
      setCustomOutput(null);
      
      try {
        const response = await fetch('/api/run-java', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                input: customInput
            })
        });
        const result = await response.json();
        setCustomOutput((result.output || "") + (result.error ? `\nError:\n${result.error}` : ""));
      } catch (e) {
          setCustomOutput("Execution failed: Server Error");
      } finally {
          setIsRunning(false);
      }
  };

  // Load labs on mount
  useEffect(() => {
    async function loadLabs() {
      try {
        const res = await fetch("/api/labs?activeOnly=true&subject=ITCS123")
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
      const currentLab = labs.find(l => l.labNumber === labNumber && (l.labType || 'Lab') === labTypeFilter)
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
  }, [labNumber, labs, labTypeFilter])



  const runTests = async () => {
    setIsRunning(true)
    
    // Reset statuses
    setTestCases(prev => prev.map(t => ({ ...t, status: 'running', actualOutput: undefined, errorMessage: undefined })))

    // Processing Loop - Sequential to avoid server overload and mixed output
    const newCases = [...testCases];
    
    for (let i = 0; i < newCases.length; i++) {
        const test = newCases[i];
        
        try {
            const response = await fetch('/api/run-java', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    input: test.input
                })
            });
            
            const result = await response.json();
            
            // Update the specific test in the list
            setTestCases(prev => {
                const current = [...prev];
                const activeTest = current[i];
                
                if (result.error && !result.output) {
                     // Compilation error or crash without output
                     activeTest.status = 'fail';
                     activeTest.actualOutput = result.output || ''; // Output usually contains compiler error in this API design
                     activeTest.errorMessage = result.error;
                } else {
                    // We have output, check correctness
                    const rawActual = result.output || '';
                    const rawExpected = activeTest.expectedOutput;
                    
                    // Normalize CRLF to LF for consistency across OS
                    const actualNorm = rawActual.replace(/\r\n/g, '\n');
                    const expectedNorm = rawExpected.replace(/\r\n/g, '\n');
                    
                    const mode = activeTest.matchMode || 'trim';
                    let passed = false;
                    
                    if (mode === 'trim') {
                        passed = actualNorm.trim() === expectedNorm.trim();
                    } else {
                        // Exact match
                        passed = actualNorm === expectedNorm;
                    }
                    
                    if (passed) {
                        activeTest.status = 'pass';
                    } else {
                        activeTest.status = 'fail';
                    }
                    activeTest.actualOutput = (result.output || '') + (result.error ? `\n\nError Stream:\n${result.error}` : '');
                }
                
                return current;
            });

        } catch (e: any) {
            console.error("Test execution failed", e);
             setTestCases(prev => {
                const current = [...prev];
                current[i].status = 'fail';
                current[i].errorMessage = "Network or Server Error";
                return current;
            });
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
        {/* Left Panel - Code Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Lab Selection */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 space-y-2 md:space-y-3">
                {/* Filter Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setLabTypeFilter('Lab')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                            labTypeFilter === 'Lab'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                    >
                        Labs
                    </button>
                    <button
                        onClick={() => setLabTypeFilter('Challenge')}
                        className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                            labTypeFilter === 'Challenge'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                    >
                        Challenges
                    </button>
                </div>
                
                <div className="flex items-center gap-4">
                    <label className="text-xs text-slate-400 font-bold">SELECT:</label>
                    <select
                        value={labNumber}
                        onChange={e => setLabNumber(e.target.value)}
                        className="flex-1 bg-slate-800 text-slate-200 px-3 py-1.5 rounded text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Choose {labTypeFilter === 'Lab' ? 'Lab' : 'Challenge'}</option>
                        {labs
                            .filter(lab => (lab.labType || 'Lab') === labTypeFilter)
                            .map(lab => (
                            <option key={lab.id} value={lab.labNumber}>
                                {labTypeFilter === 'Lab' ? 'Lab' : 'Challenge'} {lab.labNumber}: {lab.title}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Editor Header */}
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                    <Code2 className="w-4 h-4" />
                    {(() => {
                        const match = code.match(/public\s+class\s+(\w+)/);
                        return match ? `${match[1]}.java` : 'Solution.java';
                    })()}
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
        <div className="w-full lg:w-96 flex flex-col bg-slate-900/50 border-t lg:border-t-0 lg:border-l border-slate-800 max-h-[50vh] lg:max-h-none">
             <div className="bg-slate-900 px-4 py-4 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-100">Input/Output Tests</h2>
                    <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded">BETA</span>
                </div>
            </div>

            {/* Custom Test runner */}
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
                                    <div className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 whitespace-pre-wrap">{test.input || <span className="text-slate-600 italic">None</span>}</div>
                                </div>
                                <div>
                                    <span className="text-slate-500 block mb-0.5">Expected Output:</span>
                                    <div className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 whitespace-pre-wrap">{test.expectedOutput}</div>
                                </div>
                                {test.actualOutput && (
                                    <>
                                        <div>
                                            <span className="text-slate-500 block mb-0.5">Actual Output:</span>
                                            <div className={`bg-slate-900 border border-slate-800 rounded px-2 py-1 whitespace-pre-wrap ${test.status === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                                                {test.actualOutput}
                                            </div>
                                        </div>
                                        {test.status === 'fail' && test.actualOutput !== test.expectedOutput && (
                                            <div className="bg-amber-950/30 border border-amber-900/50 rounded p-2 space-y-1">
                                                <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider block">Differences Found:</span>
                                                <div className="text-[10px] space-y-0.5">
                                                    {(() => {
                                                        const expectedLines = test.expectedOutput.split('\n');
                                                        const actualLines = test.actualOutput.split('\n');
                                                        const maxLines = Math.max(expectedLines.length, actualLines.length);
                                                        const differences = [];
                                                        
                                                        if (expectedLines.length !== actualLines.length) {
                                                            differences.push(
                                                                <div key="line-count" className="text-red-300">
                                                                    • Line count: Expected {expectedLines.length} lines, got {actualLines.length} lines
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        for (let i = 0; i < maxLines; i++) {
                                                            const expLine = expectedLines[i];
                                                            const actLine = actualLines[i];
                                                            
                                                            if (expLine !== actLine) {
                                                                differences.push(
                                                                    <div key={i} className="text-slate-300 bg-slate-900/50 p-1.5 rounded">
                                                                        <div className="text-amber-400 mb-0.5">Line {i + 1}:</div>
                                                                        <div className="pl-2 space-y-0.5">
                                                                            <div className="text-green-400">
                                                                                <span className="text-slate-500">Expected:</span> {expLine === undefined ? '(missing)' : expLine === '' ? '(empty line)' : expLine}
                                                                            </div>
                                                                            <div className="text-red-400">
                                                                                <span className="text-slate-500">Actual:</span> {actLine === undefined ? '(missing)' : actLine === '' ? '(empty line)' : actLine}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                        }
                                                        
                                                        return differences.length > 0 ? differences : <div className="text-slate-400 italic">Unable to detect differences</div>;
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
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
