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
 * Find the next unescaped character in a string starting at fromIndex
 */
function findUnescapedChar(str: string, char: string, fromIndex: number = 0): number {
  for (let i = fromIndex; i < str.length; i++) {
    if (str[i] === char && (i === 0 || str[i - 1] !== '\\')) {
      return i
    }
  }
  return -1
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
      // Clean up category string (remove $course$/ prefix if present)
      currentCategory = currentCategory.replace(/^\$course\$\//i, '').trim()
      textToParse = textToParse.replace(/^\$CATEGORY:\s*[^\n]+/i, '').trim()
    }

    if (!textToParse) continue

    // Extract individual question blocks by finding unescaped { ... } pairs
    let pos = 0
    while (pos < textToParse.length) {
      const openBrace = findUnescapedChar(textToParse, '{', pos)
      if (openBrace === -1) break

      const closeBrace = findUnescapedChar(textToParse, '}', openBrace + 1)
      if (closeBrace === -1) break

      // Question block spans from pos (or 0) up to closeBrace + 1
      const questionBlock = textToParse.substring(pos, closeBrace + 1).trim()
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
    category = categoryMatch[1].trim().replace(/^\$course\$\//i, '')
    text = text.replace(/^\$CATEGORY:.*$/m, '').trim()
  }
  
  // Find the LAST unescaped { and } pair which marks the answer block
  let lastOpenBrace = -1
  let lastCloseBrace = -1

  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '}' && (i === 0 || text[i - 1] !== '\\')) {
      lastCloseBrace = i
      break
    }
  }

  if (lastCloseBrace !== -1) {
    for (let i = lastCloseBrace - 1; i >= 0; i--) {
      if (text[i] === '{' && (i === 0 || text[i - 1] !== '\\')) {
        lastOpenBrace = i
        break
      }
    }
  }
  
  if (lastOpenBrace === -1 || lastCloseBrace === -1 || lastOpenBrace >= lastCloseBrace) {
    return null
  }
  
  let questionText = text.substring(0, lastOpenBrace).trim()
  const answerPart = text.substring(lastOpenBrace + 1, lastCloseBrace).trim()
  
  // Remove question name if present (::name::)
  questionText = questionText.replace(/^::.*?::\s*/, '')
  
  // Decode escaped chars in question text AFTER splitting answer block
  questionText = decodeGiftText(questionText)
  
  if (!questionText) return null

  // 1. Numerical Question ({#5} or {#5:0.1} or {#=5})
  if (answerPart.startsWith('#')) {
    const numMatch = answerPart.substring(1).trim()
    const [ans, feedback] = splitFeedback(numMatch)
    const cleanAns = ans.replace(/^=/, '').trim()
    return {
      question: questionText,
      type: 'short-answer',
      correctAnswer: decodeGiftText(cleanAns),
      explanation: feedback ? decodeGiftText(feedback) : undefined,
      category
    }
  }

  // 2. Short Answer / True-False or Multiple Choice / Multiple Answer
  if (answerPart.startsWith('=') && !answerPart.includes('~')) {
    // Short answer (can have multiple '=' correct choices, e.g. =2n =2*n)
    const choices = answerPart.split(/(?<!\\)(?==)/).map(c => c.trim()).filter(Boolean)
    const answers: string[] = []
    let explanation: string | undefined

    for (const choice of choices) {
      if (choice.startsWith('=')) {
        const answerText = choice.substring(1).trim()
        const [ans, feedback] = splitFeedback(answerText)
        answers.push(decodeGiftText(ans))
        if (feedback && !explanation) explanation = decodeGiftText(feedback)
      }
    }

    if (answers.length > 0) {
      const firstAns = answers[0].toLowerCase()
      if ((answers.length === 1) && (firstAns === 'true' || firstAns === 'false' || firstAns === 't' || firstAns === 'f')) {
        const normalizedAnswer = (firstAns === 'true' || firstAns === 't') ? 'True' : 'False'
        return {
          question: questionText,
          type: 'multiple-choice',
          options: ['True', 'False'],
          correctAnswer: normalizedAnswer,
          explanation,
          category
        }
      }

      return {
        question: questionText,
        type: 'short-answer',
        correctAnswer: answers.length === 1 ? answers[0] : answers.join(' or '),
        category
      }
    }
  } else if (answerPart.includes('~') || answerPart.startsWith('=')) {
    // Multiple Choice or Multiple Answer
    const choices = answerPart.split(/(?<!\\)(?=[~=])/)
    const options: string[] = []
    const correctAnswers: string[] = []
    let explanation: string | undefined
    
    for (const choice of choices) {
      const trimmed = choice.trim()
      if (!trimmed) continue
      
      if (trimmed.startsWith('=')) {
        const answerText = trimmed.substring(1).trim()
        const [answer, feedback] = splitFeedback(answerText)
        const decodedAnswer = decodeGiftText(answer)
        correctAnswers.push(decodedAnswer)
        options.push(decodedAnswer)
        if (feedback && !explanation) {
          explanation = decodeGiftText(feedback)
        }
      } else if (trimmed.startsWith('~')) {
        const answerText = trimmed.substring(1).trim()
        const [answer] = splitFeedback(answerText)
        if (!trimmed.match(/^~%/)) {
          options.push(decodeGiftText(answer))
        }
      }
    }
    
    if (options.length > 0 && correctAnswers.length > 0) {
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
    return {
      question: questionText,
      type: 'short-answer',
      correctAnswer: '',
      category
    }
  }

  // Single-line True/False e.g. {T} or {F}
  const cleanAnsPart = answerPart.trim().toLowerCase()
  if (cleanAnsPart === 't' || cleanAnsPart === 'true' || cleanAnsPart === 'f' || cleanAnsPart === 'false') {
    const normalizedAnswer = (cleanAnsPart === 't' || cleanAnsPart === 'true') ? 'True' : 'False'
    return {
      question: questionText,
      type: 'multiple-choice',
      options: ['True', 'False'],
      correctAnswer: normalizedAnswer,
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
