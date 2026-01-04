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
  testCases?: string; // JSON string
}

interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
}

export default function ManageTestCasesPage() {
  const router = useRouter();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTest, setCurrentTest] = useState<TestCase | null>(null);
  const [testName, setTestName] = useState("");
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async () => {
    try {
      const res = await fetch("/api/labs?subject=ITCS123");
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
  };

  const handleOpenModal = (test?: TestCase) => {
    if (test) {
      setCurrentTest(test);
      setTestName(test.name);
      setTestInput(test.input);
      setTestOutput(test.expectedOutput);
    } else {
      setCurrentTest(null);
      setTestName("");
      setTestInput("");
      setTestOutput("");
    }
    setIsModalOpen(true);
  };

  const handleSaveTest = () => {
    if (!testName) return;

    if (currentTest) {
      // Edit
      setTestCases(prev => prev.map(t => 
        t.id === currentTest.id 
          ? { ...t, name: testName, input: testInput, expectedOutput: testOutput }
          : t
      ));
    } else {
      // Create
      const newTest: TestCase = {
        id: crypto.randomUUID(),
        name: testName,
        input: testInput,
        expectedOutput: testOutput
      };
      setTestCases(prev => [...prev, newTest]);
    }
    setIsModalOpen(false);
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
          testCases: JSON.stringify(testCases)
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess("Test cases saved successfully!");
        // Update local labs state
        setLabs(prev => prev.map(l => l.id === selectedLab.id ? { ...l, testCases: JSON.stringify(testCases) } : l));
      } else {
        setError(data.error || "Failed to save changes");
      }
    } catch (err) {
      setError("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 p-8 font-['Inter']">
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
               <p className="text-slate-400 mt-1">ITCS123 - Java Programming</p>
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Lab List Sidebar */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Select Lab</h2>
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
                                <div className="text-xs opacity-70 mt-1">File: {lab.fileName}</div>
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
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
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
                        <div className="grid gap-4">
                            {testCases.map((test, index) => (
                                <div key={test.id} className="bg-[#161b22] p-6 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-mono text-sm border border-white/5">
                                                {index + 1}
                                            </div>
                                            <h3 className="font-semibold text-white text-lg">{test.name}</h3>
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
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Input</label>
                                            <div className="bg-[#0d1117] p-3 rounded-lg border border-white/5 font-mono text-sm text-slate-300 min-h-[60px]">
                                                {test.input || <span className="text-slate-600 italic">No input</span>}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expected Output</label>
                                            <div className="bg-[#0d1117] p-3 rounded-lg border border-white/5 font-mono text-sm text-emerald-400/90 min-h-[60px]">
                                                {test.expectedOutput}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
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
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Input Arguments</label>
                            <textarea 
                                value={testInput}
                                onChange={(e) => setTestInput(e.target.value)}
                                placeholder="Arguments separated by spaces"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Expected Output</label>
                            <textarea 
                                value={testOutput}
                                onChange={(e) => setTestOutput(e.target.value)}
                                placeholder="Exact expected output string"
                                className="w-full bg-[#0d1117] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono min-h-[80px]"
                            />
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

      </div>
    </div>
  );
}
