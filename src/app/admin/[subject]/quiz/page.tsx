"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import QuizManagementPage from "@/components/admin/QuizManagementPage"

export default function SubjectQuizPage() {
  const params = useParams()
  const subjectCode = typeof params?.subject === 'string' ? params.subject : ''
  const [subjectConfig, setSubjectConfig] = useState<any>(null)
  
  useEffect(() => {
    if (subjectCode) {
      fetch(`/api/subjects?code=${subjectCode.toUpperCase()}`)
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

  // derive color theme from config or default
  // Config color is usually a gradient string like "from-purple-500 to-pink-500"
  // We need to parse this or map it to the structure expected by QuizManagementPage
  // QuizManagementPage expects: { gradient, primary, secondary, accent }
  
  const getTheme = (dbColor: string) => {
    if (!dbColor) return undefined; // use default

    // Heuristic mapping based on common patterns in the app
    if (dbColor.includes('purple') || dbColor.includes('pink')) {
       return {
         gradient: "from-purple-50 to-pink-50",
         primary: "text-purple-600",
         secondary: "bg-purple-600",
         accent: "purple"
       }
    } else if (dbColor.includes('green') || dbColor.includes('teal')) {
       return {
         gradient: "from-green-50 to-teal-50",
         primary: "text-teal-600",
         secondary: "bg-teal-600",
         accent: "teal"
       }
    } else if (dbColor.includes('orange') || dbColor.includes('amber')) {
      return {
        gradient: "from-orange-50 to-amber-50",
        primary: "text-orange-600",
        secondary: "bg-orange-600",
        accent: "orange"
      }
    } else if (dbColor.includes('blue') || dbColor.includes('sky')) {
       return {
         gradient: "from-blue-50 to-sky-50",
         primary: "text-blue-600",
         secondary: "bg-blue-600",
         accent: "blue"
       }
    }
    
    // Default fallback
    return undefined
  }

  return (
    <QuizManagementPage 
      subjectCode={subjectCode}
      colorTheme={getTheme(subjectConfig?.color)}
    />
  )
}
