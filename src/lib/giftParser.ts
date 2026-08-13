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
 * GIFT Format Parser for Moodle Quiz Import
 * Handles math equations, LaTeX delimiters \(...\), set notation {x|...},
 * numerical questions, short answers, and multiple choice without truncation.
 */

export interface ParsedGiftQuestion {
  question: string
  type: 'multiple-choice' | 'short-answer' | 'true-false' | 'essay' | 'multiple-answer'
  options?: string[]
  correctAnswer: string | string[]
  explanation?: string
  category?: string
  imageUrl?: string
}

export function parseGiftFormat(giftText: string): ParsedGiftQuestion[] {
  const questions: ParsedGiftQuestion[] = []
  let currentCategory: string | undefined

  // Split into raw lines, filtering out pure comment lines
  const lines = giftText.split(/\r?\n/)
  const cleanedLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('//')) {
      cleanedLines.push(line)
    }
  }
  const cleanedText = cleanedLines.join('\n')

  // Split content into blocks by double newlines or category headers
  const rawParagraphs = cleanedText.split(/\n\s*\n+/)

  for (const rawParagraph of rawParagraphs) {
    let para = rawParagraph.trim()
    if (!para) continue

    // Extract category if paragraph contains $CATEGORY:
    const categoryMatch = para.match(/\$CATEGORY:\s*([^\n]+)/i)
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim().replace(/^\$course\$\//i, '')
      para = para.replace(/\$CATEGORY:\s*[^\n]+/gi, '').trim()
      if (!para) continue
    }

    const parsed = parseGiftQuestionBlock(para, currentCategory)
    if (parsed) {
      if (Array.isArray(parsed)) {
        questions.push(...parsed)
      } else {
        questions.push(parsed)
      }
    }
  }

  return questions
}

