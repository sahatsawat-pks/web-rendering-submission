import { QuizQuestion, normalizeQuizPayload } from './quizSetAdapter';
import { getQuizScores, getLabByNumber } from './db';

export interface QuestionStat {
  questionId: string;
  questionText: string;
  type: string;
  category: string;
  options?: string[];
  correctAnswer: string | string[];
  totalAnswered: number;
  totalCorrect: number;
  totalWrong: number;
  correctPercentage: number;
  wrongPercentage: number;
  choiceDistribution: { [choiceKey: string]: { count: number; percentage: number; isCorrect: boolean } };
}

export interface QuizLabStats {
  labNumber: string;
  labTitle: string;
  totalSubmissions: number;
  averageScore: number;
  averagePercentage: number;
  easiestQuestionId?: string;
  hardestQuestionId?: string;
  questions: QuestionStat[];
}

export async function calculateQuizLabStats(
  subject: string,
  labNumber: string,
  setId?: string
): Promise<QuizLabStats> {
  const lab = await getLabByNumber(labNumber, subject);
  const scores = await getQuizScores(subject, labNumber);

  if (!lab) {
    return {
      labNumber,
      labTitle: '',
      totalSubmissions: 0,
      averageScore: 0,
      averagePercentage: 0,
      questions: []
    };
  }

  const { sets, activeSetId } = normalizeQuizPayload(lab.quizQuestions);
  const targetSetId = setId || activeSetId;
  const targetSet = sets.find(s => s.id === targetSetId) || sets[0];
  const questions: QuizQuestion[] = targetSet ? targetSet.questions : [];

  const totalSubmissions = scores.length;
  let totalScoreSum = 0;
  let totalMaxScoreSum = 0;

  scores.forEach(s => {
    totalScoreSum += s.correctAnswers || s.score || 0;
    totalMaxScoreSum += s.totalQuestions || questions.length || 1;
  });

  const averageScore = totalSubmissions > 0 ? parseFloat((totalScoreSum / totalSubmissions).toFixed(1)) : 0;
  const averagePercentage = totalMaxScoreSum > 0 ? Math.round((totalScoreSum / totalMaxScoreSum) * 100) : 0;

  const questionStats: QuestionStat[] = questions.map(q => {
    let correctCount = 0;
    let wrongCount = 0;
    const choiceCounts: { [key: string]: number } = {};

    // Initialize counts for options
    if (q.options) {
      q.options.forEach((_, idx) => {
        choiceCounts[idx.toString()] = 0;
      });
    }

    scores.forEach(scoreRecord => {
      let rawAnswers = scoreRecord.answers;
      if (typeof rawAnswers === 'string') {
        try { rawAnswers = JSON.parse(rawAnswers); } catch { rawAnswers = {}; }
      }
      if (!rawAnswers || typeof rawAnswers !== 'object') return;

      // Extract answer for this question by ID or index
      const userAns = rawAnswers[q.id] !== undefined ? rawAnswers[q.id] : rawAnswers[questions.indexOf(q)];

      if (userAns === undefined || userAns === null) return;

      let isCorrect = false;
      let choiceVal = '';

      if (typeof userAns === 'object' && userAns !== null) {
        isCorrect = Boolean(userAns.isCorrect);
        choiceVal = userAns.choice !== undefined ? String(userAns.choice) : '';
      } else {
        choiceVal = String(userAns);
        if (Array.isArray(q.correctAnswer)) {
          isCorrect = Array.isArray(userAns)
            ? userAns.length === q.correctAnswer.length && userAns.every((v: any) => q.correctAnswer.includes(String(v)))
            : q.correctAnswer.includes(choiceVal);
        } else {
          isCorrect = String(q.correctAnswer).trim().toLowerCase() === choiceVal.trim().toLowerCase();
        }
      }

      if (isCorrect) correctCount++;
      else wrongCount++;

      if (choiceVal !== '') {
        choiceCounts[choiceVal] = (choiceCounts[choiceVal] || 0) + 1;
      }
    });

    const totalAnswered = correctCount + wrongCount;
    const correctPercentage = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const wrongPercentage = totalAnswered > 0 ? 100 - correctPercentage : 0;

    const choiceDistribution: { [key: string]: { count: number; percentage: number; isCorrect: boolean } } = {};
    Object.keys(choiceCounts).forEach(key => {
      const cnt = choiceCounts[key];
      const pct = totalAnswered > 0 ? Math.round((cnt / totalAnswered) * 100) : 0;
      let choiceIsCorrect = false;

      if (Array.isArray(q.correctAnswer)) {
        choiceIsCorrect = q.correctAnswer.map(String).includes(key);
      } else {
        choiceIsCorrect = String(q.correctAnswer) === key || Boolean(q.options && q.options[parseInt(key)] === q.correctAnswer);
      }

      choiceDistribution[key] = {
        count: cnt,
        percentage: pct,
        isCorrect: choiceIsCorrect
      };
    });

    return {
      questionId: q.id,
      questionText: q.question,
      type: q.type,
      category: q.category,
      options: q.options,
      correctAnswer: q.correctAnswer,
      totalAnswered,
      totalCorrect: correctCount,
      totalWrong: wrongCount,
      correctPercentage,
      wrongPercentage,
      choiceDistribution
    };
  });

  // Find easiest and hardest
  let easiestId: string | undefined;
  let hardestId: string | undefined;
  if (questionStats.length > 0) {
    const sorted = [...questionStats].sort((a, b) => b.correctPercentage - a.correctPercentage);
    easiestId = sorted[0]?.questionId;
    hardestId = sorted[sorted.length - 1]?.questionId;
  }

  return {
    labNumber,
    labTitle: lab.title,
    totalSubmissions,
    averageScore,
    averagePercentage,
    easiestQuestionId: easiestId,
    hardestQuestionId: hardestId,
    questions: questionStats
  };
}
