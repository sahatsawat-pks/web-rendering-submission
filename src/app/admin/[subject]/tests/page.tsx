"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import TestManagementPage from "@/components/admin/TestManagementPage"

export default function SubjectTestsPage() {
  const params = useParams()
  const subjectCode = typeof params?.subject === 'string' ? params.subject : ''
  const [subjectConfig, setSubjectConfig] = useState<any>(null)
  
  useEffect(() => {
    if (subjectCode) {
      fetch(`/api/subjects?code=${subjectCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.subjects && data.subjects.length > 0) {
            setSubjectConfig(data.subjects[0])
          }
        })
        .catch(err => console.error("Failed to fetch subject config", err))
    }
  }, [subjectCode])

  if (!subjectCode) return <div>Invalid Subject</div>

  // Logic to determine props based on subject
  // In a future refactor, these could be columns in the DB
  const isITCS251 = subjectCode === 'ITCS251'
  const isITCS123 = subjectCode === 'ITCS123' || subjectCode === 'ITCS223' // Java challenges

  const taskKey = isITCS251 ? 'subQuestions' : 'Tasks'
  const taskLabel = isITCS251 ? 'Task' : 'Task' // Both effectively use 'Task' label in UI now 
  // Wait, ITCS251 uses "Task" in UI but calls it subQuestions in DB.
  // ITCS123 uses "Task" in UI and Tasks in DB.
  // The original files used "Task" everywhere.

  const hasChallengeMode = isITCS123
  const hasVerificationCode = isITCS251 // Python verification
  const allowedMatchModes: ('trim' | 'exact' | 'regex')[] = isITCS251 
    ? ['trim', 'exact', 'regex'] 
    : ['trim', 'exact']
  
  const hasTotalScore = isITCS251

  const getTheme = (dbColor: string) => {
    if (!dbColor) {
      // Default per subject if no DB color (shouldn't happen but fallback)
      if (isITCS251) return {
         gradient: "from-blue-50 via-white to-indigo-50",
         primary: "text-blue-600",
         secondary: "bg-blue-600",
         accent: "blue"
      }
      return undefined
    }

    if (dbColor.includes('purple') || dbColor.includes('pink')) {
       return {
         gradient: "from-purple-50 to-pink-50",
         primary: "text-purple-600",
         secondary: "bg-purple-600",
         accent: "purple"
       }
    } else if (dbColor.includes('orange') || dbColor.includes('amber')) {
      return {
        gradient: "from-orange-50 via-white to-amber-50",
        primary: "text-orange-600",
        secondary: "bg-orange-600",
        accent: "orange"
      }
    } else if (dbColor.includes('blue') || dbColor.includes('sky')) {
       return {
         gradient: "from-blue-50 via-white to-sky-50",
         primary: "text-blue-600",
         secondary: "bg-blue-600",
         accent: "blue"
       }
    } else if (dbColor.includes('green') || dbColor.includes('teal')) {
       return {
         gradient: "from-green-50 via-white to-teal-50",
         primary: "text-teal-600",
         secondary: "bg-teal-600",
         accent: "teal"
       }
    } else if (dbColor.includes('indigo')) {
        return {
          gradient: "from-indigo-50 via-white to-violet-50",
          primary: "text-indigo-600",
          secondary: "bg-indigo-600",
          accent: "indigo"
        }
    }
    
    return undefined
  }

  return (
    <TestManagementPage
      subjectCode={subjectCode}
      subjectTitle={subjectConfig?.title || subjectCode}
      taskKey={taskKey}
      taskLabel={taskLabel}
      hasChallengeMode={hasChallengeMode}
      hasVerificationCode={hasVerificationCode}
      hasTotalScore={hasTotalScore}
      allowedMatchModes={allowedMatchModes}
      colorTheme={getTheme(subjectConfig?.color)}
    />
  )
}
