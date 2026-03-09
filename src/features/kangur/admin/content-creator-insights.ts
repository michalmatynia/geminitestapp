import type {
  KangurLesson,
  KangurLessonDocument,
  KangurLessonDocumentStore,
  KangurLessonPage,
} from '@/shared/contracts/kangur';
import type { KangurTestQuestionStore } from '@/shared/contracts/kangur-tests';

import { countLessonsRequiringLegacyImport } from './utils';
import { hasKangurLessonDocumentContent, resolveKangurLessonDocumentPages } from '../lesson-documents';
import { buildKangurLessonDocumentNarrationScript, hasKangurLessonNarrationContent } from '../tts/script';

export type KangurLessonAuthoringFilter =
  | 'all'
  | 'custom'
  | 'legacy'
  | 'needsFixes'
  | 'hidden'
  | 'missingNarration';

export type KangurLessonAuthoringFilterCount = {
  id: KangurLessonAuthoringFilter;
  label: string;
  count: number;
};

export type KangurContentCreatorDashboardStats = {
  lessonCount: number;
  customContentCount: number;
  legacyLessonCount: number;
  needsFixesCount: number;
  hiddenLessonCount: number;
  missingNarrationCount: number;
  testSuiteCount: number;
  questionCount: number;
};

export type KangurLessonAuthoringStatus = {
  hasContent: boolean;
  needsLegacyImport: boolean;
  isHidden: boolean;
  isMissingNarration: boolean;
  hasStructuralWarnings: boolean;
  hasBlockingIssues: boolean;
};

export type KangurLessonDocumentValidation = {
  warnings: string[];
  blockers: string[];
  pageCount: number;
  blockCount: number;
  hasMeaningfulContent: boolean;
  hasNarrationContent: boolean;
  hasNarrationWarning: boolean;
  hasStructuralWarnings: boolean;
};

export type KangurLessonPageValidation = {
  warnings: string[];
  blockCount: number;
  hasMeaningfulContent: boolean;
  hasStructuralWarnings: boolean;
  issueCount: number;
  isEmpty: boolean;
};

const getLessonNarrationPresence = (
  lesson: KangurLesson,
  document: KangurLessonDocument | null | undefined
): boolean => {
  if (!document) return false;
  const script = buildKangurLessonDocumentNarrationScript({
    lessonId: lesson.id,
    title: lesson.title,
    description: lesson.description,
    document,
  });
  return hasKangurLessonNarrationContent(script);
};

export const summarizeKangurContentCreator = ({
  lessons,
  lessonDocuments,
  testSuiteCount,
  questionStore,
}: {
  lessons: KangurLesson[];
  lessonDocuments: KangurLessonDocumentStore;
  testSuiteCount: number;
  questionStore: KangurTestQuestionStore;
}): KangurContentCreatorDashboardStats => {
  const authoringStatuses = lessons.map((lesson) =>
    getKangurLessonAuthoringStatus(lesson, lessonDocuments)
  );
  const customContentCount = authoringStatuses.filter((status) => status.hasContent).length;
  const hiddenLessonCount = authoringStatuses.filter((status) => status.isHidden).length;
  const missingNarrationCount = authoringStatuses.filter((status) => status.isMissingNarration).length;
  const needsFixesCount = authoringStatuses.filter(
    (status) => status.hasStructuralWarnings || status.hasBlockingIssues
  ).length;

  return {
    lessonCount: lessons.length,
    customContentCount,
    legacyLessonCount: countLessonsRequiringLegacyImport(lessons, lessonDocuments),
    needsFixesCount,
    hiddenLessonCount,
    missingNarrationCount,
    testSuiteCount,
    questionCount: Object.keys(questionStore).length,
  };
};

