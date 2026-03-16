import type { KangurLessonDocument, KangurLessonRootBlock } from '@/features/kangur/shared/contracts/kangur';
import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  type KangurTestQuestionEditorial,
  type KangurTestQuestionPresentation,
  kangurTestQuestionSchema,
  kangurTestQuestionStoreSchema,
  type KangurTestQuestionReviewStatus,
  type KangurIllustrationPanel,
  type KangurTestChoice,
  type KangurQuestionIllustration,
  type KangurTestQuestion,
  type KangurTestQuestionStore,
} from '@/features/kangur/shared/contracts/kangur-tests';
import { sanitizeSvg } from '@/features/kangur/shared/utils';
import { parseJsonSetting } from '@/features/kangur/utils/settings-json';

import {
  canonicalizeKangurLessonDocument,
  createKangurLessonPage,
  createKangurLessonTextBlock,
  createLessonDocument,
  resolveKangurLessonDocumentPages,
  escapeHtmlText,
  stripHtmlToText,
} from './lesson-documents';

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

const createPanelId = (): string => `panel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const createDefaultIllustration = (): KangurQuestionIllustration => ({ type: 'none' });

const sanitizeOptionalSvgMarkup = (markup: string): string =>
  markup.trim().length > 0 ? sanitizeSvg(markup) : '';

const sanitizeQuestionChoice = (choice: KangurTestChoice): KangurTestChoice => ({
  ...choice,
  label: choice.label.trim().slice(0, 16),
  text: choice.text.trim().slice(0, 2_000),
  description: choice.description?.trim() ? choice.description.trim().slice(0, 1_000) : undefined,
  svgContent: sanitizeOptionalSvgMarkup(choice.svgContent ?? ''),
});

const buildQuestionTextDocument = (value: string): KangurLessonDocument | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const block = createKangurLessonTextBlock();
  return createLessonDocument([
    createKangurLessonPage('', [
      {
        ...block,
        html: `<p>${escapeHtmlText(trimmed)}</p>`,
        ttsText: trimmed,
      },
    ]),
  ]);
};

const canonicalizeQuestionDocument = (
  document: KangurLessonDocument | undefined,
  fallbackText: string
): KangurLessonDocument | undefined =>
  document ? canonicalizeKangurLessonDocument(document) : buildQuestionTextDocument(fallbackText);

const extractPlainTextFromQuestionDocument = (document: KangurLessonDocument | undefined): string => {
  if (!document) {
    return '';
  }

  return resolveKangurLessonDocumentPages(document)
    .flatMap((page) => page.blocks)
    .map((block: KangurLessonRootBlock) => {
      if (block.type === 'text') {
        return stripHtmlToText(block.html);
      }

      if (block.type === 'callout') {
        return [block.title, stripHtmlToText(block.html)].filter(Boolean).join(' ');
      }

      if (block.type === 'quiz') {
        return [
          stripHtmlToText(block.question),
          ...block.choices.map((choice) => choice.text),
          block.explanation ? stripHtmlToText(block.explanation) : '',
        ]
          .filter(Boolean)
          .join(' ');
      }

      if (block.type === 'svg' || block.type === 'image' || block.type === 'activity') {
        return [
          block.title,
          'ttsDescription' in block ? (block.ttsDescription ?? '') : '',
          'caption' in block ? (block.caption ?? '') : '',
          'description' in block ? (block.description ?? '') : '',
        ]
          .filter(Boolean)
          .join(' ');
      }

      return block.items
        .map((item) => {
          if (item.block.type === 'text') {
            return stripHtmlToText(item.block.html);
          }

          return [
            item.block.title,
            'caption' in item.block ? (item.block.caption ?? '') : '',
            'ttsDescription' in item.block ? (item.block.ttsDescription ?? '') : '',
          ]
            .filter(Boolean)
            .join(' ');
        })
        .filter(Boolean)
        .join(' ');
    })
    .filter(Boolean)
    .join(' ');
};

export const sanitizeQuestionIllustration = (
  illustration: KangurQuestionIllustration
): KangurQuestionIllustration => {
  if (illustration.type === 'none') {
    return illustration;
  }

  if (illustration.type === 'single') {
    return {
      ...illustration,
      svgContent: sanitizeOptionalSvgMarkup(illustration.svgContent),
    };
  }

  return {
    ...illustration,
    panels: illustration.panels.map((panel) => ({
      ...panel,
      svgContent: sanitizeOptionalSvgMarkup(panel.svgContent),
    })),
  };
};

const sanitizeQuestion = (question: KangurTestQuestion): KangurTestQuestion => ({
  ...question,
  choices: question.choices.map(sanitizeQuestionChoice),
  illustration: sanitizeQuestionIllustration(question.illustration),
  stemDocument: canonicalizeQuestionDocument(question.stemDocument, question.prompt),
  explanationDocument: canonicalizeQuestionDocument(
    question.explanationDocument,
    question.explanation ?? ''
  ),
  hintDocument: question.hintDocument
    ? canonicalizeKangurLessonDocument(question.hintDocument)
    : undefined,
});

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

export const hasRichChoiceContent = (q: KangurTestQuestion): boolean =>
  q.choices.some(
    (choice) =>
      Boolean(choice.description?.trim().length) || Boolean(choice.svgContent?.trim().length)
  );

export const usesRichQuestionPresentation = (q: KangurTestQuestion): boolean =>
  q.presentation.layout !== 'classic' || q.presentation.choiceStyle !== 'list';

export const getQuestionReviewStatus = (
  q: Pick<KangurTestQuestion, 'editorial'>
): KangurTestQuestionReviewStatus => q.editorial.reviewStatus;

export const getQuestionWorkflowStatus = (
  q: Pick<KangurTestQuestion, 'editorial'>
): KangurTestQuestion['editorial']['workflowStatus'] => q.editorial.workflowStatus;

export const isPublishedKangurTestQuestion = (
  question: Pick<KangurTestQuestion, 'editorial'>
): boolean => question.editorial.workflowStatus === 'published';

export const questionDocumentNeedsRichRenderer = (
  document: KangurLessonDocument | undefined,
  fallbackText: string
): boolean => {
  if (!document) {
    return false;
  }

  const pages = resolveKangurLessonDocumentPages(document);
  const blocks = pages.flatMap((page) => page.blocks);
  if (blocks.length !== 1) {
    return true;
  }

  const [block] = blocks;
  if (block?.type !== 'text') {
    return true;
  }

  return stripHtmlToText(block.html) !== fallbackText.trim();
};

export const getQuestionStemNarrationText = (question: KangurTestQuestion): string =>
  extractPlainTextFromQuestionDocument(question.stemDocument) || question.prompt;

export const getQuestionExplanationNarrationText = (question: KangurTestQuestion): string =>
  extractPlainTextFromQuestionDocument(question.explanationDocument) || question.explanation || '';

// ─── Question ID / creation ───────────────────────────────────────────────────

export const createKangurTestQuestionId = (): string =>
  `ktq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createKangurTestQuestion = (suiteId: string, sortOrder = 0): KangurTestQuestion =>
  sanitizeQuestion(
    kangurTestQuestionSchema.parse({
      id: createKangurTestQuestionId(),
      suiteId,
      sortOrder,
      prompt: '',
      choices: DEFAULT_CHOICE_LABELS.slice(0, 5).map((label) => ({
        label,
        text: '',
        svgContent: '',
      })),
      correctChoiceLabel: 'A',
      pointValue: 3,
      explanation: '',
      illustration: createDefaultIllustration(),
      presentation: { layout: 'classic', choiceStyle: 'list' },
      editorial: { source: 'manual', reviewStatus: 'ready', workflowStatus: 'draft', auditFlags: [] },
    })
  );

