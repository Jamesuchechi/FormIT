import { describe, expect, it } from "vitest";
import {
  createField,
  gradeQuizSubmission,
  parseFormSchema,
  validateSubmission,
  type FormSchema,
} from "../src/index.ts";

describe("New Field Types: Matrix, Ranking, Signature", () => {
  it("creates valid default field instances via createField", () => {
    const matrix = createField("matrix", "f_matrix");
    expect(matrix.type).toBe("matrix");
    expect(matrix.rows.length).toBeGreaterThan(0);
    expect(matrix.columns.length).toBeGreaterThan(0);

    const ranking = createField("ranking", "f_ranking");
    expect(ranking.type).toBe("ranking");
    expect(ranking.options.length).toBeGreaterThan(0);

    const signature = createField("signature", "f_sig");
    expect(signature.type).toBe("signature");
    expect(signature.penColor).toBeDefined();
  });

  it("validates form schema containing matrix, ranking, and signature", () => {
    const schema: FormSchema = {
      title: "Comprehensive Assessment",
      sections: [
        {
          id: "s1",
          title: "Section 1",
          fields: [
            createField("matrix", "f_mat"),
            createField("ranking", "f_rank"),
            createField("signature", "f_sig"),
          ],
        },
      ],
    };

    const parsed = parseFormSchema(schema);
    expect(parsed.success).toBe(true);
  });

  it("validates submissions with matrix, ranking, and signature answers", () => {
    const fMat = createField("matrix", "f_mat");
    const fRank = createField("ranking", "f_rank");
    const fSig = createField("signature", "f_sig");

    const schema: FormSchema = {
      title: "Test Form",
      sections: [
        {
          id: "s1",
          fields: [fMat, fRank, fSig],
        },
      ],
    };

    const validSubmission = {
      f_mat: {
        [fMat.rows[0]!.id]: fMat.columns[0]!.id,
        [fMat.rows[1]!.id]: fMat.columns[1]!.id,
      },
      f_rank: [fRank.options[1]!.id, fRank.options[0]!.id, fRank.options[2]!.id],
      f_sig: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };

    const res = validateSubmission(schema, validSubmission);
    expect(res.success).toBe(true);
  });
});

describe("Quiz Mode Engine", () => {
  const quizForm: FormSchema = {
    title: "Science Quiz",
    sections: [
      {
        id: "s1",
        fields: [
          {
            id: "q1",
            type: "multiple_choice",
            label: "What is the capital of France?",
            options: [
              { id: "opt_paris", label: "Paris" },
              { id: "opt_lyon", label: "Lyon" },
            ],
            required: true,
            quiz: {
              points: 5,
              correctAnswer: "opt_paris",
              feedback: {
                correct: "Correct! Paris is the capital.",
                incorrect: "Incorrect. The capital is Paris.",
              },
            },
          },
          {
            id: "q2",
            type: "checkboxes",
            label: "Which of these are prime numbers?",
            validation: {},
            options: [
              { id: "opt_2", label: "2" },
              { id: "opt_3", label: "3" },
              { id: "opt_4", label: "4" },
            ],
            required: true,
            quiz: {
              points: 10,
              correctAnswer: ["opt_2", "opt_3"],
              feedback: {
                general: "2 and 3 are prime numbers; 4 is divisible by 2.",
              },
            },
          },
          {
            id: "q3",
            type: "short_text",
            label: "What is H2O commonly known as?",
            validation: {},
            required: true,
            quiz: {
              points: 5,
              correctAnswer: "water",
            },
          },
        ],
      },
    ],
  };

  it("calculates 100% score when all answers are correct", () => {
    const answers = {
      q1: "opt_paris",
      q2: ["opt_2", "opt_3"],
      q3: "Water", // Case insensitive match
    };

    const result = gradeQuizSubmission(quizForm, answers);
    expect(result.score).toBe(20);
    expect(result.totalPoints).toBe(20);
    expect(result.percentage).toBe(100);
    expect(result.items.every((i) => i.isCorrect)).toBe(true);
    expect(result.items[0]?.feedback?.correct).toBe("Correct! Paris is the capital.");
  });

  it("calculates partial score and includes feedback when some answers are incorrect", () => {
    const answers = {
      q1: "opt_lyon", // Wrong
      q2: ["opt_2", "opt_3"], // Right (+10)
      q3: "oxygen", // Wrong
    };

    const result = gradeQuizSubmission(quizForm, answers);
    expect(result.score).toBe(10);
    expect(result.totalPoints).toBe(20);
    expect(result.percentage).toBe(50);
    expect(result.items[0]?.isCorrect).toBe(false);
    expect(result.items[0]?.feedback?.incorrect).toBe("Incorrect. The capital is Paris.");
    expect(result.items[1]?.isCorrect).toBe(true);
  });
});
