"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Edit2, Play, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

interface Lab {
  id: string;
  labNumber: string;
  title: string;
  subject: string;
  isActive: boolean;
  fileName?: string;
  testCases?: string; // JSON string
  labType?: 'Lab' | 'Challenge';
  subTasks?: string; // JSON string
  totalScore?: number; // Total possible score for gradient display
  databaseStarter?: string; // SQL to initialize database for this lab
}

interface subTask {
  id: string;
  name: string;
  order: number;
}

interface TestCase {
  id: string;
  name: string;
  input: string; // Main SQL query to test
  expectedOutput: string;
  matchMode?: 'trim' | 'exact';
  subTaskId?: string; // Optional: which task this test belongs to
  // SQL-specific fields
  setupSql?: string; // SQL to run before test (e.g., CREATE TABLE, INSERT data)
  verificationSql?: string; // SQL to verify the result (e.g., SELECT to check data)
  testType?: 'query_result' | 'structure_check' | 'data_check'; // Type of test
  shouldFail?: boolean; // Test should produce an error
  cleanupSql?: string; // SQL to run after test
}

export default function ManageTestCasesPage() {
  const router = useRouter();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [subTasks, setSubTasks] = useState<subTask[]>([]);
  const [totalScore, setTotalScore] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [role, setRole] = useState<'LA' | 'Lecturer' | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTest, setCurrentTest] = useState<TestCase | null>(null);
  const [testName, setTestName] = useState("");
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [testMatchMode, setTestMatchMode] = useState<'trim' | 'exact'>('trim');
  const [selectedsubTaskId, setSelectedsubTaskId] = useState<string | undefined>(undefined);
  // SQL-specific state
  const [setupSql, setSetupSql] = useState("");
  const [verificationSql, setVerificationSql] = useState("");
  const [testType, setTestType] = useState<'query_result' | 'structure_check' | 'data_check'>('query_result');
  const [shouldFail, setShouldFail] = useState(false);
  const [cleanupSql, setCleanupSql] = useState("");
  const [databaseStarter, setDatabaseStarter] = useState("");

  // task Modal State
  const [issubTaskModalOpen, setIssubTaskModalOpen] = useState(false);
  const [currentsubTask, setCurrentsubTask] = useState<subTask | null>(null);
  const [subTaskName, setsubTaskName] = useState("");

  useEffect(() => {
    // Check role and permissions first
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        setRole(data.role);
        // Check if user is main admin OR (Lecturer AND has access to ITCS255)
        if (data.username === 'kanzaki_aito' || (data.role === 'Lecturer' && data.permissions && data.permissions.itcs255)) {
          setHasAccess(true);
          fetchLabs();
        } else {
          // Redirect to subject dashboard if not Lecturer or no access
          router.push('/admin/itcs255');
        }
      })
      .catch(err => {
        console.error("Failed to fetch user permissions", err);
        router.push('/admin/dashboard');
      });
  }, [router]);

  const fetchLabs = async () => {
    try {
      const res = await fetch("/api/labs?subject=ITCS255");
      const data = await res.json();
      if (data.success) {
        setLabs(data.labs);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to fetch labs");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLab = (lab: Lab) => {
    setSelectedLab(lab);
    setSuccess(null);
    setTotalScore(lab.totalScore);
    setDatabaseStarter(lab.databaseStarter || "");
    if (lab.testCases) {
      try {
        setTestCases(JSON.parse(lab.testCases));
      } catch (e) {
        console.error("Failed to parse test cases", e);
        setTestCases([]);
      }
    } else {
      setTestCases([]);
    }
    if (lab.subTasks) {
      try {
        setSubTasks(JSON.parse(lab.subTasks));
      } catch (e) {
        console.error("Failed to parse tasks", e);
        setSubTasks([]);
      }
    } else {
      setSubTasks([]);
    }
  };

  const handleOpenModal = (test?: TestCase, subTaskId?: string) => {
    if (test) {
      setCurrentTest(test);
      setTestName(test.name);
      setTestInput(test.input);
      setTestOutput(test.expectedOutput);
      setTestMatchMode(test.matchMode || 'trim');
      setSelectedsubTaskId(test.subTaskId);
      setSetupSql(test.setupSql || "");
      setVerificationSql(test.verificationSql || "");
      setTestType(test.testType || 'query_result');
      setShouldFail(test.shouldFail || false);
      setCleanupSql(test.cleanupSql || "");
    } else {
      setCurrentTest(null);
      setTestName("");
      setTestInput("");
      setTestOutput("");
      setTestMatchMode('trim');
      setSelectedsubTaskId(subTaskId);
      setSetupSql("");
      setVerificationSql("");
      setTestType('query_result');
      setShouldFail(false);
      setCleanupSql("");
    }
    setIsModalOpen(true);
  };

  const handleSaveTest = () => {
    if (!testName) return;

    if (currentTest) {
      // Edit
      setTestCases(prev => prev.map(t => 
        t.id === currentTest.id 
          ? { 
              ...t, 
              name: testName, 
              input: testInput, 
              expectedOutput: testOutput, 
              matchMode: testMatchMode, 
              subTaskId: selectedsubTaskId,
              setupSql,
              verificationSql,
              testType,
              shouldFail,
              cleanupSql
            }
          : t
      ));
    } else {
      // Create
      const newTest: TestCase = {
        id: crypto.randomUUID(),
        name: testName,
        input: testInput,
        expectedOutput: testOutput,
        matchMode: testMatchMode,
        subTaskId: selectedsubTaskId,
        setupSql,
        verificationSql,
        testType,
        shouldFail,
        cleanupSql
      };
      setTestCases(prev => [...prev, newTest]);
    }
    setIsModalOpen(false);
  };

  const handleOpensubTaskModal = (subTask?: subTask) => {
    if (subTask) {
      setCurrentsubTask(subTask);
      setsubTaskName(subTask.name);
    } else {
      setCurrentsubTask(null);
      setsubTaskName("");
    }
    setIssubTaskModalOpen(true);
  };

  const handleSavesubTask = () => {
    if (!subTaskName) return;

    if (currentsubTask) {
      // Edit
      setSubTasks(prev => prev.map(sq => 
        sq.id === currentsubTask.id 
          ? { ...sq, name: subTaskName }
          : sq
      ));
    } else {
      // Create
      const newsubTask: subTask = {
        id: crypto.randomUUID(),
        name: subTaskName,
        order: subTasks.length
      };
      setSubTasks(prev => [...prev, newsubTask]);
    }
    setIssubTaskModalOpen(false);
  };

  const handleDeletesubTask = (id: string) => {
    if (confirm("Are you sure? All test cases in this task will be moved to 'No task'.")) {
      setSubTasks(prev => prev.filter(sq => sq.id !== id));
      // Move all test cases from this task to no task
      setTestCases(prev => prev.map(tc => 
        tc.subTaskId === id ? { ...tc, subTaskId: undefined } : tc
      ));
    }
  };

  const handleDeleteTest = (id: string) => {
    if (confirm("Are you sure you want to delete this test case?")) {
      setTestCases(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedLab) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/labs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLab.id,
          testCases: JSON.stringify(testCases),
          subTasks: JSON.stringify(subTasks),
          totalScore: totalScore,
          databaseStarter: databaseStarter
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess("Test cases saved successfully!");
        // Update local labs state
        setLabs(prev => prev.map(l => l.id === selectedLab.id ? { ...l, testCases: JSON.stringify(testCases), subTasks: JSON.stringify(subTasks), totalScore: totalScore } : l));
      } else {
        setError(data.error || "Failed to save changes");
      }
    } catch (err) {
      setError("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  // Show loading while checking permissions
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#161b22] text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400"></div>
          <p className="text-slate-400 mt-4">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#161b22] text-slate-200 p-8 font-['Inter'] animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link href="/admin/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
               <ArrowLeft size={24} />
             </Link>
             <div>
               <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-400 bg-clip-text text-transparent">
                 Manage Test Cases
               </h1>
               <p className="text-slate-400 mt-1">ITCS255 - Structured Query Language Essentials</p>
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            
            {/* Lab List Sidebar */}
            <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Select Lab</h2>
                </div>
                
                <div className="space-y-2">
                    {loading ? (
                        <div className="text-slate-500 animate-pulse">Loading labs...</div>
                    ) : (
                        labs.map(lab => (
                            <button
                                key={lab.id}
                                onClick={() => handleSelectLab(lab)}
                                className={`w-full text-left p-4 rounded-xl transition-all border ${
                                    selectedLab?.id === lab.id 
                                    ? "bg-purple-500/20 border-purple-500/50 text-white"
                                    : "bg-[#161b22] border-white/5 text-slate-400 hover:bg-[#1c2128] hover:border-white/10"
                                }`}
                            >
                                <div className="font-medium">{lab.title}</div>
                                <div className="text-xs opacity-70 mt-1">
                                    Lab {lab.labNumber}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="lg:col-span-3 space-y-6">
                {selectedLab ? (
                    <>
                        <div className="flex items-center justify-between bg-[#161b22] p-6 rounded-2xl border border-white/5">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{selectedLab.title}</h2>
                                <p className="text-slate-400 text-sm mt-1">
                                    {testCases.length} Test Case{testCases.length !== 1 && 's'} Defined
                                    {subTasks.length > 0 && <span className="mx-2">•</span>}
                                    {subTasks.length > 0 && `${subTasks.length} task${subTasks.length !== 1 ? 's' : ''}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleOpensubTaskModal()}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-all border border-purple-500/20"
                                >
                                    <Plus size={18} />
                                    Add task
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
                                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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

                        {/* Configuration Section */}
                        <div className="bg-[#161b22] p-6 rounded-2xl border border-white/5 space-y-6">
                            <div>
                                <label className="text-sm font-medium text-slate-300 block mb-2">
                                    Total Score (Max Points)
                                </label>
                                <input 
                                    type="number" 
                                    value={totalScore ?? ''}
                                    onChange={(e) => setTotalScore(e.target.value ? parseInt(e.target.value) : undefined)}
                                    placeholder="e.g. 100"
                                    className="w-full max-w-xs bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    min="0"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Used for gradient color display (red → yellow → green)
                                </p>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-slate-300 block mb-2">
                                    Database Starter SQL (Optional)
                                </label>
                                <textarea 
                                    value={databaseStarter}
                                    onChange={(e) => setDatabaseStarter(e.target.value)}
                                    placeholder="CREATE DATABASE lab01_pokemon_db;&#10;USE lab01_pokemon_db;&#10;CREATE TABLE Trainer (...);"
                                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm min-h-[120px]"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    SQL to initialize the database environment for this lab (runs before all tests)
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center gap-3">
                                <CheckCircle size={20} />
                                {success}
                            </div>
                        )}

                        {/* Test Cases List */}
                        <div className="space-y-6">
                            {/* No task Section (if there are any) */}
                            {testCases.some(tc => !tc.subTaskId) && (
                                <div className="space-y-3">
                                    {subTasks.length > 0 && (
                                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                            <span className="text-slate-500">No task</span>
                                        </h3>
                                    )}
                                    <div className="grid gap-3 md:gap-4">
                                        {testCases
                                            .map((test, idx) => ({ test, originalIndex: idx }))
                                            .filter(({ test }) => !test.subTaskId)
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
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleOpenModal(test)}
                                                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-purple-400 transition-colors"
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
                                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Input</label>
                                                        <div className="bg-[#0d1117] p-3 rounded-lg border border-white/5 font-mono text-sm text-slate-300 min-h-[60px] whitespace-pre-wrap">
                                                            {test.input || <span className="text-slate-600 italic">No input</span>}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expected Output</label>
                                                        <div className="bg-[#0d1117] p-3 rounded-lg border border-white/5 font-mono text-sm text-emerald-400/90 min-h-[60px] whitespace-pre-wrap">
                                                            {test.expectedOutput}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* tasks Sections */}
                            {subTasks.sort((a, b) => a.order - b.order).map((subTask) => {
                                const subTaskTests = testCases
                                    .map((test, idx) => ({ test, originalIndex: idx }))
                                    .filter(({ test }) => test.subTaskId === subTask.id);
                                
                                return (
                                    <div key={subTask.id} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                <span className="text-purple-400">{subTask.name}</span>
                                                <span className="text-sm text-slate-500">({subTaskTests.length} test{subTaskTests.length !== 1 ? 's' : ''})</span>
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleOpenModal(undefined, subTask.id)}
                                                    className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all border border-emerald-500/20 flex items-center gap-1.5"
                                                >
                                                    <Plus size={14} />
                                                    Add Test
                                                </button>
                                                <button 
                                                    onClick={() => handleOpensubTaskModal(subTask)}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-purple-400 transition-colors"
                                                    title="Edit task"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeletesubTask(subTask.id)}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                    title="Delete task"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid gap-3 md:gap-4">
                                            {subTaskTests.map(({ test, originalIndex }) => (
                                                <div key={test.id} className="bg-[#161b22] p-4 md:p-6 rounded-2xl border border-purple-500/20 group hover:border-purple-500/40 transition-all">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-mono text-sm border border-white/5">
                                                                {originalIndex + 1}
                                                            </div>
                                                            <h3 className="font-semibold text-white text-lg">{test.name}</h3>
                                                            {test.matchMode === 'exact' && (
                                                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/30">EXACT</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => handleOpenModal(test)}
                                                                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-purple-400 transition-colors"
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
                                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Input</label>
                                                            <div className="bg-[#0d1117] p-3 rounded-lg border border-white/5 font-mono text-sm text-slate-300 min-h-[60px] whitespace-pre-wrap">
                                                                {test.input || <span className="text-slate-600 italic">No input</span>}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expected Output</label>
                                                            <div className="bg-[#0d1117] p-3 rounded-lg border border-white/5 font-mono text-sm text-emerald-400/90 min-h-[60px] whitespace-pre-wrap">
                                                                {test.expectedOutput}
                                                            </div>
                                                        </div>
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
                                        className="mt-6 px-6 py-2 bg-purple-600/10 text-purple-400 rounded-lg hover:bg-purple-600/20 transition-all font-medium"
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                <div className="bg-[#161b22] w-full max-w-4xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden my-8">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">
                            {currentTest ? "Edit SQL Test Case" : "New SQL Test Case"}
                        </h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                            <XCircle size={24} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Test Name *</label>
                                <input 
                                    type="text" 
                                    value={testName}
                                    onChange={(e) => setTestName(e.target.value)}
                                    placeholder="e.g. Create Database Test"
                                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Test Type</label>
                                <select
                                    value={testType}
                                    onChange={(e) => setTestType(e.target.value as any)}
                                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                >
                                    <option value="query_result">Query Result</option>
                                    <option value="structure_check">Structure Check</option>
                                    <option value="data_check">Data Check</option>
                                </select>
                            </div>
                        </div>
                        
                        {subTasks.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">task (Optional)</label>
                                <select
                                    value={selectedsubTaskId || ''}
                                    onChange={(e) => setSelectedsubTaskId(e.target.value || undefined)}
                                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                >
                                    <option value="">No task</option>
                                    {subTasks.sort((a, b) => a.order - b.order).map(sq => (
                                        <option key={sq.id} value={sq.id}>{sq.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Setup SQL (Optional)</label>
                            <p className="text-xs text-slate-500">SQL to run before the test (e.g., CREATE TABLE, INSERT data)</p>
                            <textarea 
                                value={setupSql}
                                onChange={(e) => setSetupSql(e.target.value)}
                                placeholder="INSERT INTO Trainer VALUES (1, 'Ash', 'Pallet Town');"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Test SQL Query *</label>
                            <p className="text-xs text-slate-500">The SQL query to test (student's code)</p>
                            <textarea 
                                value={testInput}
                                onChange={(e) => setTestInput(e.target.value)}
                                placeholder="SELECT * FROM Trainer WHERE trainerID = 1;"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm min-h-[120px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Verification SQL (Optional)</label>
                            <p className="text-xs text-slate-500">SQL to verify the result (if different from test query)</p>
                            <textarea 
                                value={verificationSql}
                                onChange={(e) => setVerificationSql(e.target.value)}
                                placeholder="SELECT COUNT(*) FROM Trainer;"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Expected Output *</label>
                            <p className="text-xs text-slate-500">Expected result (table data, count, error message, etc.)</p>
                            <textarea 
                                value={testOutput}
                                onChange={(e) => setTestOutput(e.target.value)}
                                placeholder="1|Ash|Pallet Town"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm min-h-[120px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Cleanup SQL (Optional)</label>
                            <p className="text-xs text-slate-500">SQL to run after the test (cleanup)</p>
                            <textarea 
                                value={cleanupSql}
                                onChange={(e) => setCleanupSql(e.target.value)}
                                placeholder="DROP TABLE IF EXISTS Trainer;"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm min-h-[100px]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Match Mode</label>
                                <select
                                    value={testMatchMode}
                                    onChange={(e) => setTestMatchMode(e.target.value as 'trim' | 'exact')}
                                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-slate-300 focus:outline-none focus:border-purple-500 transition-colors"
                                >
                                    <option value="trim">Trim Whitespace</option>
                                    <option value="exact">Exact Match</option>
                                </select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Should Fail?</label>
                                <select
                                    value={shouldFail ? 'true' : 'false'}
                                    onChange={(e) => setShouldFail(e.target.value === 'true')}
                                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-slate-300 focus:outline-none focus:border-purple-500 transition-colors"
                                >
                                    <option value="false">No (Success Expected)</option>
                                    <option value="true">Yes (Error Expected)</option>
                                </select>
                            </div>
                        </div>
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
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors font-medium"
                        >
                            {currentTest ? "Update Test Case" : "Create Test Case"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* task Modal */}
        {issubTaskModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-[#161b22] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">
                            {currentsubTask ? "Edit task" : "New task"}
                        </h3>
                        <button onClick={() => setIssubTaskModalOpen(false)} className="text-slate-400 hover:text-white">
                            <XCircle size={24} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">task Name</label>
                            <input 
                                type="text" 
                                value={subTaskName}
                                onChange={(e) => setsubTaskName(e.target.value)}
                                placeholder="e.g. Question 1, Part A"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-[#0d1117]/50">
                        <button 
                            onClick={() => setIssubTaskModalOpen(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSavesubTask}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors font-medium"
                        >
                            {currentsubTask ? "Update task" : "Create task"}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}