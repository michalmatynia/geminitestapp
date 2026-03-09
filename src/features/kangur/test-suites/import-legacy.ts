/**
 * Converts the existing hardcoded kangur-questions-data.js arrays into the
 * new KangurTestQuestionStore / KangurTestSuite format so they can be seeded
 * into the admin creator without a code deploy.
 */

import {
  KANGUR_ORIGINAL_2024,
  KANGUR_ORIGINAL_4PT_2024,
  KANGUR_ORIGINAL_5PT_2024,
  KANGUR_TRAINING,
} from '@/features/kangur/ui/services/kangur-questions-data';
import type {
  KangurTestQuestion,
  KangurTestQuestionStore,
  KangurTestSuite,
} from '@/shared/contracts/kangur-tests';
import { createKangurTestSuiteId } from '../test-suites';
import { createKangurTestQuestionId, KANGUR_QUESTION_SORT_ORDER_GAP } from '../test-questions';
import { auditLegacyKangurQuestion } from './question-audit';

type LegacyQuestion = {
  id: string;
  question: string;
  choices: string[];
  answer: string;
  explanation?: string;
  image?: string | null;
  choiceDescriptions?: string[];
};

const DEFAULT_LABELS = ['A', 'B', 'C', 'D', 'E'];

const convertQuestion = (
  lq: LegacyQuestion,
  suiteId: string,
  pointValue: number,
  sortOrder: number
): KangurTestQuestion => {
  const choices = lq.choices.map((text, i) => ({
    label: DEFAULT_LABELS[i] ?? String.fromCharCode(65 + i),
    text: String(text),
    description: lq.choiceDescriptions?.[i]?.trim() || undefined,
    svgContent: '',
  }));

  const answerText = String(lq.answer);
  const matchedChoice =
    choices.find((c) => c.text === answerText) ??
    choices.find((c) => c.label.toUpperCase() === answerText.toUpperCase());
  const correctChoiceLabel = matchedChoice?.label ?? choices[0]?.label ?? 'A';
  const audit = auditLegacyKangurQuestion(lq, choices, correctChoiceLabel);

  return {
    id: createKangurTestQuestionId(),
    suiteId,
    sortOrder,
    prompt: lq.question,
    choices,
    correctChoiceLabel,
    pointValue,
    explanation: lq.explanation ?? undefined,
    illustration: { type: 'none' },
    presentation: audit.presentation,
    editorial: {
      source: 'legacy-import',
      reviewStatus: audit.reviewStatus,
      workflowStatus: audit.reviewStatus === 'ready' ? 'published' : 'draft',
      auditFlags: audit.flags,
      legacyId: lq.id,
      note: audit.note,
      publishedAt: audit.reviewStatus === 'ready' ? new Date().toISOString() : undefined,
    },
  };
};

export type LegacyImportResult = {
  suites: KangurTestSuite[];
  questionStore: KangurTestQuestionStore;
  summary: {
    questionCount: number;
    needsReviewCount: number;
    needsFixCount: number;
  };
};

export const importLegacyKangurQuestions = (): LegacyImportResult => {
  const suites: KangurTestSuite[] = [];
  const questionStore: KangurTestQuestionStore = {};
  let questionCount = 0;
  let needsReviewCount = 0;
  let needsFixCount = 0;

  const addSuite = (
    title: string,
    description: string,
    year: number,
    gradeLevel: string,
    category: string,
    sortOrder: number,
    questions: LegacyQuestion[],
    pointValue: number
  ): void => {
    const suiteId = createKangurTestSuiteId();
    suites.push({
      id: suiteId,
      title,
      description,
      year,
      gradeLevel,
      category,
      enabled: true,
      sortOrder,
    });
    questions.forEach((lq, i) => {
      const q = convertQuestion(lq, suiteId, pointValue, (i + 1) * KANGUR_QUESTION_SORT_ORDER_GAP);
      questionStore[q.id] = q;
      questionCount += 1;
      if (q.editorial.reviewStatus === 'needs-fix') {
        needsFixCount += 1;
      } else if (q.editorial.reviewStatus === 'needs-review') {
        needsReviewCount += 1;
      }
    });
  };

  addSuite(
    'Kangur Matematyczny 2024 — 3 pkt (klasy III–IV)',
    'Zadania 1–8 z oryginalnego arkusza Kangura Matematycznego 2024.',
    2024,
    'III–IV',
    'matematyczny',
    1000,
    KANGUR_ORIGINAL_2024 as LegacyQuestion[],
    3
  );

  addSuite(
    'Kangur Matematyczny 2024 — 4 pkt (klasy III–IV)',
    'Zadania 9–16 (4-punktowe) z oryginalnego arkusza Kangura Matematycznego 2024.',
    2024,
    'III–IV',
    'matematyczny',
    2000,
    KANGUR_ORIGINAL_4PT_2024 as LegacyQuestion[],
    4
  );

  addSuite(
    'Kangur Matematyczny 2024 — 5 pkt (klasy III–IV)',
    'Zadania 17–24 (5-punktowe) z oryginalnego arkusza Kangura Matematycznego 2024.',
    2024,
    'III–IV',
    'matematyczny',
    3000,
    KANGUR_ORIGINAL_5PT_2024 as LegacyQuestion[],
    5
  );

  addSuite(
    'Kangur Matematyczny — Trening',
    'Zestaw treningowy w stylu Kangura Matematycznego.',
    2024,
    'III–IV',
    'training',
    4000,
    KANGUR_TRAINING as LegacyQuestion[],
    3
  );

  return {
    suites,
    questionStore,
    summary: {
      questionCount,
      needsReviewCount,
      needsFixCount,
    },
  };
};
