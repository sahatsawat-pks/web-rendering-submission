"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import LogoutButton from "@/components/LogoutButton"
import { ModeToggle } from "@/components/mode-toggle"
import RichTextEditor from "@/components/RichTextEditor"
import RichTextDisplay from "@/components/RichTextDisplay"
import GiftImportModal from "@/components/GiftImportModal"
import { QuizSet, normalizeQuizPayload } from "@/lib/quizSetAdapter"
import { QuizLabStats } from "@/lib/quizStats"
import { BarChart3, Plus, Trash2, Edit3, CheckCircle2, XCircle, Star, Sparkles, HelpCircle, ArrowLeft, RefreshCw, Layers, BookOpen } from "lucide-react"

interface QuizQuestion {
  id: string
  question: string
  type: 'multiple-choice' | 'short-answer' | 'true-false' | 'multiple-answer'
  options?: string[]
  correctAnswer: string | string[]
  category: string
  explanation?: string
  imageUrl?: string
}

interface QuizCategory {
  id: string
  name: string
}

interface QuizManagementPageProps {
  subjectCode: string
  colorTheme?: {
    gradient: string
    primary: string
    secondary: string
    accent: string
  }
}

export default function QuizManagementPage({ 
  subjectCode, 
  colorTheme = {
    gradient: "from-purple-50 to-pink-50",
    primary: "text-purple-600", 
    secondary: "bg-purple-600",
    accent: "purple" 
  }
}: QuizManagementPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'LA' | 'Lecturer'>('LA')
  
  const [labs, setLabs] = useState<any[]>([])
  const [selectedLab, setSelectedLab] = useState("")
  const [categories, setCategories] = useState<QuizCategory[]>([{ id: 'cat_default', name: 'General' }])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [quizEnabled, setQuizEnabled] = useState(false)
  const [timeLimit, setTimeLimit] = useState(0)
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false)

  // Create Lab Modal
  const [showCreateLabModal, setShowCreateLabModal] = useState(false)
  const [newLabNumber, setNewLabNumber] = useState("")
  const [newLabTitle, setNewLabTitle] = useState("")
  const [isCreatingLab, setIsCreatingLab] = useState(false)

  // Question Sets Management
  const [sets, setSets] = useState<QuizSet[]>([
    { id: 'set_1', name: 'Set 1 (English)', questions: [] }
  ])
  const [selectedSetId, setSelectedSetId] = useState<string>('set_1')
  const [activeSetId, setActiveSetId] = useState<string>('set_1')
  const [showAddSetModal, setShowAddSetModal] = useState(false)
  const [newSetName, setNewSetName] = useState("")
  const [editingSet, setEditingSet] = useState<QuizSet | null>(null)
  
  // View Mode: 'editor' | 'analytics'
  const [activeViewTab, setActiveViewTab] = useState<'editor' | 'analytics'>('editor')
  const [stats, setStats] = useState<QuizLabStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  
  // Category management
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategory, setEditingCategory] = useState<QuizCategory | null>(null)
  
  // Question management
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null)
  const [questionFormData, setQuestionFormData] = useState({
    question: "",
    type: "multiple-choice" as 'multiple-choice' | 'short-answer' | 'true-false' | 'multiple-answer',
    options: ["", "", "", "", ""],
    correctAnswer: "" as string | string[],
    category: "",
    explanation: "",
    imageUrl: ""
  })
  
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [showGiftImport, setShowGiftImport] = useState(false)
  const [showSettingsSavedDialog, setShowSettingsSavedDialog] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.role) setRole(data.role)
        if (data.username) setUsername(data.username)
        
        const permissionKey = subjectCode.toLowerCase()
        if (data.username === 'kanzaki_aito' || data.role === 'Lecturer' || (data.permissions && data.permissions[permissionKey])) {
          setHasAccess(true)
        } else {
          router.push('/admin/dashboard')
        }
      })
      .catch(() => router.push('/admin/login'))
      .finally(() => setLoading(false))

    fetchLabsList()
  }, [router, subjectCode])

  const fetchLabsList = async () => {
    try {
      const res = await fetch(`/api/labs?activeOnly=false&subject=${subjectCode.toUpperCase()}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          const sorted = data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber))
          setLabs(sorted)
        }
      }
    } catch (e) {
      console.error("Failed to fetch labs", e)
    }
  }

  useEffect(() => {
    if (selectedLab) {
      loadQuizData()
    }
  }, [selectedLab])

  useEffect(() => {
    if (selectedLab && activeViewTab === 'analytics') {
      loadStatsData()
    }
  }, [selectedLab, activeViewTab, selectedSetId])

  const loadQuizData = async () => {
    try {
      const res = await fetch(`/api/quiz?labNumber=${selectedLab}&subject=${subjectCode.toUpperCase()}`)
      if (res.ok) {
        const data = await res.json()
        
        const loadedCategories = (data.categories && data.categories.length > 0)
          ? data.categories
          : [{ id: 'cat_default', name: 'General' }]
        setCategories(loadedCategories)
        
        setQuizEnabled(data.quizEnabled || false)
        setTimeLimit(data.quizTimeLimit || 0)
        setTimeLimitEnabled(data.quizTimeLimitEnabled || false)

        if (data.sets && data.sets.length > 0) {
          setSets(data.sets)
          const actId = data.activeSetId || data.sets[0].id
          setActiveSetId(actId)
          const targetSet = data.sets.find((s: any) => s.id === (selectedSetId || actId)) || data.sets[0]
          setSelectedSetId(targetSet.id)
          setQuestions(targetSet.questions || [])
        } else {
          const initialSet: QuizSet = { id: 'set_1', name: 'Set 1 (English)', questions: data.questions || [] }
          setSets([initialSet])
          setSelectedSetId('set_1')
          setActiveSetId('set_1')
          setQuestions(data.questions || [])
        }
      }
    } catch (e) {
      console.error("Failed to load quiz data", e)
    }
  }

  const loadStatsData = async () => {
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/quiz?action=stats&labNumber=${selectedLab}&subject=${subjectCode.toUpperCase()}&setId=${selectedSetId}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats || null)
      }
    } catch (e) {
      console.error("Failed to load stats data", e)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleSelectSet = (setId: string) => {
    setSelectedSetId(setId)
    const targetSet = sets.find(s => s.id === setId)
    if (targetSet) {
      setQuestions(targetSet.questions || [])
    }
  }

  const saveQuizData = async () => {
    if (!selectedLab) return
    
    setSaveStatus("Saving...")
    const updatedSets = sets.map(s => s.id === selectedSetId ? { ...s, questions } : s)
    setSets(updatedSets)

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_questions',
          labNumber: selectedLab,
          subject: subjectCode.toUpperCase(),
          categories,
          sets: updatedSets,
          activeSetId,
          questions
        })
      })
      
      if (res.ok) {
        setSaveStatus("Saved successfully!")
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        setSaveStatus("Failed to save")
      }
    } catch (e) {
      console.error("Failed to save quiz data", e)
      setSaveStatus("Error saving")
    }
  }

  const saveSettings = async () => {
    if (!selectedLab) return
    
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          labNumber: selectedLab,
          subject: subjectCode.toUpperCase(),
          quizEnabled,
          quizTimeLimit: timeLimit,
          quizTimeLimitEnabled: timeLimitEnabled
        })
      })
      
      if (res.ok) {
        setShowSettingsSavedDialog(true)
        setTimeout(() => setShowSettingsSavedDialog(false), 3000)
      } else {
        alert("Failed to save settings")
      }
    } catch (e) {
      console.error("Failed to save settings", e)
      alert("Error saving settings")
    }
  }

  const handleDeleteSelectedLab = async () => {
    const targetLabObj = labs.find(l => l.labNumber === selectedLab)
    if (!targetLabObj) return

    if (!confirm(`Are you sure you want to permanently delete "${targetLabObj.labNumber} - ${targetLabObj.title}"? This will delete the quiz lab and all recorded student scores.`)) {
      return
    }

    try {
      const res = await fetch(`/api/labs?id=${targetLabObj.id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        await fetchLabsList()
        setSelectedLab("")
        alert("Quiz lab deleted successfully.")
      } else {
        alert("Failed to delete quiz lab.")
      }
    } catch (err: any) {
      console.error("Failed to delete lab:", err)
      alert(err.message || "Error deleting quiz lab")
    }
  }

  // Create Lab Assignment Handler
  const handleCreateNewLab = async () => {
    if (!newLabNumber.trim() || !newLabTitle.trim()) {
      alert("Quiz number and title are required.")
      return
    }

    setIsCreatingLab(true)
    try {
      const res = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labNumber: newLabNumber.trim(),
          title: newLabTitle.trim(),
          subject: subjectCode.toUpperCase(),
          labType: "Lab",
          isActive: true,
          fileName: `quiz_${newLabNumber.trim()}.html`
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        // Enable quiz for newly created lab
        await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_settings",
            labNumber: newLabNumber.trim(),
            subject: subjectCode.toUpperCase(),
            quizEnabled: true,
            quizTimeLimit: 0,
            quizTimeLimitEnabled: false
          })
        })

        // Refresh labs list
        await fetchLabsList()

        // Automatically select the newly created quiz lab!
        setSelectedLab(newLabNumber.trim())
        setShowCreateLabModal(false)
        setNewLabNumber("")
        setNewLabTitle("")
      } else {
        alert(data.error || "Failed to create new quiz lab")
      }
    } catch (err: any) {
      console.error("Failed to create quiz lab:", err)
      alert(err.message || "Failed to create quiz lab")
    } finally {
      setIsCreatingLab(false)
    }
  }

  // Set Management Handlers
  const handleAddSet = () => {
    if (!newSetName.trim()) return
    const newId = `set_${Date.now()}`
    const newSet: QuizSet = {
      id: newId,
      name: newSetName.trim(),
      questions: []
    }
    const updated = [...sets, newSet]
    setSets(updated)
    setSelectedSetId(newId)
    setQuestions([])
    setNewSetName("")
    setShowAddSetModal(false)
  }

  const handleRenameSet = () => {
    if (!editingSet || !newSetName.trim()) return
    const updated = sets.map(s => s.id === editingSet.id ? { ...s, name: newSetName.trim() } : s)
    setSets(updated)
    setEditingSet(null)
    setNewSetName("")
  }

  const handleDeleteSet = (setId: string) => {
    if (sets.length <= 1) {
      alert("At least one question set must be kept.")
      return
    }
    if (!confirm("Are you sure you want to delete this question set? All questions inside it will be removed.")) return

    const updated = sets.filter(s => s.id !== setId)
    setSets(updated)
    if (activeSetId === setId) {
      setActiveSetId(updated[0].id)
    }
    handleSelectSet(updated[0].id)
  }

  const handleMakeActiveSet = (setId: string) => {
    setActiveSetId(setId)
  }

  // Category Management Handlers
  const addCategory = () => {
    if (!newCategoryName.trim()) return
    const newCategory: QuizCategory = { id: Date.now().toString(), name: newCategoryName.trim() }
    setCategories([...categories, newCategory])
    setNewCategoryName("")
    setShowCategoryModal(false)
  }

  const editCategory = () => {
    if (!editingCategory || !newCategoryName.trim()) return
    setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, name: newCategoryName.trim() } : c))
    setEditingCategory(null)
    setNewCategoryName("")
    setShowCategoryModal(false)
  }

  const deleteCategory = (id: string) => {
    if (questions.some(q => q.category === id)) {
      alert("Cannot delete category with existing questions. Reassign or delete the questions first.")
      return
    }
    setCategories(categories.filter(c => c.id !== id))
  }

  const openEditCategory = (category: QuizCategory) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setShowCategoryModal(true)
  }

  // Question Management Handlers
  const openAddQuestion = () => {
    let activeCategories = categories
    if (activeCategories.length === 0) {
      activeCategories = [{ id: 'cat_default', name: 'General' }]
      setCategories(activeCategories)
    }

    setEditingQuestion(null)
    setQuestionFormData({
      question: "",
      type: "multiple-choice",
      options: ["", "", "", "", ""],
      correctAnswer: "",
      category: activeCategories[0].id,
      explanation: "",
      imageUrl: ""
    })
    setShowQuestionModal(true)
  }

  const openEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question)
    setQuestionFormData({
      question: question.question,
      type: question.type,
      options: question.options && question.options.length >= 2 ? [...question.options] : ["", "", "", "", ""],
      correctAnswer: question.correctAnswer,
      category: question.category,
      explanation: question.explanation || "",
      imageUrl: question.imageUrl || ""
    })
    setShowQuestionModal(true)
  }

  const saveQuestion = () => {
    if (!questionFormData.question.trim() || !questionFormData.category) {
      alert("Question text and category are required.")
      return
    }

    if ((questionFormData.type === 'multiple-choice' || questionFormData.type === 'true-false') && !questionFormData.correctAnswer) {
      alert("Correct answer is required.")
      return
    }

    if (questionFormData.type === 'multiple-answer') {
      if (!Array.isArray(questionFormData.correctAnswer) || questionFormData.correctAnswer.length === 0) {
        alert("Please select at least one correct answer for multiple-answer question.")
        return
      }
    }

    const questionData: QuizQuestion = {
      id: editingQuestion ? editingQuestion.id : Date.now().toString(),
      question: questionFormData.question,
      type: questionFormData.type,
      options: questionFormData.type === 'short-answer' ? undefined : questionFormData.options.filter(o => o.trim() !== ""),
      correctAnswer: questionFormData.correctAnswer,
      category: questionFormData.category,
      explanation: questionFormData.explanation || undefined,
      imageUrl: questionFormData.imageUrl || undefined
    }

    let updatedQuestions: QuizQuestion[]
    if (editingQuestion) {
      updatedQuestions = questions.map(q => q.id === editingQuestion.id ? questionData : q)
    } else {
      updatedQuestions = [...questions, questionData]
    }

    setQuestions(updatedQuestions)
    setSets(prev => prev.map(s => s.id === selectedSetId ? { ...s, questions: updatedQuestions } : s))
    setShowQuestionModal(false)
    setEditingQuestion(null)
    setSaveStatus("Question updated! Remember to click '💾 Save All Questions' to save to server.")
  }

  const deleteQuestion = (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      const updated = questions.filter(q => q.id !== id)
      setQuestions(updated)
      setSets(prev => prev.map(s => s.id === selectedSetId ? { ...s, questions: updated } : s))
    }
  }

  const handleGiftImport = (importedQuestions: QuizQuestion[]) => {
    let updatedCategories = [...categories]

    const updatedImported = importedQuestions.map(q => {
      let catId = q.category

      if (catId) {
        // Check if a category with this name or id already exists
        const existing = updatedCategories.find(
          c => c.id.toLowerCase() === catId.toLowerCase() || c.name.toLowerCase() === catId.toLowerCase()
        )

        if (existing) {
          catId = existing.id
        } else {
          // Create new category dynamically for the imported GIFT category!
          const newCat: QuizCategory = {
            id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: catId
          }
          updatedCategories.push(newCat)
          catId = newCat.id
        }
      } else {
        if (updatedCategories.length === 0) {
          const defaultCat: QuizCategory = { id: 'cat_default', name: 'General' }
          updatedCategories.push(defaultCat)
          catId = defaultCat.id
        } else {
          catId = updatedCategories[0].id
        }
      }

      return {
        ...q,
        category: catId
      }
    })

    setCategories(updatedCategories)

    const updated = [...questions, ...updatedImported]
    setQuestions(updated)
    setSets(prev => prev.map(s => s.id === selectedSetId ? { ...s, questions: updated } : s))
    setShowGiftImport(false)
    setSaveStatus(`Imported ${importedQuestions.length} questions into categories! Click "Save All Questions" to keep.`)
  }

  if (loading || !hasAccess) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">{loading ? 'Loading...' : 'Checking permissions...'}</p>
        </div>
      </div>
    )
  }

  const currentSetObj = sets.find(s => s.id === selectedSetId) || sets[0]

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colorTheme.gradient} dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors`}>
      {/* Top Navbar */}
      <div className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/admin/${subjectCode.toLowerCase()}`)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back to {subjectCode.toUpperCase()}
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
              <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              Quiz Management - {subjectCode.toUpperCase()}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 animate-scale-in">
        {/* Lab Selection & Mode Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Select Quiz Lab Assignment
                </label>
                <button
                  onClick={() => {
                    const nextNum = (labs.length + 1).toString()
                    setNewLabNumber(nextNum)
                    setNewLabTitle(`Quiz ${nextNum}`)
                    setShowCreateLabModal(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Create New Quiz Lab
                </button>
              </div>

              <div className="flex gap-2">
                <select
                  value={selectedLab}
                  onChange={(e) => setSelectedLab(e.target.value)}
                  className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-slate-200 font-medium shadow-sm"
                >
                  <option value="">-- Select a Quiz Lab --</option>
                  {labs.filter(lab => lab.labType !== 'Challenge').map(lab => (
                    <option key={lab.id} value={lab.labNumber}>
                      {lab.labNumber} - {lab.title}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const nextNum = (labs.length + 1).toString()
                    setNewLabNumber(nextNum)
                    setNewLabTitle(`Quiz ${nextNum}`)
                    setShowCreateLabModal(true)
                  }}
                  className="px-4 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-md flex items-center gap-1 text-sm flex-shrink-0"
                >
                  <Plus className="w-4 h-4" /> New Quiz
                </button>

                {selectedLab && (
                  <button
                    onClick={handleDeleteSelectedLab}
                    className="px-3.5 py-3 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-bold rounded-xl hover:bg-red-200 dark:hover:bg-red-900/60 transition-all shadow-sm flex items-center gap-1.5 text-sm flex-shrink-0"
                    title="Permanently Delete Selected Quiz Lab"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Quiz
                  </button>
                )}
              </div>
            </div>

            {selectedLab && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-600">
                <button
                  onClick={() => setActiveViewTab('editor')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    activeViewTab === 'editor'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Edit3 className="w-4 h-4" /> Questions Editor
                </button>
                <button
                  onClick={() => setActiveViewTab('analytics')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    activeViewTab === 'analytics'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" /> Analytics & Statistics
                </button>
              </div>
            )}
          </div>

          {!selectedLab && (
            <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-center">
              {labs.length === 0 ? (
                <div>
                  <p className="font-semibold text-purple-900 dark:text-purple-200 text-sm mb-2">
                    No quiz labs exist for {subjectCode.toUpperCase()} yet.
                  </p>
                  <button
                    onClick={() => {
                      setNewLabNumber("1")
                      setNewLabTitle("Quiz 1 - Check Your Understanding")
                      setShowCreateLabModal(true)
                    }}
                    className="px-5 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-md inline-flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Create Your First Quiz Lab
                  </button>
                </div>
              ) : (
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Select a Quiz Lab from the dropdown above (or click "+ New Quiz") to edit questions, sets, and settings.
                </p>
              )}
            </div>
          )}
        </div>

        {selectedLab && activeViewTab === 'editor' && (
          <>
            {/* Quiz Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" /> Quiz Settings
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizEnabled}
                    onChange={(e) => setQuizEnabled(e.target.checked)}
                    className="w-5 h-5 accent-purple-600 rounded"
                  />
                  <span>Enable Quiz for this Lab</span>
                </label>

                <div>
                  <label className="flex items-center gap-3 mb-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={timeLimitEnabled}
                      onChange={(e) => setTimeLimitEnabled(e.target.checked)}
                      className="w-5 h-5 accent-purple-600 rounded"
                    />
                    <span>Enable Time Limit</span>
                  </label>
                  
                  {timeLimitEnabled && (
                    <div className="ml-8">
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                        Time Limit (minutes)
                      </label>
                      <input
                        type="number"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                        min="0"
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-slate-200 font-mono w-40"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={saveSettings}
                  className={`px-6 py-2.5 ${colorTheme.secondary} text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-md`}
                >
                  Save Settings
                </button>
              </div>
            </div>

            {/* Question Sets Manager */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600" /> Question Sets (Multi-Language / Versions)
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage sets for English, Thai, or alternate quiz versions. The active set is delivered to students.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNewSetName("")
                    setShowAddSetModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-semibold rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Add Question Set
                </button>
              </div>

              {/* Sets Tabs */}
              <div className="flex flex-wrap gap-2 items-center">
                {sets.map((set) => {
                  const isSelected = set.id === selectedSetId
                  const isActiveForStudents = set.id === activeSetId

                  return (
                    <div
                      key={set.id}
                      onClick={() => handleSelectSet(set.id)}
                      className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{set.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-purple-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                        {set.questions.length} Qs
                      </span>
                      {isActiveForStudents && (
                        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-amber-400 text-amber-950 font-bold rounded-full shadow-sm" title="Active set delivered to students">
                          <Star className="w-3 h-3 fill-amber-950" /> Active
                        </span>
                      )}

                      {/* Dropdown action on selected set */}
                      {isSelected && (
                        <div className="flex items-center gap-1 ml-2 border-l border-purple-400/50 pl-2">
                          {!isActiveForStudents && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMakeActiveSet(set.id); }}
                              className="p-1 hover:bg-purple-500 rounded text-amber-300"
                              title="Set as Active Set for students"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSet(set); setNewSetName(set.name); }}
                            className="p-1 hover:bg-purple-500 rounded text-white"
                            title="Rename Set"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {sets.length > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSet(set.id); }}
                              className="p-1 hover:bg-purple-500 rounded text-red-200"
                              title="Delete Set"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Categories Management */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Categories</h2>
                <button
                  onClick={() => {
                    setEditingCategory(null)
                    setNewCategoryName("")
                    setShowCategoryModal(true)
                  }}
                  className={`px-4 py-2 ${colorTheme.secondary} text-white font-semibold rounded-xl hover:opacity-90 transition-colors shadow-sm`}
                >
                  + Add Category
                </button>
              </div>

              {categories.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                  No categories yet. Click "+ Add Category" to create one.
                </p>
              ) : (
                <div className="grid gap-3">
                  {categories.map(category => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{category.name}</span>
                        <span className="ml-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
                          ({questions.filter(q => q.category === category.id).length} questions in {currentSetObj?.name})
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditCategory(category)}
                          className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-medium rounded-lg hover:bg-red-200 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Questions Management */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                    Questions ({currentSetObj?.name})
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {saveStatus && (
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400 mr-2">{saveStatus}</span>
                  )}
                  <button
                    onClick={saveQuizData}
                    className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-md flex items-center gap-1.5"
                  >
                    💾 Save All Questions
                  </button>
                  <button
                    onClick={() => setShowGiftImport(true)}
                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center gap-1.5"
                    title="Import questions from GIFT format (Moodle)"
                  >
                    📥 Import GIFT
                  </button>
                  <button
                    onClick={openAddQuestion}
                    className={`px-4 py-2 ${colorTheme.secondary} text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md`}
                  >
                    + Add Question
                  </button>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30">
                  <p className="text-slate-600 dark:text-slate-300 font-bold mb-2">
                    No questions in {currentSetObj?.name} yet.
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    Click "+ Add Question" to create your first question, or "Import GIFT" to import Moodle format questions.
                  </p>
                  <button
                    onClick={openAddQuestion}
                    className={`px-5 py-2.5 ${colorTheme.secondary} text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md inline-flex items-center gap-2`}
                  >
                    <Plus className="w-4 h-4" /> Add First Question
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {categories.map(category => {
                    const categoryQuestions = questions.filter(q => q.category === category.id)
                    if (categoryQuestions.length === 0) return null

                    return (
                      <div key={category.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50/30 dark:bg-slate-800/30">
                        <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                          {category.name} ({categoryQuestions.length})
                        </h3>
                        <div className="space-y-4">
                          {categoryQuestions.map((question, idx) => (
                            <div
                              key={question.id}
                              className="p-5 bg-white dark:bg-slate-700/60 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Q{idx + 1}.</span>
                                    <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg">
                                      {question.type === 'multiple-choice' ? 'Multiple Choice' : 
                                       question.type === 'multiple-answer' ? 'Multiple Answer' :
                                       question.type === 'true-false' ? 'True/False' : 'Short Answer'}
                                    </span>
                                    {question.imageUrl && (
                                      <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg">
                                        Has Image
                                      </span>
                                    )}
                                  </div>
                                  <RichTextDisplay content={question.question} className="mb-2" />
                                  
                                  {question.imageUrl && (
                                    <div className="mb-2">
                                      <img 
                                        src={question.imageUrl} 
                                        alt="Question" 
                                        className="max-h-32 rounded-lg border border-slate-300 dark:border-slate-600"
                                      />
                                    </div>
                                  )}
                                  
                                  {(question.type === 'multiple-choice' || question.type === 'true-false' || question.type === 'multiple-answer') && question.options && (
                                    <div className="ml-4 space-y-1 mb-2">
                                      {question.options.map((opt, i) => {
                                        const isCorrect = question.type === 'multiple-answer' 
                                          ? Array.isArray(question.correctAnswer) && question.correctAnswer.includes(opt)
                                          : opt === question.correctAnswer
                                        return (
                                          <div key={i} className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-mono">
                                              {String.fromCharCode(65 + i)}.
                                            </span>
                                            <span className={`text-sm ${isCorrect ? 'text-green-600 dark:text-green-400 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                                              {opt} {isCorrect && '✓'}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                  
                                  {question.type === 'short-answer' && question.correctAnswer && (
                                    <div className="ml-4 mb-2">
                                      <span className="text-sm text-slate-500 dark:text-slate-400">Correct Answer: </span>
                                      <span className="text-sm text-green-600 dark:text-green-400 font-bold">{question.correctAnswer}</span>
                                    </div>
                                  )}

                                  {question.explanation && (
                                    <div className="ml-4 mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded text-xs text-slate-700 dark:text-slate-300">
                                      <span className="font-bold block mb-1">Explanation:</span>
                                      <RichTextDisplay content={question.explanation} />
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2 ml-4">
                                  <button
                                    onClick={() => openEditQuestion(question)}
                                    className="px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteQuestion(question.id)}
                                    className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-lg hover:bg-red-200 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {/* Render any uncategorized questions whose category ID doesn't match existing categories */}
                  {(() => {
                    const knownCatIds = new Set(categories.map(c => c.id))
                    const uncategorizedQuestions = questions.filter(q => !q.category || !knownCatIds.has(q.category))
                    if (uncategorizedQuestions.length === 0) return null

                    return (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50/30 dark:bg-slate-800/30">
                        <h3 className="font-bold text-lg mb-3 text-amber-700 dark:text-amber-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                          Uncategorized / Other ({uncategorizedQuestions.length})
                        </h3>
                        <div className="space-y-4">
                          {uncategorizedQuestions.map((question, idx) => (
                            <div
                              key={question.id}
                              className="p-5 bg-white dark:bg-slate-700/60 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Q{categories.map(c => questions.filter(q => q.category === c.id).length).reduce((a, b) => a + b, 0) + idx + 1}.</span>
                                    <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg">
                                      {question.type === 'multiple-choice' ? 'Multiple Choice' : 
                                       question.type === 'multiple-answer' ? 'Multiple Answer' :
                                       question.type === 'true-false' ? 'True/False' : 'Short Answer'}
                                    </span>
                                  </div>
                                  <RichTextDisplay content={question.question} className="mb-2" />
                                  
                                  {(question.type === 'multiple-choice' || question.type === 'true-false' || question.type === 'multiple-answer') && question.options && (
                                    <div className="ml-4 space-y-1 mb-2">
                                      {question.options.map((opt, i) => {
                                        const isCorrect = question.type === 'multiple-answer' 
                                          ? Array.isArray(question.correctAnswer) && question.correctAnswer.includes(opt)
                                          : opt === question.correctAnswer
                                        return (
                                          <div key={i} className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-mono">
                                              {String.fromCharCode(65 + i)}.
                                            </span>
                                            <span className={`text-sm ${isCorrect ? 'text-green-600 dark:text-green-400 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                                              {opt} {isCorrect && '✓'}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2 ml-4">
                                  <button
                                    onClick={() => openEditQuestion(question)}
                                    className="px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteQuestion(question.id)}
                                    className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-lg hover:bg-red-200 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </>
        )}

        {/* Analytics & Statistics Tab View */}
        {selectedLab && activeViewTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-purple-600" /> Quiz Statistics & Response Histograms
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Viewing question accuracy and distractor frequency for <strong className="text-slate-700 dark:text-slate-300">{currentSetObj?.name}</strong>.
                </p>
              </div>
              <button
                onClick={loadStatsData}
                disabled={loadingStats}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} /> Refresh Stats
              </button>
            </div>

            {loadingStats ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-slate-200 dark:border-slate-700">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Calculating question response statistics...</p>
              </div>
            ) : stats ? (
              <>
                {/* Summary Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Submissions</span>
                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{stats.totalSubmissions}</span>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Average Score</span>
                    <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{stats.averageScore}</span>
                    <span className="text-xs font-semibold text-slate-500 ml-2">({stats.averagePercentage}% accuracy)</span>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Easiest Question</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400 truncate block">
                      {stats.questions.find(q => q.questionId === stats.easiestQuestionId)?.questionText.replace(/<[^>]*>?/gm, '').slice(0, 30) || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Most Challenging</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400 truncate block">
                      {stats.questions.find(q => q.questionId === stats.hardestQuestionId)?.questionText.replace(/<[^>]*>?/gm, '').slice(0, 30) || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Per-Question Histograms & Distribution */}
                <div className="space-y-6">
                  {stats.questions.map((q, idx) => (
                    <div key={q.questionId} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center font-extrabold text-sm">
                            Q{idx + 1}
                          </span>
                          <div className="flex-1">
                            <RichTextDisplay content={q.questionText} className="font-bold text-slate-800 dark:text-slate-200" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-semibold">
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4" /> Correct: {q.totalCorrect} ({q.correctPercentage}%)
                          </span>
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <XCircle className="w-4 h-4" /> Wrong: {q.totalWrong} ({q.wrongPercentage}%)
                          </span>
                        </div>
                      </div>

                      {/* Correct vs Wrong Overall Progress Histogram Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                          <span>Response Accuracy Breakdown</span>
                          <span>{q.totalAnswered} Total Responses</span>
                        </div>
                        <div className="w-full h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
                          <div
                            style={{ width: `${q.correctPercentage}%` }}
                            className="bg-green-500 transition-all duration-500 flex items-center justify-center text-[10px] font-extrabold text-white"
                            title={`Correct: ${q.totalCorrect} (${q.correctPercentage}%)`}
                          >
                            {q.correctPercentage > 8 && `${q.correctPercentage}%`}
                          </div>
                          <div
                            style={{ width: `${q.wrongPercentage}%` }}
                            className="bg-red-500 transition-all duration-500 flex items-center justify-center text-[10px] font-extrabold text-white"
                            title={`Wrong: ${q.totalWrong} (${q.wrongPercentage}%)`}
                          >
                            {q.wrongPercentage > 8 && `${q.wrongPercentage}%`}
                          </div>
                        </div>
                      </div>

                      {/* Option-level breakdown histogram for Multiple Choice */}
                      {q.options && q.options.length > 0 && (
                        <div className="space-y-3 bg-slate-50/60 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/60">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Option Selection Distribution</span>
                          {q.options.map((opt, optIdx) => {
                            const dist = q.choiceDistribution[optIdx.toString()] || { count: 0, percentage: 0, isCorrect: false }
                            const isCorrectChoice = dist.isCorrect || (Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt) : opt === q.correctAnswer)

                            return (
                              <div key={optIdx} className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                  <span className={`flex items-center gap-1.5 ${isCorrectChoice ? 'text-green-700 dark:text-green-300 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                    <span className="font-mono font-bold text-slate-400">{String.fromCharCode(65 + optIdx)}.</span>
                                    {opt} {isCorrectChoice && <span className="text-xs text-green-600 font-bold">✓ (Correct)</span>}
                                  </span>
                                  <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">
                                    {dist.count} votes ({dist.percentage}%)
                                  </span>
                                </div>
                                <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                  <div
                                    style={{ width: `${dist.percentage}%` }}
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isCorrectChoice ? 'bg-green-500' : 'bg-purple-400'
                                    }`}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-slate-200 dark:border-slate-700">
                <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-bold">No student response statistics recorded for this lab set yet.</p>
                <p className="text-xs text-slate-500 mt-1">Student submissions will generate real-time accuracy and distractor histograms here.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create New Quiz Lab Modal */}
      {showCreateLabModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-6 h-6 text-purple-600" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Create New Quiz Lab
              </h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Quiz / Lab Number
                </label>
                <input
                  type="text"
                  value={newLabNumber}
                  onChange={(e) => setNewLabNumber(e.target.value)}
                  placeholder="e.g. 1, 2, or Quiz 1"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-slate-200 font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Quiz Title
                </label>
                <input
                  type="text"
                  value={newLabTitle}
                  onChange={(e) => setNewLabTitle(e.target.value)}
                  placeholder="e.g. Quiz 1 - Introduction to Variables"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-slate-200 font-medium"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateLabModal(false)}
                disabled={isCreatingLab}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-slate-200 font-semibold rounded-xl hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewLab}
                disabled={isCreatingLab || !newLabNumber.trim() || !newLabTitle.trim()}
                className={`px-5 py-2 ${colorTheme.secondary} text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50`}
              >
                {isCreatingLab ? 'Creating...' : 'Create Quiz Lab'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Rename Set Modal */}
      {(showAddSetModal || editingSet) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              {editingSet ? 'Rename Question Set' : 'Add New Question Set'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Set Name</label>
              <input
                type="text"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="e.g. Set 2 (Thai language)"
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-slate-200 font-medium"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAddSetModal(false); setEditingSet(null); setNewSetName(""); }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-slate-200 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={editingSet ? handleRenameSet : handleAddSet}
                className={`px-5 py-2 ${colorTheme.secondary} text-white font-bold rounded-xl`}
              >
                {editingSet ? 'Save Name' : 'Create Set'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category Name"
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-slate-200 mb-4 font-medium"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCategoryModal(false)
                  setEditingCategory(null)
                  setNewCategoryName("")
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-slate-200 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={editingCategory ? editCategory : addCategory}
                className={`px-5 py-2 ${colorTheme.secondary} text-white font-bold rounded-xl`}
              >
                {editingCategory ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              {editingQuestion ? 'Edit Question' : 'Add Question'} ({currentSetObj?.name})
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Category</label>
                <select
                  value={questionFormData.category}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-gray-700 dark:text-slate-200 font-medium"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Question Type</label>
                <select
                  value={questionFormData.type}
                  onChange={(e) => setQuestionFormData({
                    ...questionFormData,
                    type: e.target.value as any,
                    options: e.target.value === 'true-false' ? ["True", "False"] : (questionFormData.options.length >= 2 ? questionFormData.options : ["", "", "", "", ""]),
                    correctAnswer: e.target.value === 'multiple-answer' ? [] : ""
                  })}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-gray-700 dark:text-slate-200 font-medium"
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="multiple-answer">Multiple Answer (Checkboxes)</option>
                  <option value="true-false">True/False</option>
                  <option value="short-answer">Short Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Question Text</label>
                <RichTextEditor
                  value={questionFormData.question}
                  onChange={(value) => setQuestionFormData({ ...questionFormData, question: value })}
                  placeholder="Enter your question here..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                  Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={questionFormData.imageUrl}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.png"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-gray-700 dark:text-slate-200 font-mono text-sm"
                />
              </div>

              {/* Options for Multiple Choice & Multiple Answer */}
              {(questionFormData.type === 'multiple-choice' || questionFormData.type === 'multiple-answer') && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Options ({questionFormData.options.length} Choices)
                    </label>
                    <span className="text-xs text-slate-500 font-medium">
                      Select radio / checkbox for correct answer
                    </span>
                  </div>

                  <div className="space-y-2">
                    {questionFormData.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 font-bold text-slate-500 font-mono text-center">{String.fromCharCode(65 + idx)}.</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...questionFormData.options]
                            newOpts[idx] = e.target.value
                            setQuestionFormData({ ...questionFormData, options: newOpts })
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-gray-700 dark:text-slate-200"
                        />
                        {questionFormData.type === 'multiple-choice' ? (
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={questionFormData.correctAnswer === opt && opt !== ""}
                            onChange={() => setQuestionFormData({ ...questionFormData, correctAnswer: opt })}
                            className="w-5 h-5 accent-purple-600 cursor-pointer"
                            title="Select as correct answer"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={Array.isArray(questionFormData.correctAnswer) && questionFormData.correctAnswer.includes(opt) && opt !== ""}
                            onChange={(e) => {
                              const currentArr = Array.isArray(questionFormData.correctAnswer) ? questionFormData.correctAnswer : []
                              let updatedArr: string[]
                              if (e.target.checked) {
                                updatedArr = [...currentArr, opt]
                              } else {
                                updatedArr = currentArr.filter(a => a !== opt)
                              }
                              setQuestionFormData({ ...questionFormData, correctAnswer: updatedArr })
                            }}
                            className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
                            title="Check as correct answer"
                          />
                        )}

                        {/* Trash bin to delete choice */}
                        {questionFormData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = questionFormData.options.filter((_, i) => i !== idx)
                              let newCorrect = questionFormData.correctAnswer
                              if (typeof newCorrect === 'string' && newCorrect === opt) {
                                newCorrect = ''
                              } else if (Array.isArray(newCorrect)) {
                                newCorrect = newCorrect.filter(c => c !== opt)
                              }
                              setQuestionFormData({
                                ...questionFormData,
                                options: newOpts,
                                correctAnswer: newCorrect
                              })
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete choice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Choice Button */}
                  <div className="flex justify-between items-center mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (questionFormData.options.length >= 10) {
                          alert("Maximum 10 choices allowed per question.")
                          return
                        }
                        setQuestionFormData({
                          ...questionFormData,
                          options: [...questionFormData.options, ""]
                        })
                      }}
                      className="px-3.5 py-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-bold rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Choice ({String.fromCharCode(65 + questionFormData.options.length)})
                    </button>
                    <span className="text-xs text-slate-500 font-medium">
                      Supports 2 to 10 choices per question
                    </span>
                  </div>
                </div>
              )}

              {/* Options for True/False */}
              {questionFormData.type === 'true-false' && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Correct Answer</label>
                  <div className="flex gap-4">
                    {["True", "False"].map(opt => (
                      <label key={opt} className="flex items-center gap-2 font-medium cursor-pointer">
                        <input
                          type="radio"
                          name="tfAnswer"
                          checked={questionFormData.correctAnswer === opt}
                          onChange={() => setQuestionFormData({ ...questionFormData, correctAnswer: opt })}
                          className="w-5 h-5 accent-purple-600"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Short Answer */}
              {questionFormData.type === 'short-answer' && (
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Correct Answer</label>
                  <input
                    type="text"
                    value={questionFormData.correctAnswer as string}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, correctAnswer: e.target.value })}
                    placeholder="Enter correct answer"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl dark:bg-gray-700 dark:text-slate-200"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                  Explanation (Optional)
                </label>
                <RichTextEditor
                  value={questionFormData.explanation}
                  onChange={(value) => setQuestionFormData({ ...questionFormData, explanation: value })}
                  placeholder="Explain why this is the correct answer (supports rich text formatting)"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowQuestionModal(false)
                  setEditingQuestion(null)
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-slate-200 font-semibold rounded-xl hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveQuestion}
                className={`px-5 py-2 ${colorTheme.secondary} text-white font-bold rounded-xl hover:opacity-90`}
              >
                {editingQuestion ? 'Update' : 'Add'} Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GIFT Import Modal */}
      <GiftImportModal
        show={showGiftImport}
        onClose={() => setShowGiftImport(false)}
        onImport={handleGiftImport}
        categories={categories}
      />

      {/* Settings Saved Success Dialog */}
      {showSettingsSavedDialog && (
        <div className="fixed bottom-4 right-4 z-[60] animate-slide-in-right">
          <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-600 rounded-xl shadow-2xl p-4 flex items-center gap-3 min-w-[300px]">
            <div className="flex-shrink-0 w-10 h-10 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-green-800 dark:text-green-200">Settings Saved!</h4>
              <p className="text-sm text-green-700 dark:text-green-300">Quiz settings updated successfully</p>
            </div>
            <button
              onClick={() => setShowSettingsSavedDialog(false)}
              className="flex-shrink-0 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
