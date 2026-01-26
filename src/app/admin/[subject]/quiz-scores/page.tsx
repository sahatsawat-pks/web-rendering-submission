"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import QuizScoresPage from "@/components/admin/QuizScoresPage"

export default function SubjectQuizScoresPage() {
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

  // derive color theme from config or default
  const getTheme = (dbColor: string) => {
    if (!dbColor) return undefined;

    if (dbColor.includes('purple') || dbColor.includes('pink')) {
       return {
         gradient: "from-purple-50 via-white to-pink-50",
         primary: "text-purple-600",
         secondary: "bg-purple-600",
         accent: "purple"
       }
    } else if (dbColor.includes('green') || dbColor.includes('teal')) {
       return {
         gradient: "from-green-50 via-white to-teal-50",
         primary: "text-teal-600",
         secondary: "bg-teal-600",
         accent: "teal"
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
    }
    
    return undefined
  }

  return (
    <QuizScoresPage
      subjectCode={subjectCode}
      colorTheme={getTheme(subjectConfig?.color)}
    />
  )
}