// ─── Store operations ─────────────────────────────────────────────────────────

export const parseKangurTestQuestionStore = (raw: unknown): KangurTestQuestionStore => {
  const parsed = kangurTestQuestionStoreSchema.safeParse(
    parseJsonSetting(typeof raw === 'string' ? raw : null, {})
  );
  if (!parsed.success) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(parsed.data).map(([questionId, question]) => [
      questionId,
      sanitizeQuestion(question),
    ])
  );
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

export const getPublishedQuestionsForSuite = (
  store: KangurTestQuestionStore,
  suiteId: string
): KangurTestQuestion[] =>
  getQuestionsForSuite(store, suiteId).filter((question) => isPublishedKangurTestQuestion(question));

export const hasFullyPublishedQuestionSetForSuite = (
  store: KangurTestQuestionStore,
  suiteId: string
): boolean => {
  const suiteQuestions = getQuestionsForSuite(store, suiteId);
  return suiteQuestions.length > 0 && suiteQuestions.every((question) => isPublishedKangurTestQuestion(question));
};

export const publishReadyQuestions = (
  store: KangurTestQuestionStore,
  options?: {
    suiteId?: string;
    questionIds?: string[];
    publishedAt?: string;
  }
): {
  store: KangurTestQuestionStore;
  publishedQuestionIds: string[];
} => {
  const questionIds = options?.questionIds ? new Set(options.questionIds) : null;
  const publishedAt = options?.publishedAt ?? new Date().toISOString();
  const nextStore: KangurTestQuestionStore = { ...store };
  const publishedQuestionIds: string[] = [];

  for (const [questionId, question] of Object.entries(store)) {
    if (options?.suiteId && question.suiteId !== options.suiteId) {
      continue;
    }

    if (questionIds && !questionIds.has(questionId)) {
      continue;
    }

    if (question.editorial.workflowStatus !== 'ready') {
      continue;
    }

    nextStore[questionId] = sanitizeQuestion({
      ...question,
      editorial: {
        ...question.editorial,
        workflowStatus: 'published',
        publishedAt,
      },
    });
    publishedQuestionIds.push(questionId);
  }

  return {
    store: publishedQuestionIds.length > 0 ? nextStore : store,
    publishedQuestionIds,
  };
};

