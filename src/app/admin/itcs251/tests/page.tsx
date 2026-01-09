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
  subQuestions?: string; // JSON string
}

interface SubQuestion {
  id: string;
  name: string;
  order: number;
}

interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  matchMode?: 'trim' | 'exact';
  subQuestionId?: string; // Optional: which sub-question this test belongs to
}

export default function ManageTestCasesPage() {
  const router = useRouter();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [subQuestions, setSubQuestions] = useState<SubQuestion[]>([]);
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
  const [selectedSubQuestionId, setSelectedSubQuestionId] = useState<string | undefined>(undefined);

  // Sub-question Modal State
  const [isSubQuestionModalOpen, setIsSubQuestionModalOpen] = useState(false);
  const [currentSubQuestion, setCurrentSubQuestion] = useState<SubQuestion | null>(null);
  const [subQuestionName, setSubQuestionName] = useState("");

  useEffect(() => {
    // Check role and permissions first
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        setRole(data.role);
        // Check if user is main admin OR (Lecturer AND has access to ITCS251)
        if (data.username === 'kanzaki_aito' || (data.role === 'Lecturer' && data.permissions && data.permissions.itcs251)) {
          setHasAccess(true);
          fetchLabs();
        } else {
          // Redirect to subject dashboard if not Lecturer or no access
          router.push('/admin/itcs251');
        }
      })
      .catch(err => {
        console.error("Failed to fetch user permissions", err);
        router.push('/admin/dashboard');
      });
  }, [router]);

  const fetchLabs = async () => {
    try {
      const res = await fetch("/api/labs?subject=ITCS251");
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
    if (lab.subQuestions) {
      try {
        setSubQuestions(JSON.parse(lab.subQuestions));
      } catch (e) {
        console.error("Failed to parse sub-questions", e);
        setSubQuestions([]);
      }
    } else {
      setSubQuestions([]);
    }
  };

  const handleOpenModal = (test?: TestCase, subQuestionId?: string) => {
    if (test) {
      setCurrentTest(test);
      setTestName(test.name);
      setTestInput(test.input);
      setTestOutput(test.expectedOutput);
      setTestMatchMode(test.matchMode || 'trim');
      setSelectedSubQuestionId(test.subQuestionId);
    } else {
      setCurrentTest(null);
      setTestName("");
      setTestInput("");
      setTestOutput("");
      setTestMatchMode('trim');
      setSelectedSubQuestionId(subQuestionId);
    }
    setIsModalOpen(true);
  };

  const handleSaveTest = () => {
    if (!testName) return;

    if (currentTest) {
      // Edit
      setTestCases(prev => prev.map(t => 
        t.id === currentTest.id 
          ? { ...t, name: testName, input: testInput, expectedOutput: testOutput, matchMode: testMatchMode, subQuestionId: selectedSubQuestionId }
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
        subQuestionId: selectedSubQuestionId
      };
      setTestCases(prev => [...prev, newTest]);
    }
    setIsModalOpen(false);
  };

  const handleOpenSubQuestionModal = (subQuestion?: SubQuestion) => {
    if (subQuestion) {
      setCurrentSubQuestion(subQuestion);
      setSubQuestionName(subQuestion.name);
    } else {
      setCurrentSubQuestion(null);
      setSubQuestionName("");
    }
    setIsSubQuestionModalOpen(true);
  };

  const handleSaveSubQuestion = () => {
    if (!subQuestionName) return;

    if (currentSubQuestion) {
      // Edit
      setSubQuestions(prev => prev.map(sq => 
        sq.id === currentSubQuestion.id 
          ? { ...sq, name: subQuestionName }
          : sq
      ));
    } else {
      // Create
      const newSubQuestion: SubQuestion = {
        id: crypto.randomUUID(),
        name: subQuestionName,
        order: subQuestions.length
      };
      setSubQuestions(prev => [...prev, newSubQuestion]);
    }
    setIsSubQuestionModalOpen(false);
  };

  const handleDeleteSubQuestion = (id: string) => {
    if (confirm("Are you sure? All test cases in this sub-question will be moved to 'No Sub-Question'.")) {
      setSubQuestions(prev => prev.filter(sq => sq.id !== id));
      // Move all test cases from this sub-question to no sub-question
      setTestCases(prev => prev.map(tc => 
        tc.subQuestionId === id ? { ...tc, subQuestionId: undefined } : tc
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
          subQuestions: JSON.stringify(subQuestions)
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess("Test cases saved successfully!");
        // Update local labs state
        setLabs(prev => prev.map(l => l.id === selectedLab.id ? { ...l, testCases: JSON.stringify(testCases), subQuestions: JSON.stringify(subQuestions) } : l));
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
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400"></div>
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
               <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                 Manage Test Cases
               </h1>
               <p className="text-slate-400 mt-1">ITCS251 - Python Programming</p>
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
                                    ? "bg-blue-500/20 border-blue-500/50 text-white"
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
                                    {subQuestions.length > 0 && <span className="mx-2">•</span>}
                                    {subQuestions.length > 0 && `${subQuestions.length} Sub-Question${subQuestions.length !== 1 ? 's' : ''}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => handleOpenSubQuestionModal()}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-all border border-purple-500/20"
                                >
                                    <Plus size={18} />
                                    Add Sub-Question
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
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            {/* No Sub-Question Section (if there are any) */}
                            {testCases.some(tc => !tc.subQuestionId) && (
                                <div className="space-y-3">
                                    {subQuestions.length > 0 && (
                                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                            <span className="text-slate-500">No Sub-Question</span>
                                        </h3>
                                    )}
                                    <div className="grid gap-3 md:gap-4">
                                        {testCases
                                            .map((test, idx) => ({ test, originalIndex: idx }))
                                            .filter(({ test }) => !test.subQuestionId)
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

                            {/* Sub-Questions Sections */}
                            {subQuestions.sort((a, b) => a.order - b.order).map((subQuestion) => {
                                const subQuestionTests = testCases
                                    .map((test, idx) => ({ test, originalIndex: idx }))
                                    .filter(({ test }) => test.subQuestionId === subQuestion.id);
                                
                                return (
                                    <div key={subQuestion.id} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                <span className="text-blue-400">{subQuestion.name}</span>
                                                <span className="text-sm text-slate-500">({subQuestionTests.length} test{subQuestionTests.length !== 1 ? 's' : ''})</span>
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleOpenModal(undefined, subQuestion.id)}
                                                    className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all border border-emerald-500/20 flex items-center gap-1.5"
                                                >
                                                    <Plus size={14} />
                                                    Add Test
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenSubQuestionModal(subQuestion)}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                                    title="Edit sub-question"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteSubQuestion(subQuestion.id)}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                    title="Delete sub-question"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid gap-3 md:gap-4">
                                            {subQuestionTests.map(({ test, originalIndex }) => (
                                                <div key={test.id} className="bg-[#161b22] p-4 md:p-6 rounded-2xl border border-blue-500/20 group hover:border-blue-500/40 transition-all">
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
                        
                        {subQuestions.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Sub-Question (Optional)</label>
                                <select
                                    value={selectedSubQuestionId || ''}
                                    onChange={(e) => setSelectedSubQuestionId(e.target.value || undefined)}
                                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                >
                                    <option value="">No Sub-Question</option>
                                    {subQuestions.sort((a, b) => a.order - b.order).map(sq => (
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
                                onChange={(e) => setTestMatchMode(e.target.value as 'trim' | 'exact')}
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                             >
                                <option value="trim">Match (Trim Whitespace)</option>
                                <option value="exact">Match (Exact)</option>
                             </select>
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
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
                        >
                            {currentTest ? "Update Test Case" : "Create Test Case"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Sub-Question Modal */}
        {isSubQuestionModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-[#161b22] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">
                            {currentSubQuestion ? "Edit Sub-Question" : "New Sub-Question"}
                        </h3>
                        <button onClick={() => setIsSubQuestionModalOpen(false)} className="text-slate-400 hover:text-white">
                            <XCircle size={24} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Sub-Question Name</label>
                            <input 
                                type="text" 
                                value={subQuestionName}
                                onChange={(e) => setSubQuestionName(e.target.value)}
                                placeholder="e.g. Question 1, Part A"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-[#0d1117]/50">
                        <button 
                            onClick={() => setIsSubQuestionModalOpen(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveSubQuestion}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors font-medium"
                        >
                            {currentSubQuestion ? "Update Sub-Question" : "Create Sub-Question"}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
