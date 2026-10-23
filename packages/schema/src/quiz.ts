import { allFields } from "./logic.ts";
import type { FormSchema } from "./types.ts";

export type QuizScoreItem = {
  fieldId: string;
  label: string;
  pointsEarned: number;
  pointsPossible: number;
  isCorrect: boolean;
  userAnswer: unknown;
  correctAnswer: unknown;
  feedback?: {
    correct?: string;
    incorrect?: string;
    general?: string;
  };
};

export type QuizResult = {
  score: number;
  totalPoints: number;
  percentage: number;
  items: QuizScoreItem[];
};

/**
 * Grade a respondent's submission against quiz questions in the form schema.
 * Calculates points earned, total possible points, percentage, and per-question score items with feedback.
 */
export function gradeQuizSubmission(form: FormSchema, answers: Record<string, unknown>): QuizResult {
  const items: QuizScoreItem[] = [];
  let score = 0;
  let totalPoints = 0;

  for (const field of allFields(form)) {
    const quiz = field.quiz;
    if (!quiz || typeof quiz.points !== "number" || quiz.points <= 0) {
      continue;
    }

    const pointsPossible = quiz.points;
    totalPoints += pointsPossible;
    const userAnswer = answers[field.id];
    const correctAnswer = quiz.correctAnswer;

    let isCorrect = false;

    if (
      userAnswer !== undefined &&
      userAnswer !== null &&
      correctAnswer !== undefined &&
      correctAnswer !== null
    ) {
      if (field.type === "multiple_choice" || field.type === "dropdown") {
        isCorrect = String(userAnswer) === String(correctAnswer);
      } else if (field.type === "checkboxes") {
        const expected = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
        const actual = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
        const setExpected = new Set(expected.map(String));
        const setActual = new Set(actual.map(String));
        isCorrect =
          setExpected.size === setActual.size && [...setExpected].every((x) => setActual.has(x));
      } else if (field.type === "short_text") {
        const acceptable = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
        const cleanUser = String(userAnswer).trim().toLowerCase();
        isCorrect = acceptable.some((ans) => String(ans).trim().toLowerCase() === cleanUser);
      } else if (field.type === "ranking") {
        if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
          isCorrect =
            userAnswer.length === correctAnswer.length &&
            userAnswer.every((val, idx) => String(val) === String(correctAnswer[idx]));
        }
      } else if (field.type === "linear_scale") {
        isCorrect = Number(userAnswer) === Number(correctAnswer);
      } else {
        isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
      }
    }

    const pointsEarned = isCorrect ? pointsPossible : 0;
    score += pointsEarned;

    items.push({
      fieldId: field.id,
      label: field.label,
      pointsEarned,
      pointsPossible,
      isCorrect,
      userAnswer,
      correctAnswer,
      feedback: quiz.feedback,
    });
  }

  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 100;

  return {
    score,
    totalPoints,
    percentage,
    items,
  };
}