const getQuestionLearnerPayload = (
  question: Pick<
    KangurTestQuestion,
    | 'prompt'
    | 'choices'
    | 'correctChoiceLabel'
    | 'pointValue'
    | 'explanation'
    | 'illustration'
    | 'stemDocument'
    | 'explanationDocument'
    | 'hintDocument'
    | 'presentation'
  >
): string =>
  JSON.stringify({
    prompt: question.prompt,
    choices: question.choices,
    correctChoiceLabel: question.correctChoiceLabel,
    pointValue: question.pointValue,
    explanation: question.explanation ?? null,
    illustration: question.illustration,
    stemDocument: question.stemDocument ?? null,
    explanationDocument: question.explanationDocument ?? null,
    hintDocument: question.hintDocument ?? null,
    presentation: question.presentation,
  });

export const shouldDemotePublishedQuestionAfterEdit = (
  previousQuestion: KangurTestQuestion,
  nextQuestion: KangurTestQuestion
): boolean =>
  previousQuestion.editorial.workflowStatus === 'published' &&
  nextQuestion.editorial.workflowStatus === 'published' &&
  getQuestionLearnerPayload(previousQuestion) !== getQuestionLearnerPayload(nextQuestion);

export const applyPublishedQuestionEditPolicy = (
  previousQuestion: KangurTestQuestion | null,
  nextQuestion: KangurTestQuestion
): KangurTestQuestion => {
  if (!previousQuestion || !shouldDemotePublishedQuestionAfterEdit(previousQuestion, nextQuestion)) {
    return nextQuestion;
  }

  return sanitizeQuestion({
    ...nextQuestion,
    editorial: {
      ...nextQuestion.editorial,
      workflowStatus: 'draft',
      publishedAt: undefined,
    },
  });
};

export const reorderQuestions = (questions: KangurTestQuestion[]): KangurTestQuestion[] =>
  questions.map((q, i) => ({ ...q, sortOrder: (i + 1) * KANGUR_QUESTION_SORT_ORDER_GAP }));

export const upsertKangurTestQuestion = (
  store: KangurTestQuestionStore,
  question: KangurTestQuestion
): KangurTestQuestionStore => ({
  ...store,
  [question.id]: sanitizeQuestion(question),
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
  stemDocument: KangurLessonDocument | null;
  explanationDocument: KangurLessonDocument | null;
  hintDocument: KangurLessonDocument | null;
  presentation: KangurTestQuestionPresentation;
  editorial: KangurTestQuestionEditorial;
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
    stemDocument: q.stemDocument ?? null,
    explanationDocument: q.explanationDocument ?? null,
    hintDocument: q.hintDocument ?? null,
    presentation: q.presentation,
    editorial: q.editorial,
  };
};

export const toQuestionFormData = (q: KangurTestQuestion): QuestionFormData => ({
  prompt: q.prompt,
  choices: q.choices,
  correctChoiceLabel: q.correctChoiceLabel,
  pointValue: q.pointValue,
  explanation: q.explanation ?? '',
  illustration: q.illustration,
  stemDocument: q.stemDocument ?? null,
  explanationDocument: q.explanationDocument ?? null,
  hintDocument: q.hintDocument ?? null,
  presentation: q.presentation,
  editorial: q.editorial,
});

export const formDataToQuestion = (
  formData: QuestionFormData,
  id: string,
  suiteId: string,
  sortOrder: number
): KangurTestQuestion =>
  sanitizeQuestion(
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
      stemDocument: formData.stemDocument ?? buildQuestionTextDocument(formData.prompt),
      explanationDocument:
        formData.explanationDocument ?? buildQuestionTextDocument(formData.explanation),
      hintDocument: formData.hintDocument ?? undefined,
      presentation: formData.presentation,
      editorial: {
        ...formData.editorial,
        publishedAt:
          formData.editorial.workflowStatus === 'published'
            ? formData.editorial.publishedAt ?? new Date().toISOString()
            : undefined,
      },
    })
  );