export const getKangurLessonAuthoringFilterCounts = (
  lessons: KangurLesson[],
  lessonDocuments: KangurLessonDocumentStore
): KangurLessonAuthoringFilterCount[] => {
  const counts = {
    all: lessons.length,
    custom: 0,
    legacy: 0,
    needsFixes: 0,
    hidden: 0,
    missingNarration: 0,
  };

  for (const lesson of lessons) {
    const status = getKangurLessonAuthoringStatus(lesson, lessonDocuments);
    if (status.hasContent) {
      counts.custom += 1;
    }
    if (status.needsLegacyImport) {
      counts.legacy += 1;
    }
    if (status.hasStructuralWarnings || status.hasBlockingIssues) {
      counts.needsFixes += 1;
    }
    if (status.isMissingNarration) {
      counts.missingNarration += 1;
    }
    if (status.isHidden) {
      counts.hidden += 1;
    }
  }

  return [
    { id: 'all', label: 'All lessons', count: counts.all },
    { id: 'custom', label: 'Custom content', count: counts.custom },
    { id: 'legacy', label: 'Needs import', count: counts.legacy },
    { id: 'needsFixes', label: 'Needs fixes', count: counts.needsFixes },
    { id: 'missingNarration', label: 'Missing narration', count: counts.missingNarration },
    { id: 'hidden', label: 'Hidden', count: counts.hidden },
  ];
};

export const getKangurLessonAuthoringStatus = (
  lesson: KangurLesson,
  lessonDocuments: KangurLessonDocumentStore
): KangurLessonAuthoringStatus => {
  const document = lessonDocuments[lesson.id];
  const hasContent = hasKangurLessonDocumentContent(document);
  const validation =
    document !== undefined ? validateKangurLessonDocumentDraft({ lesson, document }) : null;

  return {
    hasContent,
    needsLegacyImport: lesson.contentMode !== 'document' && !hasContent,
    isHidden: !lesson.enabled,
    isMissingNarration: validation?.hasNarrationWarning ?? false,
    hasStructuralWarnings: validation?.hasStructuralWarnings ?? false,
    hasBlockingIssues: (validation?.blockers.length ?? 0) > 0,
  };
};

export const matchesKangurLessonAuthoringFilter = (
  filter: KangurLessonAuthoringFilter,
  lesson: KangurLesson,
  lessonDocuments: KangurLessonDocumentStore
): boolean => {
  if (filter === 'all') return true;

  const status = getKangurLessonAuthoringStatus(lesson, lessonDocuments);

  if (filter === 'custom') return status.hasContent;
  if (filter === 'legacy') return status.needsLegacyImport;
  if (filter === 'needsFixes') return status.hasStructuralWarnings || status.hasBlockingIssues;
  if (filter === 'hidden') return status.isHidden;
  if (filter === 'missingNarration') {
    return status.isMissingNarration;
  }

  return true;
};

const stripHtml = (value: string): string => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const hasMeaningfulPageBlockContent = (block: KangurLessonPage['blocks'][number]): boolean => {
  if (block.type === 'text') {
    return stripHtml(block.html).length > 0;
  }
  if (block.type === 'svg') {
    return block.markup.trim().length > 0;
  }
  if (block.type === 'image') {
    return (
      block.src.trim().length > 0 ||
      (block.caption?.trim().length ?? 0) > 0 ||
      block.title.trim().length > 0
    );
  }
  if (block.type === 'quiz') {
    return stripHtml(block.question).length > 0;
  }
  if (block.type === 'grid') {
    return block.items.some((item) => hasMeaningfulPageBlockContent(item.block));
  }
  if (block.type === 'callout') {
    return stripHtml(block.html).length > 0 || (block.title?.trim().length ?? 0) > 0;
  }
  if (block.type === 'activity') {
    return (
      block.title.trim().length > 0 ||
      (block.description?.trim().length ?? 0) > 0 ||
      (block.ttsDescription?.trim().length ?? 0) > 0
    );
  }
  return false;
};

