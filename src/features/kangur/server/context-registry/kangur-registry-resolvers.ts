import {
  stripHtmlToText,
  resolveKangurLessonDocumentPages,
} from '@/features/kangur/lesson-documents';
import type {
  KangurAssignmentSnapshot,
  KangurLesson,
  KangurLessonDocument,
} from '@/shared/contracts/kangur';
import type {
  KangurAiTutorConversationContext,
} from '@/shared/contracts/kangur-ai-tutor';
import type {
  ContextRuntimeDocument,
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

export const extractLessonDocumentSnippetCards = (
  block: KangurLessonDocument['blocks'][number]
): LessonDocumentSnippetCard[] => {
  switch (block.type) {
    case 'text':
      return [
        createLessonDocumentSnippetCard(
          `${block.id}:text`,
          stripHtmlToText(block.html),
          block.ttsText
        ),
      ].filter((card): card is LessonDocumentSnippetCard => Boolean(card));
    case 'svg':
      return [
        createLessonDocumentSnippetCard(
          `${block.id}:svg`,
          block.title,
          block.ttsDescription
        ),
      ].filter((card): card is LessonDocumentSnippetCard => Boolean(card));
    case 'image':
      return [
        createLessonDocumentSnippetCard(
          `${block.id}:image`,
          block.title || block.caption,
          block.ttsDescription || block.caption
        ),
      ].filter((card): card is LessonDocumentSnippetCard => Boolean(card));
    case 'activity':
      return [
        createLessonDocumentSnippetCard(
          `${block.id}:activity`,
          block.title || block.description,
          block.ttsDescription || block.description
        ),
      ].filter((card): card is LessonDocumentSnippetCard => Boolean(card));
    case 'callout':
      return [
        createLessonDocumentSnippetCard(
          `${block.id}:callout`,
          block.title || stripHtmlToText(block.html),
          block.ttsText || stripHtmlToText(block.html)
        ),
      ].filter((card): card is LessonDocumentSnippetCard => Boolean(card));
    case 'quiz':
      return [
        createLessonDocumentSnippetCard(
          `${block.id}:quiz`,
          stripHtmlToText(block.question),
          block.explanation || block.ttsText
        ),
      ].filter((card): card is LessonDocumentSnippetCard => Boolean(card));
    case 'grid':
      return block.items.flatMap((item) => extractLessonDocumentSnippetCards(item.block));
    default:
      return [];
  }
};

export const extractBlockSnippets = (block: KangurLessonDocument['blocks'][number]): string[] => {
  switch (block.type) {
    case 'text':
      return readTrimmedString(stripHtmlToText(block.html)) ? [stripHtmlToText(block.html)] : [];
    case 'svg':
      return [block.title, block.ttsDescription].filter((value): value is string => Boolean(readTrimmedString(value)));
    case 'image':
      return [block.title, block.caption, block.ttsDescription].filter((value): value is string =>
        Boolean(readTrimmedString(value))
      );
    case 'activity':
      return [block.title, block.description, block.ttsDescription].filter((value): value is string =>
        Boolean(readTrimmedString(value))
      );
    case 'callout':
      return [block.title, stripHtmlToText(block.html)].filter((value): value is string =>
        Boolean(readTrimmedString(value))
      );
    case 'quiz':
      return [
        block.question,
        ...block.choices.map((choice) => choice.text),
        block.explanation ?? '',
      ].filter((value): value is string => Boolean(readTrimmedString(value)));
    case 'grid':
      return block.items.flatMap((item) => extractBlockSnippets(item.block));
    default:
      return [];
  }
};

export const buildLessonDocumentSnippets = (document: KangurLessonDocument | null | undefined): string[] => {
  if (!document) {
    return [];
  }
  const snippets = resolveKangurLessonDocumentPages(document).flatMap((page) => [
    page.sectionTitle ?? '',
    page.sectionDescription ?? '',
    page.title ?? '',
    page.description ?? '',
    ...page.blocks.flatMap((block) => extractBlockSnippets(block)),
  ]);
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
    })
    .slice(0, 8);
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

