"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Edit2, Play, AlertCircle, CheckCircle, XCircle, Code } from "lucide-react";
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
}

interface SubTask {
  id: string;
  name: string;
  order: number;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  testCode: string; // JavaScript code to run as test
  subTaskId?: string; // Optional: which task this test belongs to
}

export default function ManageTestCasesPage() {
  const router = useRouter();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
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
  const [testDescription, setTestDescription] = useState("");
  const [testCode, setTestCode] = useState("");
  const [selectedSubTaskId, setSelectedSubTaskId] = useState<string | undefined>(undefined);

  // Sub-Task Modal State
  const [isSubTaskModalOpen, setIsSubTaskModalOpen] = useState(false);
  const [currentSubTask, setCurrentSubTask] = useState<SubTask | null>(null);
  const [subTaskName, setSubTaskName] = useState("");

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.role) {
          setRole(data.role);
        }
        // Check if user has access to ITCS223 (or is main admin)
        if (data.username === 'kanzaki_aito' || (data.permissions && data.permissions.itcs223)) {
          setHasAccess(true);
        } else {
          router.push('/admin/dashboard');
        }
      } catch (err) {
        console.error("Failed to fetch user role", err);
        router.push('/admin/dashboard');
      }
    }

    async function fetchLabs() {
      try {
        const res = await fetch("/api/labs?subject=ITCS223");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setLabs(data.labs);
          }
        }
      } catch (e) {
        console.error("Failed to fetch labs", e);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
    fetchLabs();
  }, [router]);

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
    if (lab.subTasks) {
      try {
        setSubTasks(JSON.parse(lab.subTasks));
      } catch (e) {
        console.error("Failed to parse sub-tasks", e);
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
      setTestDescription(test.description);
      setTestCode(test.testCode);
      setSelectedSubTaskId(test.subTaskId);
    } else {
      setCurrentTest(null);
      setTestName("");
      setTestDescription("");
      setTestCode("");
      setSelectedSubTaskId(subTaskId);
    }
    setIsModalOpen(true);
  };

  const handleSaveTest = async () => {
    if (!testName || !selectedLab) return;

    let updatedTestCases: TestCase[];
    if (currentTest) {
      // Edit
      updatedTestCases = testCases.map(t => 
        t.id === currentTest.id 
          ? { ...t, name: testName, description: testDescription, testCode: testCode, subTaskId: selectedSubTaskId }
          : t
      );
    } else {
      // Create
      const newTest: TestCase = {
        id: crypto.randomUUID(),
        name: testName,
        description: testDescription,
        testCode: testCode,
        subTaskId: selectedSubTaskId
      };
      updatedTestCases = [...testCases, newTest];
    }
    
    setTestCases(updatedTestCases);
    setIsModalOpen(false);

    // Auto-save
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/labs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLab.id,
          testCases: JSON.stringify(updatedTestCases),
          subTasks: JSON.stringify(subTasks)
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess("Test case saved successfully!");
        setLabs(prev => prev.map(l => l.id === selectedLab.id ? { ...l, testCases: JSON.stringify(updatedTestCases), subTasks: JSON.stringify(subTasks) } : l));
      } else {
        setError(data.error || "Failed to save changes");
      }
    } catch (err) {
      setError("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSubTaskModal = (subTask?: SubTask) => {
    if (subTask) {
      setCurrentSubTask(subTask);
      setSubTaskName(subTask.name);
    } else {
      setCurrentSubTask(null);
      setSubTaskName("");
    }
    setIsSubTaskModalOpen(true);
  };

  const handleSaveSubTask = async () => {
    if (!subTaskName || !selectedLab) return;

    let updatedSubTasks: SubTask[];
    if (currentSubTask) {
      // Edit
      updatedSubTasks = subTasks.map(sq => 
        sq.id === currentSubTask.id 
          ? { ...sq, name: subTaskName }
          : sq
      );
    } else {
      // Create
      const newSubTask: SubTask = {
        id: crypto.randomUUID(),
        name: subTaskName,
        order: subTasks.length
      };
      updatedSubTasks = [...subTasks, newSubTask];
    }
    
    setSubTasks(updatedSubTasks);
    setIsSubTaskModalOpen(false);

    // Auto-save
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
          subTasks: JSON.stringify(updatedSubTasks)
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess("Sub-task saved successfully!");
        setLabs(prev => prev.map(l => l.id === selectedLab.id ? { ...l, testCases: JSON.stringify(testCases), subTasks: JSON.stringify(updatedSubTasks) } : l));
      } else {
        setError(data.error || "Failed to save changes");
      }
    } catch (err) {
      setError("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubTask = (id: string) => {
    if (confirm("Are you sure? All test cases in this sub-task will be moved to 'No Sub-Task'.")) {
      setSubTasks(prev => prev.filter(sq => sq.id !== id));
      // Move all test cases from this sub-task to no sub-task
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
          subTasks: JSON.stringify(subTasks)
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess("Test cases saved successfully!");
        // Update local labs state
        setLabs(prev => prev.map(l => l.id === selectedLab.id ? { ...l, testCases: JSON.stringify(testCases), subTasks: JSON.stringify(subTasks) } : l));
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-800 border-t-teal-600 dark:border-t-teal-400"></div>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-800 border-t-teal-600 dark:border-t-teal-400"></div>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Loading labs...</p>
        </div>
      </div>
    );
  }

  const getTestCasesForSubTask = (subTaskId?: string) => {
    return testCases.filter(tc => tc.subTaskId === subTaskId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-teal-300 dark:bg-teal-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-cyan-300 dark:bg-cyan-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 dark:opacity-10 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin/itcs223"
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Admin</span>
              </Link>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Test Case Management - ITCS223
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Labs List */}
          <div className="lg:col-span-1 animate-fade-in">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Select Lab</h2>
              <div className="space-y-2">
                {labs.map(lab => (
                  <button
                    key={lab.id}
                    onClick={() => handleSelectLab(lab)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                      selectedLab?.id === lab.id
                        ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-900 dark:text-teal-100 border-2 border-teal-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold">{lab.labNumber}</div>
                    <div className="text-sm opacity-75 truncate">{lab.title}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test Cases Editor */}
          <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {!selectedLab ? (
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-12 text-center">
                <Code className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 text-lg">Select a lab to manage test cases</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Messages */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3 animate-slide-down">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start gap-3 animate-slide-down">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-green-800 dark:text-green-200">{success}</p>
                  </div>
                )}

                {/* Sub-Tasks Section */}
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sub-Tasks</h2>
                    <button
                      onClick={() => handleOpenSubTaskModal()}
                      className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4" />
                      Add Sub-Task
                    </button>
                  </div>

                  {subTasks.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-4">No sub-tasks defined</p>
                  ) : (
                    <div className="space-y-2">
                      {subTasks.map((subTask, index) => (
                        <div
                          key={subTask.id}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                        >
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {index + 1}. {subTask.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenSubTaskModal(subTask)}
                              className="p-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubTask(subTask.id)}
                              className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Test Cases Section */}
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Test Cases</h2>

                  {/* No Sub-Task Tests */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-700 dark:text-slate-300">General Tests</h3>
                      <button
                        onClick={() => handleOpenModal(undefined, undefined)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Test
                      </button>
                    </div>
                    {getTestCasesForSubTask(undefined).length === 0 ? (
                      <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-3">No general tests</p>
                    ) : (
                      <div className="space-y-2">
                        {getTestCasesForSubTask(undefined).map(test => (
                          <div
                            key={test.id}
                            className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-slate-900 dark:text-slate-100">{test.name}</div>
                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{test.description}</div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => handleOpenModal(test)}
                                className="p-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTest(test.id)}
                                className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sub-Task Tests */}
                  {subTasks.map((subTask, index) => (
                    <div key={subTask.id} className="mb-6 last:mb-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                          {index + 1}. {subTask.name}
                        </h3>
                        <button
                          onClick={() => handleOpenModal(undefined, subTask.id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg transition-colors text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add Test
                        </button>
                      </div>
                      {getTestCasesForSubTask(subTask.id).length === 0 ? (
                        <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-3">No tests for this sub-task</p>
                      ) : (
                        <div className="space-y-2">
                          {getTestCasesForSubTask(subTask.id).map(test => (
                            <div
                              key={test.id}
                              className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-slate-900 dark:text-slate-100">{test.name}</div>
                                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{test.description}</div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <button
                                  onClick={() => handleOpenModal(test)}
                                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTest(test.id)}
                                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Manual Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-xl transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save All Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {currentTest ? 'Edit Test Case' : 'New Test Case'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Test Name
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., Test Server Port 8081"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Brief description of what this test validates"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Sub-Task (Optional)
                </label>
                <select
                  value={selectedSubTaskId || ""}
                  onChange={(e) => setSelectedSubTaskId(e.target.value || undefined)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">No Sub-Task (General)</option>
                  {subTasks.map(sq => (
                    <option key={sq.id} value={sq.id}>{sq.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Test Code (JavaScript)
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Write JavaScript code that will validate the student's submission. Use assertions or return true/false.
                </p>
                <textarea
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
                  rows={15}
                  placeholder={`// Example test code:
const axios = require('axios');

async function test() {
  try {
    const response = await axios.get('http://localhost:8081/hello');
    const text = response.data;
    
    // Check if response contains expected format
    if (text.includes('Hello from Server:') && /\\d{13}/.test(text)) {
      return { pass: true, message: 'Test passed' };
    }
    return { pass: false, message: 'Response format incorrect' };
  } catch (error) {
    return { pass: false, message: 'Server not responding' };
  }
}

module.exports = test;`}
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTest}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg transition-colors font-semibold"
              >
                {currentTest ? 'Update Test' : 'Create Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Task Modal */}
      {isSubTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {currentSubTask ? 'Edit Sub-Task' : 'New Sub-Task'}
              </h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Sub-Task Name
              </label>
              <input
                type="text"
                value={subTaskName}
                onChange={(e) => setSubTaskName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g., Task 1: Create Server"
              />
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setIsSubTaskModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubTask}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg transition-colors font-semibold"
              >
                {currentSubTask ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
