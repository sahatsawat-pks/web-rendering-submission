"use client"

import { useState } from "react"
import { Upload, X, FileText, AlertCircle, CheckCircle, FolderOpen } from "lucide-react"
import { parseGiftFormat, convertGiftToQuizFormat, GIFT_FORMAT_EXAMPLE } from "@/lib/giftParser"

interface GiftImportModalProps {
  show: boolean
  onClose: () => void
  onImport: (questions: any[], categoryId: string) => void
  categories: Array<{ id: string; name: string }>
}

export default function GiftImportModal({ show, onClose, onImport, categories }: GiftImportModalProps) {
  const [giftText, setGiftText] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [useGiftCategories, setUseGiftCategories] = useState(true)
  const [parseStatus, setParseStatus] = useState<"idle" | "success" | "error">("idle")
  const [parsedCount, setParsedCount] = useState(0)
  const [parsedCategories, setParsedCategories] = useState<Set<string>>(new Set())
  const [errorMessage, setErrorMessage] = useState("")
  const [showExample, setShowExample] = useState(false)

  if (!show) return null

  const handleParse = () => {
    try {
      const parsed = parseGiftFormat(giftText)
      if (parsed.length === 0) {
        setParseStatus("error")
        setErrorMessage("No valid questions found in GIFT format")
        return
      }
      
      // Extract unique categories from parsed questions
      const cats = new Set<string>()
      parsed.forEach(q => {
        if (q.category) cats.add(q.category)
      })
      
      setParsedCount(parsed.length)
      setParsedCategories(cats)
      setParseStatus("success")
      setErrorMessage("")
    } catch (error) {
      setParseStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse GIFT format")
    }
  }

  const handleImport = () => {
    if (!useGiftCategories && !selectedCategory) {
      setErrorMessage("Please select a category or enable 'Use GIFT Categories'")
      return
    }

    try {
      const parsed = parseGiftFormat(giftText)
      const questions = convertGiftToQuizFormat(parsed)
      
      if (useGiftCategories) {
        // Keep category names as-is, let the parent create/map categories
        // Pass all questions at once with their category names intact
        onImport(questions, 'GIFT_CATEGORIES')
      } else {
        // Use selected category for all questions
        questions.forEach(q => q.category = selectedCategory)
        onImport(questions, selectedCategory)
      }
      
      // Reset and close
      setGiftText("")
      setSelectedCategory("")
      setUseGiftCategories(true)
      setParseStatus("idle")
      setParsedCount(0)
      setParsedCategories(new Set())
      onClose()
    } catch (error) {
      setParseStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to import questions")
    }
  }

  const handleLoadExample = () => {
    setGiftText(GIFT_FORMAT_EXAMPLE)
    setShowExample(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Import GIFT Format Questions
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Import questions from Moodle GIFT format
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Example Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              GIFT Format Text
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExample(!showExample)}
                className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                <FileText className="w-3 h-3 inline mr-1" />
                {showExample ? "Hide Example" : "View Example"}
              </button>
              {showExample && (
                <button
                  onClick={handleLoadExample}
                  className="text-xs px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
                >
                  Load Example
                </button>
              )}
            </div>
          </div>

          {/* Example Display */}
          {showExample && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {GIFT_FORMAT_EXAMPLE}
              </pre>
            </div>
          )}

          {/* Text Area */}
          <textarea
            value={giftText}
            onChange={(e) => {
              setGiftText(e.target.value)
              setParseStatus("idle")
            }}
            placeholder="Paste your GIFT format questions here..."
            rows={12}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
          />

          {/* Category Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useGiftCategories"
                checked={useGiftCategories}
                onChange={(e) => setUseGiftCategories(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <label htmlFor="useGiftCategories" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Use categories from GIFT file
              </label>
            </div>
            
            {parsedCategories.size > 0 && (
              <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <FolderOpen className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300 block mb-1">
                    Categories found in GIFT file:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(parsedCategories).map(cat => (
                      <span key={cat} className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {!useGiftCategories && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Or select a category for all questions
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Parse Status */}
          {parseStatus === "success" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Successfully parsed {parsedCount} question{parsedCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {parseStatus === "error" && errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">
                {errorMessage}
              </span>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
              <strong>Supported formats:</strong> Multiple choice, Short answer, True/False.
              Code blocks and categories are fully supported.
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Categories:</strong> Use <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">$CATEGORY: Category Name</code> to organize questions.
              All questions following a category declaration will be assigned to that category until a new category is declared.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleParse}
            disabled={!giftText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Parse & Preview
          </button>
          <button
            onClick={handleImport}
            disabled={parseStatus !== "success" || (!useGiftCategories && !selectedCategory)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Import {parsedCount > 0 && `(${parsedCount})`}
          </button>
        </div>
      </div>
    </div>
  )
}
