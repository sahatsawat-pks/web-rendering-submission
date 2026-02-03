"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { getGradientStyleProps, getShadowColorClass } from "@/lib/colors"

interface MultiQuestionGradingProps {
  subjectCode: string
  hasQuizManagement?: boolean
  role?: string
  username?: string
  color?: string
  googleSheetId?: string
}

export default function MultiQuestionGrading({
  subjectCode,
  hasQuizManagement = false,
  role = '',
  username = '',
  color = 'from-orange-500 to-red-500',
  googleSheetId
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
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch Labs and Prefixes
  useEffect(() => {
    async function fetchLabs() {
      try {
        const res = await fetch(`/api/labs?subject=${subjectCode}`, { cache: 'no-store' })
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
    setIsSubmitting(true)

    try {
        // We have multiple scores to submit.
        // We will use 'batch' update action to send multiple updates at once.
        // Example: Lab 1 Q1 -> Column "L1-Q1"? Or "Lab 1 Q1"?
        // sheets.ts logic for batch updates calls updateStudentLabScore.
        // That function takes 'labNumber'.
        // If we pass 'L1-Q1' as labNumber, sheets.ts will try to match column 'L1-Q1'.
        // If we configure our Subject Pattern correctly or if headers match, it works!
        // User request: "Ex l1-q1 , l1-q2"
        
        const updates = totalQuestions.map(q => {
             let labColumnName = `L${selectedLab}-${q}`;
             
             if (subjectCode === 'ITCS113') {
                 // Format: l2-q1 (lowercase, no padding on lab, remove 'Q' prefix from question)
                 const labInt = parseInt(selectedLab).toString();
                 const qInt = q.replace(/Q/i, 'q'); 
                 // Actually q is "Q1", so q.replace(/Q/i, 'q') -> "q1"
                 // Or just lower case everything: l2-q1
                 labColumnName = `l${labInt}-${qInt.toLowerCase()}`;
             }

             return {
                username: studentId,
                labNumber: labColumnName,
                score: parseInt(questionScores[q] || "0"),
                subject: subjectCode
             }
        });

        console.log(`[MultiQuestionGrading] Submitting batch updates for ${subjectCode}:`, updates);

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
    } finally {
        setIsSubmitting(false)
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
        const labsRes = await fetch(`/api/labs?subject=${subjectCode}`, { cache: 'no-store' })
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
      <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-300 border-white/40">
         <div className="flex items-center justify-between mb-8">
           <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
             <svg
               className="w-5 h-5 text-orange-600 dark:text-orange-400"
               fill="none"
               stroke="currentColor"
               viewBox="0 0 24 24"
             >
               <path
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 strokeWidth={2}
                 d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
               />
             </svg>
             Student Lab Grader
           </h3>
           {googleSheetId && (
            <a
                href={`https://docs.google.com/spreadsheets/d/${googleSheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 hover:opacity-90 text-white rounded-lg transition-colors text-sm font-semibold shadow-lg ${getShadowColorClass(color)} ${getGradientStyleProps(color).className}`}
                style={getGradientStyleProps(color).style}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Open Lab Sheet</span>
            </a>
           )}
         </div>

         <form onSubmit={handleGradeSubmit} className="space-y-4">
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                 Lab Assignment
               </label>
               <select
                 value={selectedLab}
                 onChange={e => setSelectedLab(e.target.value)}
                 required
                 className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 shadow-sm hover:border-orange-300 dark:hover:border-orange-600 transition-all"
               >
                 <option value="">Select Lab</option>
                 {labs.filter(l=>l.isActive).map(l=><option key={l.id} value={l.labNumber}>Lab {l.labNumber}: {l.title}</option>)}
               </select>
             </div>

             <div>
               <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                 Student ID
               </label>
               <div className="flex gap-2">
                 <select
                   value={selectedPrefix}
                   onChange={e=>{setSelectedPrefix(e.target.value); setStudentId(e.target.value+remainingDigits)}}
                   className="w-28 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 shadow-sm hover:border-orange-300 dark:hover:border-orange-600 transition-all font-mono"
                 >
                   {prefixes.map(p=><option key={p} value={p}>{p}</option>)}
                 </select>
                 <input
                   type="text"
                   value={remainingDigits}
                   onChange={e=>{const v=e.target.value.replace(/\D/g,''); setRemainingDigits(v); setStudentId(selectedPrefix+v)}}
                   maxLength={5}
                   placeholder="xxxxx"
                   required
                   className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 shadow-sm hover:border-orange-300 dark:hover:border-orange-600 transition-all font-mono"
                 />
               </div>
               <p className="text-xs text-slate-500 mt-1">Select prefix, then enter remaining digits</p>
             </div>
           </div>

           {/* Dynamic Questions Input Grid */}
           {totalQuestions.length > 0 && (
             <div className="border-2 border-orange-200 dark:border-orange-800 rounded-xl p-6 space-y-4 bg-orange-50/30 dark:bg-orange-900/10">
               <div className="flex items-center justify-between mb-3">
                 <h4 className="text-sm font-bold text-orange-900 dark:text-orange-300 flex items-center gap-2">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                   </svg>
                   Score Entry for Lab {selectedLab}
                 </h4>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                 {totalQuestions.map(q => (
                   <div key={q}>
                     <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">{q}</label>
                     <input 
                       type="number" 
                       value={questionScores[q] || ""} 
                       onChange={e => setQuestionScores({...questionScores, [q]: e.target.value})}
                       placeholder="Score"
                       className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 shadow-sm hover:border-orange-300 dark:hover:border-orange-600 transition-all text-center font-mono font-medium"
                     />
                   </div>
                 ))}
               </div>
             </div>
           )}

           <button
             type="submit"
             disabled={isSubmitting}
             className={`w-full px-6 py-3 text-white font-bold rounded-xl shadow-lg transition-all btn-hover-lift flex items-center justify-center gap-2 ${getGradientStyleProps(color).className} disabled:opacity-70 disabled:cursor-not-allowed`}
             style={getGradientStyleProps(color).style}
           >
             {isSubmitting ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
             ) : (
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
               </svg>
             )}
             Submit All Scores
           </button>

           {gradingSuccess && (
             <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-6 py-4 rounded-xl shadow-lg animate-scale-in relative">
               <button 
                 onClick={() => setGradingSuccess(false)}
                 className="absolute top-2 right-2 p-1 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full transition-colors"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>

               <div className="flex items-start gap-4">
                 <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-full">
                   <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                   </svg>
                 </div>
                 <div>
                   <span className="font-bold text-lg mb-1 block">Success!</span>
                   <div className="space-y-1 text-sm mt-2">
                     <p><span className="font-semibold opacity-70">Student ID:</span> {lastSubmittedStudentId}</p>
                     <p><span className="font-semibold opacity-70">Lab {selectedLab}:</span> <span className="font-bold text-emerald-600 dark:text-emerald-400">All scores saved</span></p>
                   </div>
                 </div>
               </div>
             </div>
           )}

           {gradingError && (
             <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-6 py-4 rounded-xl">
               <p className="font-semibold">Error: {gradingError}</p>
             </div>
           )}
         </form>
      </div>

      {/* Lab List */}
      <div className="glass-card p-8 animate-scale-in hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-300 border-white/40">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-orange-600 dark:text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Labs
          </h3>
          <div className="flex gap-2">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border shadow-md text-white ${getGradientStyleProps(color).className}`}
                  style={getGradientStyleProps(color).style}
            >
              {new Set(labs.map(lab => lab.labNumber)).size} Total
            </span>
            {hasQuizManagement && ['Lecturer', 'Main Admin'].includes(role) && (
              <a href={`/admin/${subjectCode.toLowerCase()}/quiz`} className="px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg text-xs font-medium border border-pink-200 dark:border-pink-800 shadow-sm hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors">
                Manage Quiz
              </a>
            )}
            {(['Lecturer', 'Main Admin'].includes(role) || username === 'kanzaki_aito') && (
              <a href={`/admin/labs?subject=${subjectCode}`} className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium border border-indigo-200 dark:border-indigo-800 shadow-sm hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors">
                Lab Management
              </a>
            )}
            {['Lecturer', 'Main Admin'].includes(role) && (
              <button
                onClick={() => setShowNewLabDialog(true)}
                className={`px-3 py-1.5 hover:opacity-90 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1 ${getGradientStyleProps(color).className}`}
                style={getGradientStyleProps(color).style}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                New Lab
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-4">
          {labs.filter(l => l.isActive).map(l => (
            <div
              key={l.id}
              className="flex items-center gap-5 p-5 rounded-2xl border transition-all smooth-transition group border-slate-100 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-lg hover:shadow-orange-500/5"
            >
              <div
                className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg transition-transform duration-300 text-white group-hover:scale-105 ${getGradientStyleProps(color).className}`}
                style={getGradientStyleProps(color).style}
              >
                {l.labNumber}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-base font-semibold truncate text-slate-900 dark:text-slate-200">
                    {l.title}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 whitespace-nowrap">
                    {l.subQuestions ? JSON.parse(l.subQuestions).length : 1} Questions
                  </span>
                </div>
              </div>
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
