"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import LogoutButton from "@/components/LogoutButton"
import { ModeToggle } from "@/components/mode-toggle"

interface QuizQuestion {
  id: string
  question: string
  type: 'multiple-choice' | 'short-answer'
  options?: string[] // For multiple choice
  correctAnswer: string
  category: string
  explanation?: string
}

interface QuizCategory {
  id: string
  name: string
}

export default function ITCS227QuizManagementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'LA' | 'Lecturer'>('LA')
  
  const [labs, setLabs] = useState<any[]>([])
  const [selectedLab, setSelectedLab] = useState("")
  const [categories, setCategories] = useState<QuizCategory[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [quizEnabled, setQuizEnabled] = useState(false)
  const [timeLimit, setTimeLimit] = useState(0)
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false)
  
  // Category management
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategory, setEditingCategory] = useState<QuizCategory | null>(null)
  
  // Question management
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null)
  const [questionFormData, setQuestionFormData] = useState({
    question: "",
    type: "multiple-choice" as 'multiple-choice' | 'short-answer',
    options: ["", "", "", ""],
    correctAnswer: "",
    category: "",
    explanation: ""
  })
  
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  useEffect(() => {
    // Check auth and permissions
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.role) setRole(data.role)
        if (data.username) setUsername(data.username)
        
        if (data.username === 'kanzaki_aito' || data.role === 'Lecturer' || (data.permissions && data.permissions.itcs227)) {
          setHasAccess(true)
        } else {
          router.push('/admin/dashboard')
        }
      })
      .catch(() => router.push('/admin/login'))
      .finally(() => setLoading(false))

    // Fetch labs
    fetch("/api/labs?activeOnly=false&subject=ITCS227")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLabs(data.labs.sort((a: any, b: any) => a.labNumber.localeCompare(b.labNumber)))
        }
      })
  }, [router])

  useEffect(() => {
    if (selectedLab) {
      loadQuizData()
    }
  }, [selectedLab])

  const loadQuizData = async () => {
    try {
      const res = await fetch(`/api/quiz?labNumber=${selectedLab}&subject=ITCS227`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
        setQuestions(data.questions || [])
        setQuizEnabled(data.quizEnabled || false)
        setTimeLimit(data.quizTimeLimit || 0)
        setTimeLimitEnabled(data.quizTimeLimitEnabled || false)
      }
    } catch (e) {
      console.error("Failed to load quiz data", e)
    }
  }

  const saveQuizData = async () => {
    if (!selectedLab) return
    
    setSaveStatus("Saving...")
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_questions',
          labNumber: selectedLab,
          subject: 'ITCS227',
          categories,
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
          subject: 'ITCS227',
          quizEnabled,
          quizTimeLimit: timeLimit,
          quizTimeLimitEnabled: timeLimitEnabled
        })
      })
      
      if (res.ok) {
        alert("Settings saved successfully!")
      } else {
        alert("Failed to save settings")
      }
    } catch (e) {
      console.error("Failed to save settings", e)
      alert("Error saving settings")
    }
  }

  const addCategory = () => {
    if (!newCategoryName.trim()) return
    
    const newCategory: QuizCategory = {
      id: Date.now().toString(),
      name: newCategoryName.trim()
    }
    
    setCategories([...categories, newCategory])
    setNewCategoryName("")
    setShowCategoryModal(false)
  }

  const updateCategory = () => {
    if (!editingCategory || !newCategoryName.trim()) return
    
    setCategories(categories.map(cat => 
      cat.id === editingCategory.id 
        ? { ...cat, name: newCategoryName.trim() }
        : cat
    ))
    setNewCategoryName("")
    setEditingCategory(null)
    setShowCategoryModal(false)
  }

  const deleteCategory = (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category? All questions in this category will also be removed.")) return
    
    setCategories(categories.filter(cat => cat.id !== categoryId))
    setQuestions(questions.filter(q => q.category !== categoryId))
  }

  const openEditCategory = (category: QuizCategory) => {
    setEditingCategory(category)
    setNewCategoryName(category.name)
    setShowCategoryModal(true)
  }

  const openAddQuestion = () => {
    setEditingQuestion(null)
    setQuestionFormData({
      question: "",
      type: "multiple-choice",
      options: ["", "", "", ""],
      correctAnswer: "",
      category: categories.length > 0 ? categories[0].id : "",
      explanation: ""
    })
    setShowQuestionModal(true)
  }

  const openEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question)
    setQuestionFormData({
      question: question.question,
      type: question.type,
      options: question.options || ["", "", "", ""],
      correctAnswer: question.correctAnswer,
      category: question.category,
      explanation: question.explanation || ""
    })
    setShowQuestionModal(true)
  }

  const saveQuestion = () => {
    if (!questionFormData.question.trim() || !questionFormData.correctAnswer.trim()) {
      alert("Please fill in required fields")
      return
    }

    if (questionFormData.type === 'multiple-choice') {
      const filledOptions = questionFormData.options.filter(opt => opt.trim())
      if (filledOptions.length < 2) {
        alert("Multiple choice questions need at least 2 options")
        return
      }
      if (!filledOptions.includes(questionFormData.correctAnswer)) {
        alert("Correct answer must be one of the options")
        return
      }
    }

    const questionData: QuizQuestion = {
      id: editingQuestion?.id || Date.now().toString(),
      question: questionFormData.question.trim(),
      type: questionFormData.type,
      options: questionFormData.type === 'multiple-choice' 
        ? questionFormData.options.filter(opt => opt.trim())
        : undefined,
      correctAnswer: questionFormData.correctAnswer.trim(),
      category: questionFormData.category,
      explanation: questionFormData.explanation.trim()
    }

    if (editingQuestion) {
      setQuestions(questions.map(q => q.id === editingQuestion.id ? questionData : q))
    } else {
      setQuestions([...questions, questionData])
    }

    setShowQuestionModal(false)
  }

  const deleteQuestion = (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return
    setQuestions(questions.filter(q => q.id !== questionId))
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!hasAccess) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-purple-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/itcs227')}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
            >
              ← Back to ITCS227
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              Quiz Management - ITCS227
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Lab Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Select Lab
          </label>
          <select
            value={selectedLab}
            onChange={(e) => setSelectedLab(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">-- Select a Lab --</option>
            {labs.map(lab => (
              <option key={lab.labNumber} value={lab.labNumber}>
                {lab.labNumber} - {lab.title}
              </option>
            ))}
          </select>
        </div>

        {selectedLab && (
          <>
            {/* Quiz Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Quiz Settings</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={quizEnabled}
                    onChange={(e) => setQuizEnabled(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Enable Quiz for this Lab</span>
                </label>

                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={timeLimitEnabled}
                      onChange={(e) => setTimeLimitEnabled(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Enable Time Limit</span>
                  </label>
                  
                  {timeLimitEnabled && (
                    <div className="ml-7">
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Time Limit (minutes)
                      </label>
                      <input
                        type="number"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                        min="0"
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={saveSettings}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>

            {/* Categories Management */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Categories</h2>
                <button
                  onClick={() => {
                    setEditingCategory(null)
                    setNewCategoryName("")
                    setShowCategoryModal(true)
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  + Add Category
                </button>
              </div>

              {categories.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No categories yet. Add one to start creating questions.
                </p>
              ) : (
                <div className="grid gap-3">
                  {categories.map(category => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-gray-800 dark:text-white">{category.name}</span>
                        <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                          ({questions.filter(q => q.category === category.id).length} questions)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditCategory(category)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Questions</h2>
                <div className="flex gap-2 items-center">
                  {saveStatus && (
                    <span className="text-sm text-green-600 dark:text-green-400">{saveStatus}</span>
                  )}
                  <button
                    onClick={saveQuizData}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    💾 Save All Questions
                  </button>
                  <button
                    onClick={openAddQuestion}
                    disabled={categories.length === 0}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    + Add Question
                  </button>
                </div>
              </div>

              {categories.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Please add at least one category before creating questions.
                </p>
              ) : questions.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No questions yet. Click "Add Question" to create one.
                </p>
              ) : (
                <div className="space-y-4">
                  {categories.map(category => {
                    const categoryQuestions = questions.filter(q => q.category === category.id)
                    if (categoryQuestions.length === 0) return null

                    return (
                      <div key={category.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-white">{category.name}</h3>
                        <div className="space-y-3">
                          {categoryQuestions.map((question, idx) => (
                            <div
                              key={question.id}
                              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Q{idx + 1}.</span>
                                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                                      {question.type === 'multiple-choice' ? 'Multiple Choice' : 'Short Answer'}
                                    </span>
                                  </div>
                                  <p className="text-gray-800 dark:text-white mb-2">{question.question}</p>
                                  
                                  {question.type === 'multiple-choice' && question.options && (
                                    <div className="ml-4 space-y-1 mb-2">
                                      {question.options.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                          <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {String.fromCharCode(65 + i)}.
                                          </span>
                                          <span className={`text-sm ${opt === question.correctAnswer ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {opt} {opt === question.correctAnswer && '✓'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {question.type === 'short-answer' && (
                                    <div className="ml-4 mb-2">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Correct Answer: </span>
                                      <span className="text-sm text-green-600 dark:text-green-400 font-semibold">{question.correctAnswer}</span>
                                    </div>
                                  )}
                                  
                                  {question.explanation && (
                                    <div className="ml-4 text-sm text-gray-500 dark:text-gray-400 italic">
                                      Explanation: {question.explanation}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-2 ml-4">
                                  <button
                                    onClick={() => openEditQuestion(question)}
                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteQuestion(question.id)}
                                    className="px-3 py-1 text-sm bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
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
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white mb-4"
              onKeyPress={(e) => e.key === 'Enter' && (editingCategory ? updateCategory() : addCategory())}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCategoryModal(false)
                  setNewCategoryName("")
                  setEditingCategory(null)
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={editingCategory ? updateCategory : addCategory}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {editingCategory ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl my-8">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              {editingQuestion ? 'Edit Question' : 'Add Question'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category</label>
                <select
                  value={questionFormData.category}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Question Type</label>
                <select
                  value={questionFormData.type}
                  onChange={(e) => setQuestionFormData({ 
                    ...questionFormData, 
                    type: e.target.value as 'multiple-choice' | 'short-answer',
                    options: e.target.value === 'multiple-choice' ? ["", "", "", ""] : []
                  })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="short-answer">Short Answer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Question</label>
                <textarea
                  value={questionFormData.question}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, question: e.target.value })}
                  placeholder="Enter your question here"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {questionFormData.type === 'multiple-choice' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Options</label>
                  {questionFormData.options.map((option, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...questionFormData.options]
                        newOptions[idx] = e.target.value
                        setQuestionFormData({ ...questionFormData, options: newOptions })
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white mb-2"
                    />
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Correct Answer</label>
                {questionFormData.type === 'multiple-choice' ? (
                  <select
                    value={questionFormData.correctAnswer}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, correctAnswer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">-- Select Correct Answer --</option>
                    {questionFormData.options.filter(opt => opt.trim()).map((opt, idx) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={questionFormData.correctAnswer}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, correctAnswer: e.target.value })}
                    placeholder="Enter the correct answer"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Explanation (optional)</label>
                <textarea
                  value={questionFormData.explanation}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
                  placeholder="Explain why this is the correct answer"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowQuestionModal(false)
                  setEditingQuestion(null)
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={saveQuestion}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {editingQuestion ? 'Update' : 'Add'} Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
