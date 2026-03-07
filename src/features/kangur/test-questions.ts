import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  kangurTestQuestionSchema,
  kangurTestQuestionStoreSchema,
  type KangurIllustrationPanel,
  type KangurQuestionIllustration,
  type KangurTestChoice,
  type KangurTestQuestion,
  type KangurTestQuestionStore,
} from '@/shared/contracts/kangur-tests';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export { KANGUR_TEST_QUESTIONS_SETTING_KEY };

export const KANGUR_QUESTION_SORT_ORDER_GAP = 1000;

// ─── Default choice labels ────────────────────────────────────────────────────

const DEFAULT_CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E'];

export const nextChoiceLabel = (existingLabels: string[]): string => {
  for (const label of DEFAULT_CHOICE_LABELS) {
    if (!existingLabels.includes(label)) return label;
  }
  return String.fromCharCode(65 + existingLabels.length); // F, G, H, …
};

// ─── Illustration helpers ─────────────────────────────────────────────────────

const createPanelId = (): string =>
  `panel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const createDefaultIllustration = (): KangurQuestionIllustration => ({ type: 'none' });

export const createPanelIllustration = (
  count: number,
  labels?: string[]
): KangurQuestionIllustration => {
  const resolvedLabels = labels ?? DEFAULT_CHOICE_LABELS.slice(0, count);
  const panels: KangurIllustrationPanel[] = Array.from({ length: count }, (_, i) => ({
    id: createPanelId(),
    label: resolvedLabels[i] ?? String.fromCharCode(65 + i),
    svgContent: '',
    description: '',
  }));
  return { type: 'panels', layout: 'row', panels };
};

export const hasIllustration = (q: KangurTestQuestion): boolean =>
  q.illustration.type !== 'none' &&
  (q.illustration.type === 'single'
    ? Boolean(q.illustration.svgContent?.trim())
    : q.illustration.panels.some((p) => p.svgContent.trim()));

// ─── Question ID / creation ───────────────────────────────────────────────────

export const createKangurTestQuestionId = (): string =>
  `ktq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createKangurTestQuestion = (
  suiteId: string,
  sortOrder = 0
): KangurTestQuestion =>
  kangurTestQuestionSchema.parse({
    id: createKangurTestQuestionId(),
    suiteId,
    sortOrder,
    prompt: '',
    choices: DEFAULT_CHOICE_LABELS.slice(0, 5).map((label) => ({ label, text: '' })),
    correctChoiceLabel: 'A',
    pointValue: 3,
    explanation: '',
    illustration: createDefaultIllustration(),
  });

// ─── Store operations ─────────────────────────────────────────────────────────

export const parseKangurTestQuestionStore = (raw: unknown): KangurTestQuestionStore => {
  const parsed = kangurTestQuestionStoreSchema.safeParse(
    parseJsonSetting(typeof raw === 'string' ? raw : null, {})
  );
  return parsed.success ? parsed.data : {};
};

export const getQuestionsForSuite = (
  store: KangurTestQuestionStore,
  suiteId: string
): KangurTestQuestion[] =>
  Object.values(store)
    .filter((q) => q.suiteId === suiteId)
    .sort((a, b) => {
      const delta = a.sortOrder - b.sortOrder;
      if (delta !== 0) return delta;
      return a.id.localeCompare(b.id);
    });

export const reorderQuestions = (questions: KangurTestQuestion[]): KangurTestQuestion[] =>
  questions.map((q, i) => ({ ...q, sortOrder: (i + 1) * KANGUR_QUESTION_SORT_ORDER_GAP }));

export const upsertKangurTestQuestion = (
  store: KangurTestQuestionStore,
  question: KangurTestQuestion
): KangurTestQuestionStore => ({
  ...store,
  [question.id]: question,
});

export const deleteKangurTestQuestion = (
  store: KangurTestQuestionStore,
  questionId: string
): KangurTestQuestionStore => {
  const next = { ...store };
  delete next[questionId];
  return next;
};

export const deleteKangurTestSuiteQuestions = (
  store: KangurTestQuestionStore,
  suiteId: string
): KangurTestQuestionStore => {
  const next: KangurTestQuestionStore = {};
  for (const [id, q] of Object.entries(store)) {
    if (q.suiteId !== suiteId) {
      next[id] = q;
    }
  }
  return next;
};

// ─── Question form data ───────────────────────────────────────────────────────

export type QuestionFormData = {
  prompt: string;
  choices: KangurTestChoice[];
  correctChoiceLabel: string;
  pointValue: number;
  explanation: string;
  illustration: KangurQuestionIllustration;
};

export const createInitialQuestionFormData = (suiteId: string): QuestionFormData => {
  const q = createKangurTestQuestion(suiteId);
  return {
    prompt: q.prompt,
    choices: q.choices,
    correctChoiceLabel: q.correctChoiceLabel,
    pointValue: q.pointValue,
    explanation: q.explanation ?? '',
    illustration: q.illustration,
  };
};

export const toQuestionFormData = (q: KangurTestQuestion): QuestionFormData => ({
  prompt: q.prompt,
  choices: q.choices,
  correctChoiceLabel: q.correctChoiceLabel,
  pointValue: q.pointValue,
  explanation: q.explanation ?? '',
  illustration: q.illustration,
});

export const formDataToQuestion = (
  formData: QuestionFormData,
  id: string,
  suiteId: string,
  sortOrder: number
): KangurTestQuestion =>
  kangurTestQuestionSchema.parse({
    id,
    suiteId,
    sortOrder,
    prompt: formData.prompt.trim(),
    choices: formData.choices,
    correctChoiceLabel: formData.correctChoiceLabel,
    pointValue: formData.pointValue,
    explanation: formData.explanation.trim() || undefined,
    illustration: formData.illustration,
  });