export const findRelevantLessonAssignment = (
  lesson: KangurLesson,
  assignments: KangurAssignmentSnapshot[],
  context?: Pick<KangurAiTutorConversationContext, 'assignmentId'>
): KangurAssignmentSnapshot | null => {
  if (context?.assignmentId) {
    const exact = assignments.find((assignment) => assignment.id === context.assignmentId);
    if (exact) {
      return exact;
    }
  }
  const active = assignments.find(
    (assignment) =>
      assignment.target.type === 'lesson' &&
      assignment.target.lessonComponentId === lesson.componentId &&
      assignment.progress.status !== 'completed'
  );
  if (active) {
    return active;
  }
  return (
    assignments.find(
      (assignment) =>
        assignment.target.type === 'lesson' &&
        assignment.target.lessonComponentId === lesson.componentId
    ) ?? null
  );
};

export const buildLoginActivitySummary = (input: {
  learnerDisplayName: string | null;
  parentLoginCount7d: number;
  learnerSignInCount7d: number;
  lastParentLoginAt: string | null;
  lastLearnerSignInAt: string | null;
}): string => {
  const learnerLabel = input.learnerDisplayName ?? 'This learner';
  const lines: string[] = [];
  if (input.lastLearnerSignInAt) {
    lines.push(`${learnerLabel} last signed into Kangur at ${input.lastLearnerSignInAt}.`);
  } else {
    lines.push(`No recent Kangur learner sign-in was recorded for ${learnerLabel}.`);
  }
  if (input.lastParentLoginAt) {
    lines.push(`The parent last logged into Kangur at ${input.lastParentLoginAt}.`);
  } else {
    lines.push('No recent Kangur parent login was recorded.');
  }
  lines.push(
    `In the last 7 days there were ${input.learnerSignInCount7d} learner sign-ins and ${input.parentLoginCount7d} parent Kangur logins.`
  );
  return lines.join(' ');
};

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

  const sections = document.sections ?? [];
  const nextResultSection =
    resultSummary === null
      ? null
      : {
        id: 'test_result',
        kind: 'text' as const,
        title: 'Test result summary',
        text: resultSummary,
      };
  const sectionsWithResult =
    nextResultSection === null
      ? sections
      : (() => {
        const existingResultSectionIndex = sections.findIndex(
          (section) => section.id === 'test_result'
        );
        return existingResultSectionIndex >= 0
          ? sections.map((section, index) =>
            index === existingResultSectionIndex ? nextResultSection : section
          )
          : [...sections, nextResultSection];
      })();
  const existingReviewSectionIndex = sectionsWithResult.findIndex(
    (section) => section.id === 'question_review'
  );
  const nextReviewSection =
    reviewSummary === null
      ? null
      : {
        id: 'question_review',
        kind: 'text' as const,
        title: 'Question review',
        text:
          [
            reviewSummary,
            selectedChoiceFacts?.selectedChoiceSummary,
            readTrimmedString(document.facts?.['revealedExplanation']),
            readTrimmedString(document.facts?.['correctChoiceLabel'])
              ? `Correct choice: ${readTrimmedString(document.facts?.['correctChoiceLabel'])}.`
              : null,
          ]
            .filter(Boolean)
            .join(' ') || reviewSummary,
      };
  const mergedSections =
    nextReviewSection === null
      ? sectionsWithResult
      : existingReviewSectionIndex >= 0
        ? sectionsWithResult.map((section, index) =>
          index === existingReviewSectionIndex ? nextReviewSection : section
        )
        : [...sectionsWithResult, nextReviewSection];

  return {
    ...document,
    facts: {
      ...(document.facts ?? {}),
      ...(selectedChoiceFacts ?? {}),
      ...(reviewSummary ? { reviewSummary } : {}),
      ...(resultSummary ? { resultSummary } : {}),
    },
    sections: mergedSections,
  };
};