function parseGiftQuestionBlock(text: string, defaultCategory?: string): ParsedGiftQuestion | ParsedGiftQuestion[] | null {
  if (text.includes('$CATEGORY:')) {
    const results: ParsedGiftQuestion[] = []
    const chunks = text.split(/(?=\$CATEGORY:)/i)
    let cat = defaultCategory
    for (const chunk of chunks) {
      let t = chunk.trim()
      if (!t) continue
      const catMatch = t.match(/^\$CATEGORY:\s*([^\n]+)/i)
      if (catMatch) {
        cat = catMatch[1].trim().replace(/^\$course\$\//i, '')
        t = t.replace(/^\$CATEGORY:\s*[^\n]+/i, '').trim()
      }
      if (!t) continue
      const q = parseSingleQuestion(t, cat)
      if (q) results.push(q)
    }
    return results.length > 0 ? results : null
  }

  return parseSingleQuestion(text, defaultCategory)
}

function parseSingleQuestion(text: string, category?: string): ParsedGiftQuestion | null {
  text = text.trim()
  if (!text) return null

  // Extract category if present at start
  const categoryMatch = text.match(/^\$CATEGORY:\s*(.+)$/m)
  if (categoryMatch) {
    category = categoryMatch[1].trim().replace(/^\$course\$\//i, '')
    text = text.replace(/^\$CATEGORY:.*$/m, '').trim()
  }

  // Find true GIFT answer block { ... }
  const answerBlockMatch = findAnswerBlock(text)
  if (!answerBlockMatch) return null

  let questionText = text.substring(0, answerBlockMatch.startIndex).trim()
  const answerPart = answerBlockMatch.content.trim()
  const textAfter = text.substring(answerBlockMatch.endIndex).trim()

  if (textAfter) {
    questionText = questionText ? `${questionText} _____ ${textAfter}` : textAfter
  }

  questionText = questionText.replace(/^::.*?::\s*/, '')
  questionText = decodeGiftText(questionText)

  if (!questionText) return null

  // 1. Numerical Question ({#5} or {#-53} or {#5:0.1})
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

  // 2. Single-line True/False e.g. {T} or {F} or {TRUE} or {FALSE}
  const cleanAnsPart = answerPart.trim().toLowerCase()
  if (['t', 'true', 'f', 'false'].includes(cleanAnsPart)) {
    const isTrue = cleanAnsPart === 't' || cleanAnsPart === 'true'
    return {
      question: questionText,
      type: 'multiple-choice',
      options: ['True', 'False'],
      correctAnswer: isTrue ? 'True' : 'False',
      category
    }
  }

  // 3. Short Answer / Multiple Choice / Multiple Answer
  const choices = parseAnswerChoices(answerPart)

  if (choices.length > 0) {
    const correctChoices = choices.filter(c => c.isCorrect)
    const wrongChoices = choices.filter(c => !c.isCorrect)

    if (wrongChoices.length === 0 && correctChoices.length > 0) {
      const answers = correctChoices.map(c => c.text)
      const firstAns = answers[0].toLowerCase()

      if (answers.length === 1 && ['true', 'false', 't', 'f'].includes(firstAns)) {
        const isTrue = firstAns === 'true' || firstAns === 't'
        return {
          question: questionText,
          type: 'multiple-choice',
          options: ['True', 'False'],
          correctAnswer: isTrue ? 'True' : 'False',
          explanation: correctChoices[0].feedback,
          category
        }
      }

      return {
        question: questionText,
        type: 'short-answer',
        correctAnswer: answers.length === 1 ? answers[0] : answers.join(' or '),
        explanation: correctChoices[0]?.feedback,
        category
      }
    }

    const options = choices.map(c => c.text)
    const correctAnswers = correctChoices.map(c => c.text)
    const explanation = choices.find(c => c.feedback)?.feedback

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
  }

  // 4. Essay
  if (answerPart === '' || answerPart.toUpperCase() === 'ESSAY') {
    return {
      question: questionText,
      type: 'short-answer',
      correctAnswer: '',
      category
    }
  }

  return null
}

/**
 * Find the true GIFT answer block `{ ... }` in a question string.
 */
function findAnswerBlock(text: string): { content: string; startIndex: number; endIndex: number } | null {
  let pos = 0
  while (pos < text.length) {
    const openIndex = text.indexOf('{', pos)
    if (openIndex === -1) break

    if (openIndex > 0 && text[openIndex - 1] === '\\') {
      pos = openIndex + 1
      continue
    }

    const closeIndex = text.indexOf('}', openIndex + 1)
    if (closeIndex === -1) break

    const content = text.substring(openIndex + 1, closeIndex).trim()

    const isAnswerBlock = 
      content === '' ||
      /^[=~#]/m.test(content) ||
      /^(T|F|TRUE|FALSE|ESSAY)$/i.test(content) ||
      content.startsWith('//')

    if (isAnswerBlock) {
      return {
        content,
        startIndex: openIndex,
        endIndex: closeIndex + 1
      }
    }

    pos = closeIndex + 1
  }

  return null
}

interface ParsedChoice {
  isCorrect: boolean
  text: string
  feedback?: string
}

/**
 * Safely parse choices inside a GIFT answer block `{ ... }`.
 * Splits choices by line breaks starting with = or ~ so equations like b_n = b_(n-1) are preserved.
 */
function parseAnswerChoices(answerPart: string): ParsedChoice[] {
  const results: ParsedChoice[] = []
  const lines = answerPart.split(/\r?\n/)
  let currentChoice: { isCorrect: boolean; rawText: string } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('=') || trimmed.startsWith('~')) {
      if (currentChoice) {
        const choiceObj = processChoiceRaw(currentChoice.isCorrect, currentChoice.rawText)
        if (choiceObj) results.push(choiceObj)
      }

      currentChoice = {
        isCorrect: trimmed.startsWith('='),
        rawText: trimmed.substring(1).trim()
      }
    } else if (currentChoice) {
      currentChoice.rawText += ' ' + trimmed
    } else {
      const inlineTokens = answerPart.split(/(?<!\\)(?=[~=])/)
      for (const token of inlineTokens) {
        const t = token.trim()
        if (!t) continue
        if (t.startsWith('=')) {
          const choiceObj = processChoiceRaw(true, t.substring(1).trim())
          if (choiceObj) results.push(choiceObj)
        } else if (t.startsWith('~')) {
          const choiceObj = processChoiceRaw(false, t.substring(1).trim())
          if (choiceObj) results.push(choiceObj)
        }
      }
      return results
    }
  }

  if (currentChoice) {
    const choiceObj = processChoiceRaw(currentChoice.isCorrect, currentChoice.rawText)
    if (choiceObj) results.push(choiceObj)
  }

  return results
}

function processChoiceRaw(isCorrect: boolean, rawText: string): ParsedChoice | null {
  if (!rawText && !isCorrect) return null
  if (rawText.match(/^%\d+%/)) return null

  const [ansText, feedback] = splitFeedback(rawText)
  const decodedText = decodeGiftText(ansText)
  if (!decodedText) return null

  return {
    isCorrect,
    text: decodedText,
    feedback: feedback ? decodeGiftText(feedback) : undefined
  }
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
