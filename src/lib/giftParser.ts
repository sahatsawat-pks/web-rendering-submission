/**
 * GIFT Format Parser for Moodle Quiz Import
 * Parses GIFT format questions into the quiz system format
 */

export interface ParsedGiftQuestion {
  question: string
  type: 'multiple-choice' | 'short-answer' | 'true-false' | 'essay'
  options?: string[]
  correctAnswer: string
  explanation?: string
  category?: string
}

/**
 * Parse GIFT format text into question objects
 */
export function parseGiftFormat(giftText: string): ParsedGiftQuestion[] {
  const questions: ParsedGiftQuestion[] = []
  
  // Remove comments (lines starting with //)
  const lines = giftText.split('\n')
  const cleanedLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('//')) {
      cleanedLines.push(line)
    }
  }
  const cleanedText = cleanedLines.join('\n')
  
  // Split by double newline to get question blocks
  const blocks = cleanedText.split(/\n\s*\n/).filter(b => b.trim())
  
  let currentCategory: string | undefined
  
  for (const block of blocks) {
    const trimmed = block.trim()
    
    // Check if this is a category declaration
    const categoryMatch = trimmed.match(/^\$CATEGORY:\s*(.+)$/m)
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim()
      // Check if there's a question in the same block after category
      const afterCategory = trimmed.substring(categoryMatch[0].length).trim()
      if (afterCategory) {
        const parsed = parseGiftQuestion(afterCategory, currentCategory)
        if (parsed) {
          questions.push(parsed)
        }
      }
      continue
    }
    
    // Parse as question with current category
    const parsed = parseGiftQuestion(trimmed, currentCategory)
    if (parsed) {
      questions.push(parsed)
    }
  }
  
  return questions
}

function parseGiftQuestion(text: string, defaultCategory?: string): ParsedGiftQuestion | null {
  // Extract category if present in question itself
  let category: string | undefined = defaultCategory
  const categoryMatch = text.match(/^\$CATEGORY:\s*(.+)$/m)
  if (categoryMatch) {
    category = categoryMatch[1].trim()
    text = text.replace(/^\$CATEGORY:.*$/m, '').trim()
  }
  
  // Find the LAST { } pair which should be the answer block
  // This allows HTML tags with { } in the question text
  const lastOpenBrace = text.lastIndexOf('{')
  const lastCloseBrace = text.lastIndexOf('}')
  
  if (lastOpenBrace === -1 || lastCloseBrace === -1 || lastOpenBrace >= lastCloseBrace) {
    return null
  }
  
  let questionText = text.substring(0, lastOpenBrace).trim()
  const answerPart = text.substring(lastOpenBrace + 1, lastCloseBrace).trim()
  
  // Remove question name if present (::name::)
  questionText = questionText.replace(/^::.*?::\s*/, '')
  
  // Handle HTML entities and formatting
  questionText = decodeGiftText(questionText)
  
  // Determine question type and parse answers
  if (answerPart.startsWith('=') && !answerPart.includes('~')) {
    // Short answer or true/false
    const answer = answerPart.substring(1).trim()
    
    if (answer.toLowerCase() === 'true' || answer.toLowerCase() === 'false' || answer.toLowerCase() === 't' || answer.toLowerCase() === 'f') {
      // True/False question
      const normalizedAnswer = (answer.toLowerCase() === 'true' || answer.toLowerCase() === 't') ? 'True' : 'False'
      return {
        question: questionText,
        type: 'multiple-choice',
        options: ['True', 'False'],
        correctAnswer: normalizedAnswer,
        category
      }
    } else {
      // Short answer
      return {
        question: questionText,
        type: 'short-answer',
        correctAnswer: decodeGiftText(answer),
        category
      }
    }
  } else if (answerPart.includes('~') || answerPart.startsWith('=')) {
    // Multiple choice
    const choices = answerPart.split(/(?=~)|(?==)/)
    const options: string[] = []
    let correctAnswer = ''
    let explanation: string | undefined
    
    for (const choice of choices) {
      const trimmed = choice.trim()
      if (!trimmed) continue
      
      if (trimmed.startsWith('=')) {
        // Correct answer
        const answerText = trimmed.substring(1).trim()
        const [answer, feedback] = splitFeedback(answerText)
        correctAnswer = decodeGiftText(answer)
        options.push(correctAnswer)
        if (feedback) {
          explanation = decodeGiftText(feedback)
        }
      } else if (trimmed.startsWith('~')) {
        // Wrong answer
        const answerText = trimmed.substring(1).trim()
        const [answer] = splitFeedback(answerText)
        // Skip wrong answers with percentages (partial credit)
        if (!trimmed.match(/^~%/)) {
          options.push(decodeGiftText(answer))
        }
      }
    }
    
    if (options.length > 0 && correctAnswer) {
      return {
        question: questionText,
        type: 'multiple-choice',
        options,
        correctAnswer,
        explanation,
        category
      }
    }
  } else if (answerPart === '' || answerPart === 'ESSAY' || answerPart.toLowerCase() === 'essay') {
    // Essay question - convert to short answer
    return {
      question: questionText,
      type: 'short-answer',
      correctAnswer: '',
      category
    }
  }
  
  return null
}

function splitFeedback(text: string): [string, string | undefined] {
  const feedbackMatch = text.match(/^(.*?)#(.*)$/)
  if (feedbackMatch) {
    return [feedbackMatch[1].trim(), feedbackMatch[2].trim()]
  }
  return [text, undefined]
}

function decodeGiftText(text: string): string {
  return text
    .replace(/\\:/g, ':')
    .replace(/\\=/g, '=')
    .replace(/\\~/g, '~')
    .replace(/\\#/g, '#')
    .replace(/\\{/g, '{')
    .replace(/\\}/g, '}')
    .replace(/\\n/g, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

/**
 * Convert GIFT questions to quiz format
 */
export function convertGiftToQuizFormat(giftQuestions: ParsedGiftQuestion[]) {
  return giftQuestions.map((q, idx) => ({
    id: Date.now().toString() + '-' + idx,
    question: q.question,
    type: q.type === 'true-false' ? 'multiple-choice' : q.type,
    options: q.options,
    correctAnswer: q.correctAnswer,
    category: q.category || '', // Use parsed category or empty string
    explanation: q.explanation || ''
  }))
}

/**
 * Example GIFT format questions for reference
 */
export const GIFT_FORMAT_EXAMPLE = `// Example GIFT format questions
// Comments start with //

// Multiple choice question
What is the capital of France? {
=Paris
~London
~Berlin
~Madrid
}

// Multiple choice with feedback
What is 2+2? {
=4 #Correct!
~3 #Try again
~5 #Too high
}

// Short answer
What is the answer to life, the universe, and everything? {
=42
}

// True/False
The sky is blue. {T}

// Questions with categories
// Category applies to all following questions until a new category is declared

$CATEGORY: General Knowledge

Who wrote "Romeo and Juliet"? {
=Shakespeare
~Dickens
~Austen
}

Which planet is known as the Red Planet? {
=Mars
~Venus
~Jupiter
~Saturn
}

$CATEGORY: Programming

What does HTML stand for? {
=HyperText Markup Language
~High Tech Modern Language
~Home Tool Markup Language
}

// Code in question (use escape characters)
What does console.log("Hello") output? {
=Hello
~"Hello"
~console
~undefined
}
`
