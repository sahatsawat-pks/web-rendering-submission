export interface QuizQuestion {
  id: string
  question: string
  type: 'multiple-choice' | 'short-answer' | 'true-false' | 'multiple-answer'
  options?: string[]
  correctAnswer: string | string[]
  category: string
  explanation?: string
  imageUrl?: string
}

export interface QuizSet {
  id: string
  name: string
  questions: QuizQuestion[]
}

export interface QuizPayload {
  sets: QuizSet[]
  activeSetId: string
}

/**
 * Parses and normalizes raw JSON string stored in lab.quizQuestions
 * Supports legacy flat question arrays and multi-set structures.
 */
export function normalizeQuizPayload(quizQuestionsJson?: string | null): {
  sets: QuizSet[]
  activeSetId: string
  questions: QuizQuestion[]
} {
  if (!quizQuestionsJson) {
    const defaultSet: QuizSet = { id: 'set_1', name: 'Set 1 (English)', questions: [] }
    return { sets: [defaultSet], activeSetId: 'set_1', questions: [] }
  }

  try {
    const parsed = JSON.parse(quizQuestionsJson)
    if (Array.isArray(parsed)) {
      // Legacy flat array -> convert to single set
      const defaultSet: QuizSet = { id: 'set_1', name: 'Set 1 (Default)', questions: parsed }
      return { sets: [defaultSet], activeSetId: 'set_1', questions: parsed }
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sets)) {
      const sets: QuizSet[] = parsed.sets.length > 0 
        ? parsed.sets 
        : [{ id: 'set_1', name: 'Set 1 (English)', questions: [] }]
      const activeSetId: string = parsed.activeSetId || sets[0].id
      const activeSet = sets.find(s => s.id === activeSetId) || sets[0]
      return {
        sets,
        activeSetId,
        questions: activeSet ? activeSet.questions : []
      }
    }
  } catch {
    // Parsing fallback
  }

  const defaultSet: QuizSet = { id: 'set_1', name: 'Set 1 (Default)', questions: [] }
  return { sets: [defaultSet], activeSetId: 'set_1', questions: [] }
}
