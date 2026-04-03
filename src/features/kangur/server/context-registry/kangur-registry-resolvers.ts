import {
  stripHtmlToText,
  resolveKangurLessonDocumentPages,
} from '@/features/kangur/lesson-documents';
import type {
  KangurAssignmentSnapshot,
  KangurLessonActivityBlock,
  KangurLessonCalloutBlock,
  KangurLesson,
  KangurLessonDocument,
  KangurLessonImageBlock,
  KangurLessonQuizBlock,
  KangurLessonSvgBlock,
  KangurLessonTextBlock,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurAiTutorConversationContext,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type {
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import {
  type LessonDocumentSnippetCard,
} from './kangur-registry-types';
import { readTrimmedString, truncate } from './kangur-registry-utils';

export const buildLessonNavigationSummary = (
  previousLesson: KangurLesson | null,
  nextLesson: KangurLesson | null
): string | null => {
  if (previousLesson && nextLesson) {
    return `Bez wracania do listy możesz cofnąć się do ${previousLesson.title} albo przejść dalej do ${nextLesson.title}.`;
  }
  if (previousLesson) {
    return `Bez wracania do listy możesz cofnąć się do ${previousLesson.title}.`;
  }
  if (nextLesson) {
    return `Bez wracania do listy możesz przejść dalej do ${nextLesson.title}.`;
  }
  return null;
};

export const createLessonDocumentSnippetCard = (
  id: string,
  text: string | null | undefined,
  explanation: string | null | undefined
): LessonDocumentSnippetCard | null => {
  const trimmedText = readTrimmedString(text);
  if (!trimmedText) {
    return null;
  }

  const trimmedExplanation = readTrimmedString(explanation);
  return {
    id,
    text: trimmedText,
    explanation:
      trimmedExplanation && trimmedExplanation !== trimmedText ? trimmedExplanation : null,
  };
};

const toLessonDocumentSnippetCardList = (
  card: LessonDocumentSnippetCard | null
): LessonDocumentSnippetCard[] => (card ? [card] : []);

const extractTextLessonDocumentSnippetCards = (
  block: KangurLessonTextBlock
): LessonDocumentSnippetCard[] =>
  toLessonDocumentSnippetCardList(
    createLessonDocumentSnippetCard(`${block.id}:text`, stripHtmlToText(block.html), block.ttsText)
  );

const extractSvgLessonDocumentSnippetCards = (
  block: KangurLessonSvgBlock
): LessonDocumentSnippetCard[] =>
  toLessonDocumentSnippetCardList(
    createLessonDocumentSnippetCard(`${block.id}:svg`, block.title, block.ttsDescription)
  );

const extractImageLessonDocumentSnippetCards = (
  block: KangurLessonImageBlock
): LessonDocumentSnippetCard[] => {
  const text = readTrimmedString(block.title) ?? block.caption;
  const explanation = readTrimmedString(block.ttsDescription) ?? block.caption;
  return toLessonDocumentSnippetCardList(
    createLessonDocumentSnippetCard(`${block.id}:image`, text, explanation)
  );
};

const extractActivityLessonDocumentSnippetCards = (
  block: KangurLessonActivityBlock
): LessonDocumentSnippetCard[] => {
  const text = readTrimmedString(block.title) ?? block.description;
  const explanation = readTrimmedString(block.ttsDescription) ?? block.description;
  return toLessonDocumentSnippetCardList(
    createLessonDocumentSnippetCard(`${block.id}:activity`, text, explanation)
  );
};

const extractCalloutLessonDocumentSnippetCards = (
  block: KangurLessonCalloutBlock
): LessonDocumentSnippetCard[] => {
  const htmlText = stripHtmlToText(block.html);
  const text = readTrimmedString(block.title) ?? htmlText;
  const explanation = readTrimmedString(block.ttsText) ?? htmlText;
  return toLessonDocumentSnippetCardList(
    createLessonDocumentSnippetCard(`${block.id}:callout`, text, explanation)
  );
};

const extractQuizLessonDocumentSnippetCards = (
  block: KangurLessonQuizBlock
): LessonDocumentSnippetCard[] =>
  toLessonDocumentSnippetCardList(
    createLessonDocumentSnippetCard(
      `${block.id}:quiz`,
      stripHtmlToText(block.question),
      block.explanation || block.ttsText
    )
  );

const toLessonSnippetList = (values: Array<string | null | undefined>): string[] =>
  values.filter((value): value is string => Boolean(readTrimmedString(value)));

const extractTextBlockSnippets = (block: KangurLessonTextBlock): string[] =>
  toLessonSnippetList([stripHtmlToText(block.html)]);

const extractSvgBlockSnippets = (block: KangurLessonSvgBlock): string[] =>
  toLessonSnippetList([block.title, block.ttsDescription]);

const extractImageBlockSnippets = (block: KangurLessonImageBlock): string[] =>
  toLessonSnippetList([block.title, block.caption, block.ttsDescription]);

const extractActivityBlockSnippets = (block: KangurLessonActivityBlock): string[] =>
  toLessonSnippetList([block.title, block.description, block.ttsDescription]);

const extractCalloutBlockSnippets = (block: KangurLessonCalloutBlock): string[] =>
  toLessonSnippetList([block.title, stripHtmlToText(block.html)]);

const extractQuizBlockSnippets = (block: KangurLessonQuizBlock): string[] =>
  toLessonSnippetList([block.question, ...block.choices.map((choice) => choice.text), block.explanation]);

const extractLeafLessonDocumentSnippetCards = (
  block: KangurLessonDocument['blocks'][number]
): LessonDocumentSnippetCard[] => {
  switch (block.type) {
    case 'text':
      return extractTextLessonDocumentSnippetCards(block);
    case 'svg':
      return extractSvgLessonDocumentSnippetCards(block);
    case 'image':
      return extractImageLessonDocumentSnippetCards(block);
    case 'activity':
      return extractActivityLessonDocumentSnippetCards(block);
    case 'callout':
      return extractCalloutLessonDocumentSnippetCards(block);
    case 'quiz':
      return extractQuizLessonDocumentSnippetCards(block);
    default:
      return [];
  }
};

export const extractLessonDocumentSnippetCards = (
  block: KangurLessonDocument['blocks'][number]
): LessonDocumentSnippetCard[] => {
  if (block.type === 'grid') {
    return block.items.flatMap((item) => extractLessonDocumentSnippetCards(item.block));
  }
  return extractLeafLessonDocumentSnippetCards(block);
};

const extractLeafBlockSnippets = (block: KangurLessonDocument['blocks'][number]): string[] => {
  switch (block.type) {
    case 'text':
      return extractTextBlockSnippets(block);
    case 'svg':
      return extractSvgBlockSnippets(block);
    case 'image':
      return extractImageBlockSnippets(block);
    case 'activity':
      return extractActivityBlockSnippets(block);
    case 'callout':
      return extractCalloutBlockSnippets(block);
    case 'quiz':
      return extractQuizBlockSnippets(block);
    default:
      return [];
  }
};

export const extractBlockSnippets = (block: KangurLessonDocument['blocks'][number]): string[] => {
  if (block.type === 'grid') {
    return block.items.flatMap((item) => extractBlockSnippets(item.block));
  }
  return extractLeafBlockSnippets(block);
};

const collectLessonPageSnippetCandidates = (
  page: ReturnType<typeof resolveKangurLessonDocumentPages>[number]
): string[] => [
  page.sectionTitle ?? '',
  page.sectionDescription ?? '',
  page.title ?? '',
  page.description ?? '',
  ...page.blocks.flatMap((block) => extractBlockSnippets(block)),
];

const dedupeLessonSnippets = (snippets: string[]): string[] => {
  const seen = new Set<string>();
  return snippets
    .map((snippet) => truncate(snippet.trim(), 260))
    .filter((snippet) => snippet.length > 0)
    .filter((snippet) => {
      if (seen.has(snippet)) {
        return false;
      }
      seen.add(snippet);
      return true;
    });
};

export const buildLessonDocumentSnippets = (
  document: KangurLessonDocument | null | undefined
): string[] => {
  if (!document) {
    return [];
  }

  return dedupeLessonSnippets(
    resolveKangurLessonDocumentPages(document).flatMap((page) =>
      collectLessonPageSnippetCandidates(page)
    )
  ).slice(0, 8);
};

export const buildLessonDocumentSnippetCards = (
  document: KangurLessonDocument | null | undefined
): LessonDocumentSnippetCard[] => {
  if (!document) {
    return [];
  }

  const seen = new Set<string>();
  return resolveKangurLessonDocumentPages(document)
    .flatMap((page) => [
      createLessonDocumentSnippetCard(
        `${page.id}:section-title`,
        page.sectionTitle ?? '',
        page.sectionDescription || page.description || page.title
      ),
      createLessonDocumentSnippetCard(
        `${page.id}:page-title`,
        page.title ?? '',
        page.description || page.sectionDescription
      ),
      ...page.blocks.flatMap((block) => extractLessonDocumentSnippetCards(block)),
    ])
    .filter((card): card is LessonDocumentSnippetCard => Boolean(card))
    .filter((card) => {
      const key = card.text.toLocaleLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 24);
};

const isLessonAssignmentForComponent = (
  assignment: KangurAssignmentSnapshot,
  componentId: KangurLesson['componentId']
): boolean =>
  assignment.target.type === 'lesson' && assignment.target.lessonComponentId === componentId;

const findContextSelectedLessonAssignment = (
  assignments: KangurAssignmentSnapshot[],
  assignmentId: string | undefined
): KangurAssignmentSnapshot | null => {
  if (!assignmentId) {
    return null;
  }
  return assignments.find((assignment) => assignment.id === assignmentId) ?? null;
};

const findLessonAssignmentByCompletionState = (
  assignments: KangurAssignmentSnapshot[],
  componentId: KangurLesson['componentId'],
  completed: boolean
): KangurAssignmentSnapshot | null =>
  assignments.find(
    (assignment) =>
      isLessonAssignmentForComponent(assignment, componentId) &&
      (assignment.progress.status === 'completed') === completed
  ) ?? null;

export const findRelevantLessonAssignment = (
  lesson: KangurLesson,
  assignments: KangurAssignmentSnapshot[],
  context?: Pick<KangurAiTutorConversationContext, 'assignmentId'>
): KangurAssignmentSnapshot | null => {
  const exact = findContextSelectedLessonAssignment(assignments, context?.assignmentId);
  if (exact) {
    return exact;
  }

  return (
    findLessonAssignmentByCompletionState(assignments, lesson.componentId, false) ??
    findLessonAssignmentByCompletionState(assignments, lesson.componentId, true)
  );
};

const buildLearnerLoginActivityLine = (
  learnerDisplayName: string,
  lastLearnerSignInAt: string | null
): string =>
  lastLearnerSignInAt
    ? `${learnerDisplayName} last signed into Kangur at ${lastLearnerSignInAt}.`
    : `No recent Kangur learner sign-in was recorded for ${learnerDisplayName}.`;

const buildParentLoginActivityLine = (lastParentLoginAt: string | null): string =>
  lastParentLoginAt
    ? `The parent last logged into Kangur at ${lastParentLoginAt}.`
    : 'No recent Kangur parent login was recorded.';

const buildWeeklyLoginCountsLine = (input: {
  learnerSignInCount7d: number;
  parentLoginCount7d: number;
}): string =>
  `In the last 7 days there were ${input.learnerSignInCount7d} learner sign-ins and ${input.parentLoginCount7d} parent Kangur logins.`;

export const buildLoginActivitySummary = (input: {
  learnerDisplayName: string | null;
  parentLoginCount7d: number;
  learnerSignInCount7d: number;
  lastParentLoginAt: string | null;
  lastLearnerSignInAt: string | null;
}): string => {
  const learnerLabel = input.learnerDisplayName ?? 'This learner';
  return [
    buildLearnerLoginActivityLine(learnerLabel, input.lastLearnerSignInAt),
    buildParentLoginActivityLine(input.lastParentLoginAt),
    buildWeeklyLoginCountsLine(input),
  ].join(' ');
};

type RuntimeDocumentSections = NonNullable<ContextRuntimeDocument['sections']>;
type RuntimeTextSection = ContextRuntimeDocumentSection & {
  id: string;
  kind: 'text';
  text: string;
};

const upsertRuntimeTextSection = (
  sections: RuntimeDocumentSections,
  nextSection: RuntimeTextSection | null
): RuntimeDocumentSections => {
  if (!nextSection) {
    return sections;
  }

  const existingSectionIndex = sections.findIndex(
    (section: ContextRuntimeDocumentSection) => section.id === nextSection.id
  );
  return existingSectionIndex >= 0
    ? sections.map((section, index) => (index === existingSectionIndex ? nextSection : section))
    : [...sections, nextSection];
};

const buildQuestionReviewSummary = (
  document: ContextRuntimeDocument,
  reviewSummary: string,
  selectedChoiceFacts: { selectedChoiceSummary: string } | null
): string => {
  const revealedExplanation = readTrimmedString(document.facts?.['revealedExplanation']);
  const correctChoiceLabel = readTrimmedString(document.facts?.['correctChoiceLabel']);
  const summary = [
    reviewSummary,
    selectedChoiceFacts?.selectedChoiceSummary,
    revealedExplanation,
    correctChoiceLabel ? `Correct choice: ${correctChoiceLabel}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return summary || reviewSummary;
};

const buildAugmentedTestSurfaceSections = (
  document: ContextRuntimeDocument,
  resultSummary: string | null,
  reviewSummary: string | null,
  selectedChoiceFacts: { selectedChoiceSummary: string } | null
): NonNullable<ContextRuntimeDocument['sections']> => {
  const sections: RuntimeDocumentSections = document.sections ?? [];
  const sectionsWithResult = upsertRuntimeTextSection(
    sections,
    resultSummary === null
      ? null
      : {
        id: 'test_result',
        kind: 'text',
        title: 'Test result summary',
        text: resultSummary,
      }
  );

  return upsertRuntimeTextSection(
    sectionsWithResult,
    reviewSummary === null
      ? null
      : {
        id: 'question_review',
        kind: 'text',
        title: 'Question review',
        text: buildQuestionReviewSummary(document, reviewSummary, selectedChoiceFacts),
      }
  );
};

const buildAugmentedTestSurfaceFacts = (
  document: ContextRuntimeDocument,
  resultSummary: string | null,
  reviewSummary: string | null,
  selectedChoiceFacts: { selectedChoiceSummary: string } | null
): Record<string, unknown> => ({
  ...(document.facts ?? {}),
  ...(selectedChoiceFacts ?? {}),
  ...(reviewSummary ? { reviewSummary } : {}),
  ...(resultSummary ? { resultSummary } : {}),
});

export const augmentKangurTestSurfaceRuntimeDocument = (
  document: ContextRuntimeDocument | null,
  {
    resultSummary,
    reviewSummary,
    selectedChoiceFacts,
    testContextType,
  }: {
    resultSummary: string | null;
    reviewSummary: string | null;
    selectedChoiceFacts: { selectedChoiceSummary: string } | null;
    testContextType: string;
  }
): ContextRuntimeDocument | null => {
  if (document?.entityType !== testContextType) {
    return document ?? null;
  }

  if (!resultSummary && !reviewSummary && !selectedChoiceFacts) {
    return document;
  }

  return {
    ...document,
    facts: buildAugmentedTestSurfaceFacts(
      document,
      resultSummary,
      reviewSummary,
      selectedChoiceFacts
    ),
    sections: buildAugmentedTestSurfaceSections(
      document,
      resultSummary,
      reviewSummary,
      selectedChoiceFacts
    ),
  };
};