export const validateKangurLessonPageDraft = (
  page: KangurLessonPage
): KangurLessonPageValidation => {
  const warnings: string[] = [];
  let issueCount = 0;
  const pushIssue = (message: string): void => {
    warnings.push(message);
    issueCount += 1;
  };

  const blockCount = page.blocks.length;
  const hasMeaningfulContent = page.blocks.some((block) => hasMeaningfulPageBlockContent(block));
  const isEmpty = blockCount === 0;

  if (isEmpty) {
    pushIssue('This page has no blocks yet.');
  } else if (!hasMeaningfulContent) {
    pushIssue('This page has no visible learner content yet.');
  }

  let incompleteSvgBlocks = 0;
  let incompleteImageBlocks = 0;
  let incompleteQuizBlocks = 0;

  for (const block of page.blocks) {
    if (block.type === 'svg' && block.markup.trim().length === 0) {
      incompleteSvgBlocks += 1;
    }
    if (
      block.type === 'image' &&
      block.src.trim().length === 0 &&
      (block.caption?.trim().length ?? 0) === 0 &&
      block.title.trim().length === 0
    ) {
      incompleteImageBlocks += 1;
    }
    if (block.type === 'quiz') {
      const hasQuestion = stripHtml(block.question).length > 0;
      const nonEmptyChoices = block.choices.filter((choice) => choice.text.trim().length > 0).length;
      const hasCorrectChoice = block.correctChoiceId.trim().length > 0;
      if (!hasQuestion || nonEmptyChoices < 2 || !hasCorrectChoice) {
        incompleteQuizBlocks += 1;
      }
    }
  }

  if (incompleteSvgBlocks > 0) {
    pushIssue(
      incompleteSvgBlocks === 1
        ? 'One SVG block is still empty.'
        : `${incompleteSvgBlocks} SVG blocks are still empty.`
    );
  }
  if (incompleteImageBlocks > 0) {
    pushIssue(
      incompleteImageBlocks === 1
        ? 'One image block is missing its source or caption.'
        : `${incompleteImageBlocks} image blocks are missing their source or caption.`
    );
  }
  if (incompleteQuizBlocks > 0) {
    pushIssue(
      incompleteQuizBlocks === 1
        ? 'One quiz block still needs a question, answer choices, or a correct answer.'
        : `${incompleteQuizBlocks} quiz blocks still need a question, answer choices, or a correct answer.`
    );
  }

  return {
    warnings,
    blockCount,
    hasMeaningfulContent,
    hasStructuralWarnings: issueCount > 0,
    issueCount,
    isEmpty,
  };
};

export const validateKangurLessonDocumentDraft = ({
  lesson,
  document,
}: {
  lesson: KangurLesson | null;
  document: KangurLessonDocument;
}): KangurLessonDocumentValidation => {
  const pages = resolveKangurLessonDocumentPages(document);
  const warnings: string[] = [];
  const blockers: string[] = [];
  const pageValidations = pages.map((page) => validateKangurLessonPageDraft(page));
  let structuralWarningCount = 0;
  const blockCount = pages.reduce((total, page) => total + page.blocks.length, 0);
  const hasMeaningfulContent = hasKangurLessonDocumentContent(document);
  let hasNarrationWarning = false;

  const pushStructuralWarning = (message: string): void => {
    warnings.push(message);
    structuralWarningCount += 1;
  };

  if (lesson !== null && lesson.title.trim().length === 0) {
    blockers.push('Lesson title is required before saving.');
  }

  for (const pageValidation of pageValidations) {
    for (const warning of pageValidation.warnings) {
      pushStructuralWarning(warning);
    }
  }

  const hasNarrationContent =
    lesson !== null &&
    hasMeaningfulContent &&
    getLessonNarrationPresence(lesson, document);
  if (lesson !== null && hasMeaningfulContent && !hasNarrationContent) {
    warnings.push('Narration is still empty for this lesson draft.');
    hasNarrationWarning = true;
  }

  return {
    warnings,
    blockers,
    pageCount: pages.length,
    blockCount,
    hasMeaningfulContent,
    hasNarrationContent,
    hasNarrationWarning,
    hasStructuralWarnings: structuralWarningCount > 0,
  };
};
