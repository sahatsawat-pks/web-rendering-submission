"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { getGradientStyleProps } from "@/lib/colors"

interface MultiQuestionGradingProps {
  subjectCode: string
  subjectTitle: string
  role: 'LA' | 'Lecturer' | 'Main Admin'
  username: string
  color?: string
}

export default function MultiQuestionGrading({
  subjectCode,
  subjectTitle,
  role,
  username,
  color = 'from-orange-500 to-red-500'
}: MultiQuestionGradingProps) {
  const [labs, setLabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [studentId, setStudentId] = useState("")
  const [selectedLab, setSelectedLab] = useState("")
  
  // Dynamic Questions State
  // { "Q1": "10", "Q2": "5" }
  const [questionScores, setQuestionScores] = useState<Record<string, string>>({})
  const [totalQuestions, setTotalQuestions] = useState<string[]>([])
  
  const [gradingSuccess, setGradingSuccess] = useState(false)
  const [gradingError, setGradingError] = useState<string | null>(null)
  const [lastSubmittedStudentId, setLastSubmittedStudentId] = useState("")
  
  const [prefixes, setPrefixes] = useState<string[]>([])
  const [selectedPrefix, setSelectedPrefix] = useState("6788")
  const [remainingDigits, setRemainingDigits] = useState("")
  
  const [showNewLabDialog, setShowNewLabDialog] = useState(false)
  const [newLabData, setNewLabData] = useState({
    labNumber: "",
    title: "",
    fileName: "",
    isActive: true,
    deadline: "",
    questionCount: "1" // New field for this type
  })
  const [creatingLab, setCreatingLab] = useState(false)

  // Fetch Labs and Prefixes
  useEffect(() => {
    async function fetchLabs() {
      try {
        const res = await fetch(`/api/labs?subject=${subjectCode}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            const sortedLabs = data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber))
            setLabs(sortedLabs)
            
            const activeLabs = sortedLabs.filter((lab: any) => lab.isActive)
            if (activeLabs.length > 0) {
              const latest = activeLabs[activeLabs.length - 1]
              setSelectedLab(latest.labNumber)
            }
          }
        }
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    fetchLabs()

    fetch(`/api/student-prefixes?subject=${subjectCode}`).then(r=>r.json()).then(d=>{
        if(d.success && d.prefixes) {
            const sorted = d.prefixes.sort();
            setPrefixes(sorted);
            if(sorted.length > 0) setSelectedPrefix(sorted[sorted.length - 1]);
        }
    }).catch(console.error)
  }, [subjectCode])

  // Update questions based on selected lab
  useEffect(() => {
      if (!selectedLab) {
          setTotalQuestions([]);
          return;
      }
      const lab = labs.find(l => l.labNumber === selectedLab);
      if (lab && lab.subQuestions) {
          try {
              const qs = JSON.parse(lab.subQuestions); // e.g. ["Q1", "Q2"]
              setTotalQuestions(qs);
              // Init scores
              const initial : any = {};
              qs.forEach((q: string) => initial[q] = ""); // Empty start
              setQuestionScores(initial);
          } catch (e) {
              setTotalQuestions(["Q1"]); // Fallback
          }
      } else {
          setTotalQuestions(["Q1"]);
      }
  }, [selectedLab, labs]);

  async function handleGradeSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGradingError(null)
    setGradingSuccess(false)

    try {
        // We have multiple scores to submit.
        // We will use 'batch' update action to send multiple updates at once.
        // Example: Lab 1 Q1 -> Column "L1-Q1"? Or "Lab 1 Q1"?
        // sheets.ts logic for batch updates calls updateStudentLabScore.
        // That function takes 'labNumber'.
        // If we pass 'L1-Q1' as labNumber, sheets.ts will try to match column 'L1-Q1'.
        // If we configure our Subject Pattern correctly or if headers match, it works!
        // User request: "Ex l1-q1 , l1-q2"
        
        const updates = totalQuestions.map(q => ({
            username: studentId,
            labNumber: `L${selectedLab}-${q}`, // Constructing dynamic column name hint? Or let sheets.ts handle it?
            // Actually, best to rely on column matching.
            // If the sheet has "L1-Q1", passing "L1-Q1" as labNumber to `updateStudentLabScore` works 
            // because standard logic attempts regex match or exact match.
            score: parseInt(questionScores[q] || "0"),
            subject: subjectCode
        }));

        const res = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'batch', // Use batch mode
                updates
            })
        });

        if (res.ok) {
             setLastSubmittedStudentId(studentId);
             setGradingSuccess(true);
             setStudentId("");
             setRemainingDigits("");
             // Reset scores
             const reset : any = {};
             totalQuestions.forEach(q => reset[q] = "");
             setQuestionScores(reset);
        } else {
            const data = await res.json();
            setGradingError(data.error || "Failed to update scores");
        }
    } catch (err: any) {
        setGradingError(err.message || "An unexpected error occurred");
    }
  }

  async function handleCreateLab(e: React.FormEvent) {
    e.preventDefault()
    setCreatingLab(true)
    
    // Generate Sub Questions JSON
    const count = parseInt(newLabData.questionCount) || 1;
    const subQuestions = Array.from({length: count}, (_, i) => `Q${i+1}`); // ["Q1", "Q2"...]
    
    try {
      const response = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLabData,
          subject: subjectCode,
          subQuestions: JSON.stringify(subQuestions) // Store Q structure
        })
      })
      
      if (response.ok) {
        setNewLabData({ ...newLabData, title: "", fileName: "", questionCount: "1", deadline: "" });
        setShowNewLabDialog(false);
        // Refresh
        const labsRes = await fetch(`/api/labs?subject=${subjectCode}`)
        if (labsRes.ok) {
            const data = await labsRes.json();
            if (data.success) setLabs(data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber)));
        }
      } else {
        alert("Failed to create lab");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to create lab");
    } finally {
      setCreatingLab(false);
    }
  }

  return (
    <div className="flex-1 space-y-8">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-200">{subjectCode} Dashboard</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Grader */}
      <div className="glass-card p-8 animate-scale-in transition-all duration-300 border-white/40">
         <div className="flex items-center gap-3 mb-6">
             <div className={`p-2 rounded-lg text-white shadow-lg ${getGradientStyleProps(color).className}`} style={getGradientStyleProps(color).style}>
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
             </div>
             <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">Student Lab Grader</h3>
         </div>

         <form onSubmit={handleGradeSubmit} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Lab</label>
                    <select value={selectedLab} onChange={e => setSelectedLab(e.target.value)} required className="w-full px-4 py-3 rounded-xl border dark:bg-slate-800 dark:border-slate-600">
                        <option value="">Select Lab</option>
                        {labs.filter(l=>l.isActive).map(l=><option key={l.id} value={l.labNumber}>Lab {l.labNumber}: {l.title}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Student ID</label>
                    <div className="flex gap-2">
                        <select value={selectedPrefix} onChange={e=>{setSelectedPrefix(e.target.value); setStudentId(e.target.value+remainingDigits)}} className="w-28 px-3 py-3 rounded-xl border dark:bg-slate-800 dark:border-slate-600 font-mono">
                            {prefixes.map(p=><option key={p} value={p}>{p}</option>)}
                        </select>
                        <input type="text" value={remainingDigits} onChange={e=>{const v=e.target.value.replace(/\D/g,''); setRemainingDigits(v); setStudentId(selectedPrefix+v)}} maxLength={5} placeholder="xxxxx" required className="flex-1 px-4 py-3 rounded-xl border dark:bg-slate-800 dark:border-slate-600 font-mono" />
                    </div>
                 </div>
             </div>

             {/* Dynamic Questions Input Grid */}
             {totalQuestions.length > 0 && (
                 <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                     <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">Questions</h4>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                         {totalQuestions.map(q => (
                             <div key={q}>
                                 <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">{q}</label>
                                 <input 
                                    type="number" 
                                    value={questionScores[q] || ""} 
                                    onChange={e => setQuestionScores({...questionScores, [q]: e.target.value})}
                                    placeholder="Score"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-orange-500/50 text-center font-mono font-medium"
                                 />
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             <button type="submit" className={`w-full px-6 py-3 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${getGradientStyleProps(color).className}`} style={getGradientStyleProps(color).style}>
                 Submit All Scores
             </button>

             {gradingSuccess && (
                <div className="bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl text-center font-medium animate-scale-in">
                    Saved scores for {lastSubmittedStudentId}!
                </div>
             )}
             {gradingError && (
                <div className="bg-red-100/50 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-xl text-center font-medium">
                    {gradingError}
                </div>
             )}
         </form>
      </div>

      {/* Lab List */}
      <div className="glass-card p-8 border-white/40">
          <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg dark:text-white">Active Labs</h3>
              <button 
                onClick={() => setShowNewLabDialog(true)}
                className={`px-4 py-2 rounded-lg text-white text-xs font-bold ${getGradientStyleProps(color).className}`}
                style={getGradientStyleProps(color).style}
              >
                  + New Lab
              </button>
          </div>
          <div className="flex flex-wrap gap-2">
              {labs.filter(l => l.isActive).map(l => (
                  <div key={l.id} className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200">Lab {l.labNumber}</span>
                      <span className="text-xs text-slate-500 ml-2">({l.subQuestions ? JSON.parse(l.subQuestions).length : 1} Qs)</span>
                  </div>
              ))}
          </div>
      </div>

      {/* New Lab Dialog */}
      {showNewLabDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in">
                  <h3 className="font-bold text-xl mb-4 dark:text-white">Create Multi-Q Lab</h3>
                  <form onSubmit={handleCreateLab} className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold mb-1 dark:text-slate-300">Lab Number</label>
                          <input type="text" value={newLabData.labNumber} onChange={e=>setNewLabData({...newLabData, labNumber:e.target.value})} className="w-full p-2 rounded-lg border dark:bg-slate-900" required />
                      </div>
                      <div>
                          <label className="block text-sm font-bold mb-1 dark:text-slate-300">Number of Questions</label>
                          <input type="number" min="1" max="20" value={newLabData.questionCount} onChange={e=>setNewLabData({...newLabData, questionCount:e.target.value})} className="w-full p-2 rounded-lg border dark:bg-slate-900" required />
                      </div>
                      <div>
                          <label className="block text-sm font-bold mb-1 dark:text-slate-300">Title</label>
                          <input type="text" value={newLabData.title} onChange={e=>setNewLabData({...newLabData, title:e.target.value})} className="w-full p-2 rounded-lg border dark:bg-slate-900" required />
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                          <button type="button" onClick={()=>setShowNewLabDialog(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                          <button type="submit" className={`px-4 py-2 text-white rounded-lg font-bold ${getGradientStyleProps(color).className}`} style={getGradientStyleProps(color).style}>Create</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  )
}
