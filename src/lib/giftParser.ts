/**
 * GIFT Format Parser for Moodle Quiz Import
 * Parses GIFT format questions into the quiz system format
 */

export interface ParsedGiftQuestion {
  question: string
  type: 'multiple-choice' | 'short-answer' | 'true-false' | 'essay' | 'multiple-answer'
  options?: string[]
  correctAnswer: string | string[] // Single answer or array for multiple correct answers
  explanation?: string
  category?: string
  imageUrl?: string // Support for images in questions
}

/**
 * Parse GIFT format text into question objects
 */
export function parseGiftFormat(giftText: string): ParsedGiftQuestion[] {
  const questions: ParsedGiftQuestion[] = []
  
  // Remove comment lines (starting with //)
  const lines = giftText.split('\n')
  const cleanedLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('//')) {
      cleanedLines.push(line)
    }
  }
  const cleanedText = cleanedLines.join('\n')

  let currentCategory: string | undefined

  // Split content into chunks by $CATEGORY: declarations
  const chunks = cleanedText.split(/(?=\$CATEGORY:)/i)

  for (const chunk of chunks) {
    let textToParse = chunk.trim()
    if (!textToParse) continue

    // Extract category header if present at start of chunk
    const categoryMatch = textToParse.match(/^\$CATEGORY:\s*([^\n]+)/i)
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim()
      textToParse = textToParse.replace(/^\$CATEGORY:\s*[^\n]+/i, '').trim()
    }

    if (!textToParse) continue

    // Extract individual question blocks by finding { ... } pairs
    let pos = 0
    while (pos < textToParse.length) {
      const openBrace = textToParse.indexOf('{', pos)
      if (openBrace === -1) break

      const closeBrace = textToParse.indexOf('}', openBrace)
      if (closeBrace === -1) break

      // Question start is either 0 or right after the previous question's closing brace }
      const prevClose = textToParse.lastIndexOf('}', openBrace - 1)
      const qStart = prevClose === -1 ? 0 : prevClose + 1

      const questionBlock = textToParse.substring(qStart, closeBrace + 1).trim()
      if (questionBlock) {
        const parsed = parseGiftQuestion(questionBlock, currentCategory)
        if (parsed) {
          questions.push(parsed)
        }
      }

      pos = closeBrace + 1
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
    // Multiple choice or Multiple answer
    // Split by ~ or = BUT NOT if preceded by \ (escaped)
    // Using lookahead to keep the delimiter (= or ~) at the start of the next chunk
    const choices = answerPart.split(/(?<!\\)(?=[~=])/)
    const options: string[] = []
    const correctAnswers: string[] = []
    let explanation: string | undefined
    
    for (const choice of choices) {
      const trimmed = choice.trim()
      if (!trimmed) continue
      
      if (trimmed.startsWith('=')) {
        // Correct answer
        const answerText = trimmed.substring(1).trim()
        const [answer, feedback] = splitFeedback(answerText)
        const decodedAnswer = decodeGiftText(answer)
        correctAnswers.push(decodedAnswer)
        options.push(decodedAnswer)
        if (feedback && !explanation) {
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
    
    if (options.length > 0 && correctAnswers.length > 0) {
      // If multiple correct answers, it's a multiple-answer question
      const questionType = correctAnswers.length > 1 ? 'multiple-answer' : 'multiple-choice'
      return {
        question: questionText,
        type: questionType,
        options,
        correctAnswer: correctAnswers.length === 1 ? correctAnswers[0] : correctAnswers,
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
  // Match # only if not preceded by \
  const feedbackMatch = text.match(/^(.*?)(?<!\\)#(.*)$/)
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
    type: q.type === 'true-false' ? 'true-false' : q.type === 'multiple-answer' ? 'multiple-answer' : q.type,
    options: q.options,
    correctAnswer: q.correctAnswer,
    category: q.category || '', // Use parsed category or empty string
    explanation: q.explanation || '',
    imageUrl: q.imageUrl
  }))
}

/**
 * Example GIFT format questions for reference
 */
export const GIFT_FORMAT_EXAMPLE = `// Example GIFT format questions
// Comments start with //

// Multiple choice question (single answer)
What is the capital of France? {
=Paris
~London
~Berlin
~Madrid
}

// Multiple answer question (can select more than one correct answer)
Which of the following are programming languages? {
=Python
=JavaScript
=Java
~Spanish
~English
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

The earth is flat. {F}

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

// Multiple answer in programming
Which are valid JavaScript data types? {
=String
=Number
=Boolean
~Integer
~Character
}

// Code in question (use escape characters)
What does console.log("Hello") output? {
=Hello
~"Hello"
~console
~undefined
}

// True/False with explanation
JavaScript is a compiled language. {
F #JavaScript is an interpreted language
}
`
