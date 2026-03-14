import { resolveKangurAiTutorRuntimeDocuments } from '@/features/kangur/server/context-registry';
import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';

import type { KangurAiTutorSectionKnowledgeBundle } from './section-knowledge';

export const readContextString = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const readRuntimeStringFact = (
  document: ContextRuntimeDocument | null | undefined,
  key: string
): string | null => {
  const value = document?.facts?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const readRuntimeNumberFact = (
  document: ContextRuntimeDocument | null | undefined,
  key: string
): number | null => {
  const value = document?.facts?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const buildTopRecommendationOverlay = (
  learnerSnapshot: ContextRuntimeDocument | null | undefined
): string | null => {
  const title = readRuntimeStringFact(learnerSnapshot, 'topRecommendationTitle');
  if (!title) {
    return null;
  }

  const description = readRuntimeStringFact(learnerSnapshot, 'topRecommendationDescription');
  const actionLabel = readRuntimeStringFact(learnerSnapshot, 'topRecommendationActionLabel');
  const actionPage = readRuntimeStringFact(learnerSnapshot, 'topRecommendationActionPage');

  return [
    `Najlepszy następny krok: ${title}.`,
    description,
    actionLabel && actionPage
      ? `Najprostsza akcja teraz: ${actionLabel} w widoku ${actionPage}.`
      : null,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
};

const truncateOverlayText = (value: string, maxLength = 320): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3).trimEnd()}...` : value;

const asRuntimeRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readRuntimeSectionItems = (
  document: ContextRuntimeDocument | null | undefined,
  sectionId: string
): Record<string, unknown>[] => {
  const section = document?.sections?.find(
    (candidate) => candidate.id === sectionId && Array.isArray(candidate.items)
  );
  if (!section?.items) {
    return [];
  }

  return section.items
    .map((item) => asRuntimeRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
};

const readRecordString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const readRecordNumber = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const readRuntimeFactRecords = (
  document: ContextRuntimeDocument | null | undefined,
  key: string
): Record<string, unknown>[] => {
  const value = document?.facts?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asRuntimeRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
};

const normalizeSelectedTextMatch = (value: string | null | undefined): string =>
  typeof value === 'string'
    ? value
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

const scoreSelectedTextCandidate = (
  normalizedSelection: string,
  normalizedCandidate: string
): number => {
  if (!normalizedSelection || !normalizedCandidate) {
    return 0;
  }

  if (normalizedSelection === normalizedCandidate) {
    return 1_000 + normalizedCandidate.length;
  }

  const allowContains =
    normalizedSelection.length >= 8 && normalizedCandidate.length >= 8;
  if (!allowContains) {
    return 0;
  }

  if (normalizedSelection.includes(normalizedCandidate)) {
    return 720 + normalizedCandidate.length;
  }

  if (normalizedCandidate.includes(normalizedSelection)) {
    return 680 + normalizedSelection.length;
  }

  return 0;
};

const resolveLessonDocumentSelectedTextSnippet = (input: {
  lessonContext: ContextRuntimeDocument | null | undefined;
  selectedText: string | null | undefined;
}): { text: string; explanation: string | null } | null => {
  const normalizedSelection = normalizeSelectedTextMatch(input.selectedText);
  if (!normalizedSelection) {
    return null;
  }

  const rankedCards = readRuntimeFactRecords(input.lessonContext, 'documentSnippetCards')
    .map((card) => {
      const text = readRecordString(card, 'text');
      const explanation = readRecordString(card, 'explanation');
      if (!text) {
        return null;
      }

      return {
        text,
        explanation,
        score: scoreSelectedTextCandidate(
          normalizedSelection,
          normalizeSelectedTextMatch(text)
        ),
      };
    })
    .filter(
      (
        candidate
      ): candidate is { text: string; explanation: string | null; score: number } =>
        candidate !== null && typeof candidate === 'object' && candidate.score > 0
    )
    .sort((left, right) => right.score - left.score);

  const bestMatch = rankedCards[0] ?? null;
  const secondBestMatch = rankedCards[1] ?? null;
  if (!bestMatch || secondBestMatch?.score === bestMatch.score) {
    return null;
  }

  return {
    text: bestMatch.text,
    explanation: bestMatch.explanation,
  };
};

const buildRecentSessionOverlay = (
  learnerSnapshot: ContextRuntimeDocument | null | undefined
): string | null => {
  const latestSession = readRuntimeSectionItems(learnerSnapshot, 'recent_sessions')[0] ?? null;
  if (!latestSession) {
    return null;
  }

  const operationLabel = readRecordString(latestSession, 'operationLabel');
  if (!operationLabel) {
    return null;
  }

  const accuracyPercent = readRecordNumber(latestSession, 'accuracyPercent');
  const score = readRecordNumber(latestSession, 'score');
  const totalQuestions = readRecordNumber(latestSession, 'totalQuestions');
  const xpEarned = readRecordNumber(latestSession, 'xpEarned');
  const details = [
    accuracyPercent !== null ? `${Math.round(accuracyPercent)}% skutecznosci` : null,
    score !== null && totalQuestions !== null ? `${Math.round(score)}/${Math.round(totalQuestions)}` : null,
    xpEarned !== null ? `+${Math.round(xpEarned)} XP` : null,
  ].filter(Boolean);

  return details.length > 0
    ? `Ostatnia sesja: ${operationLabel} (${details.join(', ')}).`
    : `Ostatnia sesja: ${operationLabel}.`;
};

const buildOperationPerformanceOverlay = (
  learnerSnapshot: ContextRuntimeDocument | null | undefined
): string | null => {
  const operationItems = readRuntimeSectionItems(learnerSnapshot, 'operation_performance');
  if (operationItems.length === 0) {
    return null;
  }

  const strongestOperation = operationItems[0] ?? null;
  const weakestOperation = operationItems.at(-1) ?? null;
  const lines: string[] = [];

  if (strongestOperation) {
    const label = readRecordString(strongestOperation, 'label');
    const averageAccuracy = readRecordNumber(strongestOperation, 'averageAccuracy');
    if (label && averageAccuracy !== null) {
      lines.push(
        `Najmocniejsza operacja teraz: ${label} ze srednia skutecznoscia ${Math.round(averageAccuracy)}%.`
      );
    }
  }

  if (weakestOperation) {
    const label = readRecordString(weakestOperation, 'label');
    const averageAccuracy = readRecordNumber(weakestOperation, 'averageAccuracy');
    const attempts = readRecordNumber(weakestOperation, 'attempts');
    const strongestLabel = strongestOperation
      ? readRecordString(strongestOperation, 'label')
      : null;
    if (
      label &&
      averageAccuracy !== null &&
      (!strongestLabel || strongestLabel !== label)
    ) {
      lines.push(
        attempts !== null
          ? `Najwiecej pracy wymaga: ${label} ze srednia skutecznoscia ${Math.round(averageAccuracy)}% po ${Math.round(attempts)} probach.`
          : `Najwiecej pracy wymaga: ${label} ze srednia skutecznoscia ${Math.round(averageAccuracy)}%.`
      );
    }
  }

  return lines.length > 0 ? lines.join('\n\n') : null;
};

const buildLessonDocumentOverlay = (
  lessonContext: ContextRuntimeDocument | null | undefined
): string | null => {
  const documentSummary = readRuntimeStringFact(lessonContext, 'documentSummary');
  if (!documentSummary) {
    return null;
  }

  return `Z treści tej lekcji teraz: ${truncateOverlayText(documentSummary, 280)}`;
};

const buildLessonNavigationOverlay = (
  lessonContext: ContextRuntimeDocument | null | undefined
): string | null => {
  const navigationSummary = readRuntimeStringFact(lessonContext, 'navigationSummary');
  if (!navigationSummary) {
    return null;
  }

  return `Nawigacja tej lekcji: ${navigationSummary}`;
};

const buildTestResultOverlay = (
  testContext: ContextRuntimeDocument | null | undefined
): string | null => {
  const resultSummary = readRuntimeStringFact(testContext, 'resultSummary');
  if (!resultSummary) {
    return null;
  }

  return resultSummary;
};

const buildTestReviewOverlay = (
  testContext: ContextRuntimeDocument | null | undefined
): string | null => {
  const reviewSummary = readRuntimeStringFact(testContext, 'reviewSummary');
  if (reviewSummary) {
    return reviewSummary;
  }

  const selectedChoiceLabel = readRuntimeStringFact(testContext, 'selectedChoiceLabel');
  const selectedChoiceText = readRuntimeStringFact(testContext, 'selectedChoiceText');
  const selectedChoiceLine = selectedChoiceLabel
    ? selectedChoiceText
      ? `Wybrana odpowiedź: ${selectedChoiceLabel} - ${selectedChoiceText}.`
      : `Wybrana odpowiedź: ${selectedChoiceLabel}.`
    : null;
  const correctChoiceLabel = readRuntimeStringFact(testContext, 'correctChoiceLabel');
  if (!correctChoiceLabel && !selectedChoiceLine) {
    return null;
  }
  const correctChoiceText = readRuntimeStringFact(testContext, 'correctChoiceText');
  const correctChoiceLine = !correctChoiceLabel
    ? null
    : correctChoiceText
      ? `Poprawna odpowiedź: ${correctChoiceLabel} - ${correctChoiceText}.`
      : `Poprawna odpowiedź: ${correctChoiceLabel}.`;

  return [selectedChoiceLine, correctChoiceLine].filter(Boolean).join(' ') || null;
};

const buildTestQuestionOverlay = (
  testContext: ContextRuntimeDocument | null | undefined
): string | null => {
  const questionPointValue = readRuntimeNumberFact(testContext, 'questionPointValue');
  const questionChoicesSummary = readRuntimeStringFact(testContext, 'questionChoicesSummary');
  const selectedChoiceLabel = readRuntimeStringFact(testContext, 'selectedChoiceLabel');
  const selectedChoiceText = readRuntimeStringFact(testContext, 'selectedChoiceText');
  const lines = [
    questionPointValue !== null ? `To pytanie jest warte ${questionPointValue} pkt.` : null,
    questionChoicesSummary,
    selectedChoiceLabel
      ? selectedChoiceText
        ? `Aktualnie zaznaczona odpowiedź: ${selectedChoiceLabel} - ${selectedChoiceText}.`
        : `Aktualnie zaznaczona odpowiedź: ${selectedChoiceLabel}.`
      : null,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join('\n\n') : null;
};

const buildTestSelectionOverlay = (
  testContext: ContextRuntimeDocument | null | undefined
): string | null => {
  const selectedChoiceLabel = readRuntimeStringFact(testContext, 'selectedChoiceLabel');
  const selectedChoiceText = readRuntimeStringFact(testContext, 'selectedChoiceText');
  if (!selectedChoiceLabel) {
    return null;
  }

  return selectedChoiceText
    ? `Aktualnie zaznaczona odpowiedź: ${selectedChoiceLabel} - ${selectedChoiceText}.`
    : `Aktualnie zaznaczona odpowiedź: ${selectedChoiceLabel}.`;
};

const normalizeSectionExplainLabel = (value: string | null | undefined): string =>
  typeof value === 'string'
    ? value
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

const buildSectionRuntimeOverlay = (input: {
  sectionKnowledgeBundle: KangurAiTutorSectionKnowledgeBundle;
  context: KangurAiTutorConversationContext | undefined;
  runtimeDocuments: ReturnType<typeof resolveKangurAiTutorRuntimeDocuments>;
}): string | null => {
  const section = input.sectionKnowledgeBundle.section;
  const focusKind = input.context?.focusKind ?? section.focusKind ?? null;
  const learnerSummary = readRuntimeStringFact(
    input.runtimeDocuments.learnerSnapshot,
    'learnerSummary'
  );
  const loginActivitySummary = readRuntimeStringFact(
    input.runtimeDocuments.loginActivity,
    'recentLoginActivitySummary'
  );
  const masterySummary =
    readRuntimeStringFact(input.runtimeDocuments.surfaceContext, 'masterySummary') ??
    readContextString(input.context?.masterySummary);
  const assignmentSummary =
    readRuntimeStringFact(input.runtimeDocuments.assignmentContext, 'assignmentSummary') ??
    readRuntimeStringFact(input.runtimeDocuments.surfaceContext, 'assignmentSummary') ??
    readContextString(input.context?.assignmentSummary);
  const currentQuestion =
    readRuntimeStringFact(input.runtimeDocuments.surfaceContext, 'currentQuestion') ??
    readContextString(input.context?.currentQuestion);
  const questionProgressLabel =
    readRuntimeStringFact(input.runtimeDocuments.surfaceContext, 'questionProgressLabel') ??
    readContextString(input.context?.questionProgressLabel);
  const revealedExplanation = readRuntimeStringFact(
    input.runtimeDocuments.surfaceContext,
    'revealedExplanation'
  );
  const topRecommendationOverlay = buildTopRecommendationOverlay(
    input.runtimeDocuments.learnerSnapshot
  );
  const recentSessionOverlay = buildRecentSessionOverlay(input.runtimeDocuments.learnerSnapshot);
  const operationPerformanceOverlay = buildOperationPerformanceOverlay(
    input.runtimeDocuments.learnerSnapshot
  );
  const lessonDocumentOverlay = buildLessonDocumentOverlay(input.runtimeDocuments.surfaceContext);
  const lessonNavigationOverlay = buildLessonNavigationOverlay(
    input.runtimeDocuments.surfaceContext
  );
  const testResultOverlay = buildTestResultOverlay(input.runtimeDocuments.surfaceContext);
  const testReviewOverlay = buildTestReviewOverlay(input.runtimeDocuments.surfaceContext);
  const testQuestionOverlay = buildTestQuestionOverlay(input.runtimeDocuments.surfaceContext);
  const testSelectionOverlay = buildTestSelectionOverlay(input.runtimeDocuments.surfaceContext);

  const lines: string[] = [];
  const shouldIncludeLearnerSummary =
    section.pageKey === 'LearnerProfile' ||
    section.pageKey === 'ParentDashboard' ||
    focusKind === 'progress' ||
    section.id.includes('progress');
  const shouldIncludeAssignmentSummary =
    focusKind === 'assignment' ||
    focusKind === 'priority_assignments' ||
    section.id.includes('assignment') ||
    (section.pageKey === 'Lessons' && focusKind === 'lesson_header');
  const shouldIncludeMasterySummary =
    focusKind === 'progress' ||
    section.id.includes('progress') ||
    section.pageKey === 'LearnerProfile' ||
    section.pageKey === 'Lessons';
  const shouldIncludeQuestionContext =
    focusKind === 'question' ||
    focusKind === 'review' ||
    focusKind === 'summary' ||
    focusKind === 'selection';
  const shouldIncludeLoginActivity =
    input.context?.surface === 'auth' ||
    section.pageKey === 'Login' ||
    focusKind === 'login_form' ||
    focusKind === 'login_identifier_field';
  const shouldIncludeTopRecommendation =
    (section.pageKey === 'LearnerProfile' || section.pageKey === 'ParentDashboard') &&
    (focusKind === 'hero' ||
      focusKind === 'progress' ||
      focusKind === 'assignment' ||
      focusKind === 'summary' ||
      section.id.includes('recommendation'));
  const shouldIncludeRecentSession =
    (section.pageKey === 'LearnerProfile' || section.pageKey === 'ParentDashboard') &&
    (focusKind === 'summary' ||
      section.id.includes('performance') ||
      section.id.includes('scores') ||
      section.id.includes('sessions'));
  const shouldIncludeOperationPerformance =
    section.pageKey === 'LearnerProfile' &&
    (focusKind === 'summary' || section.id.includes('performance'));
  const shouldIncludeLessonDocument =
    section.pageKey === 'Lessons' &&
    (focusKind === 'document' ||
      focusKind === 'lesson_header' ||
      section.id.includes('document'));
  const shouldIncludeLessonNavigation =
    section.pageKey === 'Lessons' &&
    (focusKind === 'navigation' || section.id.includes('navigation'));
  const shouldIncludeTestResult =
    section.pageKey === 'Tests' && (focusKind === 'summary' || section.id.includes('summary'));
  const shouldIncludeTestReview = section.pageKey === 'Tests' && focusKind === 'review';
  const shouldIncludeTestQuestion = section.pageKey === 'Tests' && focusKind === 'question';
  const shouldIncludeTestSelection = section.pageKey === 'Tests' && focusKind === 'selection';

  if (shouldIncludeLearnerSummary && learnerSummary) {
    lines.push(`Na żywo dla tego ucznia: ${learnerSummary}`);
  }
  if (shouldIncludeTopRecommendation && topRecommendationOverlay) {
    lines.push(topRecommendationOverlay);
  }
  if (shouldIncludeRecentSession && recentSessionOverlay) {
    lines.push(recentSessionOverlay);
  }
  if (shouldIncludeOperationPerformance && operationPerformanceOverlay) {
    lines.push(operationPerformanceOverlay);
  }
  if (shouldIncludeLessonDocument && lessonDocumentOverlay) {
    lines.push(lessonDocumentOverlay);
  }
  if (shouldIncludeLessonNavigation && lessonNavigationOverlay) {
    lines.push(lessonNavigationOverlay);
  }
  if (shouldIncludeTestResult && testResultOverlay) {
    lines.push(testResultOverlay);
  }
  if (shouldIncludeTestReview && testReviewOverlay) {
    lines.push(testReviewOverlay);
  }
  if (shouldIncludeMasterySummary && masterySummary) {
    lines.push(`Aktualny obraz opanowania: ${masterySummary}`);
  }
  if (shouldIncludeAssignmentSummary && assignmentSummary) {
    lines.push(`Aktywny priorytet: ${assignmentSummary}`);
  }
  if (shouldIncludeQuestionContext && currentQuestion) {
    lines.push(
      questionProgressLabel
        ? `${questionProgressLabel}: ${currentQuestion}`
        : `Biezace pytanie: ${currentQuestion}`
    );
  } else if (shouldIncludeQuestionContext && questionProgressLabel) {
    lines.push(`Aktualny stan tej sekcji: ${questionProgressLabel}.`);
  }
  if (shouldIncludeTestQuestion && testQuestionOverlay) {
    lines.push(testQuestionOverlay);
  }
  if (shouldIncludeTestSelection && testSelectionOverlay) {
    lines.push(testSelectionOverlay);
  }
  if (focusKind === 'review' && revealedExplanation) {
    lines.push(`Po pokazaniu odpowiedzi: ${revealedExplanation}`);
  }
  if (shouldIncludeLoginActivity && loginActivitySummary) {
    lines.push(`Ostatnia aktywnosc logowania: ${loginActivitySummary}`);
  }

  const uniqueLines = [...new Set(lines.filter(Boolean))];
  return uniqueLines.length > 0 ? uniqueLines.join('\n\n') : null;
};

export const buildSectionExplainMessage = (input: {
  sectionKnowledgeBundle: KangurAiTutorSectionKnowledgeBundle;
  context: KangurAiTutorConversationContext | undefined;
  runtimeDocuments: ReturnType<typeof resolveKangurAiTutorRuntimeDocuments>;
}): string => {
  const section = input.sectionKnowledgeBundle.section;
  const fragment = input.sectionKnowledgeBundle.fragment ?? null;
  const scopedLabel =
    readContextString(input.context?.focusLabel) ?? readContextString(input.context?.title);
  const titleLine =
    scopedLabel &&
    normalizeSectionExplainLabel(scopedLabel) !== normalizeSectionExplainLabel(section.title)
      ? `${section.title}: ${scopedLabel}.`
      : `${section.title}.`;
  const followUpLine =
    input.sectionKnowledgeBundle.followUpActions.length > 0
      ? `Jeśli chcesz przejść dalej, wybierz: ${input.sectionKnowledgeBundle.followUpActions
        .map((action) => action.label)
        .join(', ')}.`
      : null;
  const runtimeOverlay = buildSectionRuntimeOverlay(input);
  const selectedFragmentLabel =
    readContextString(input.context?.selectedText) ?? fragment?.text ?? null;
  const lessonDocumentSelectedSnippet =
    !fragment && selectedFragmentLabel
      ? resolveLessonDocumentSelectedTextSnippet({
        lessonContext: input.runtimeDocuments.surfaceContext,
        selectedText: selectedFragmentLabel,
      })
      : null;

  if (fragment) {
    const fragmentLine = selectedFragmentLabel
      ? `Zaznaczony fragment: "${selectedFragmentLabel}".`
      : null;

    return [...new Set([titleLine, fragmentLine, fragment.explanation, runtimeOverlay, followUpLine].filter(Boolean))]
      .join('\n\n')
      .trim();
  }

  if (lessonDocumentSelectedSnippet) {
    const fragmentLine = selectedFragmentLabel
      ? `Zaznaczony fragment: "${selectedFragmentLabel}".`
      : null;
    const snippetExplanation =
      lessonDocumentSelectedSnippet.explanation ??
      `W aktualnej treści lekcji ten fragment dotyczy: ${lessonDocumentSelectedSnippet.text}.`;

    return [...new Set([titleLine, fragmentLine, snippetExplanation, runtimeOverlay, followUpLine].filter(Boolean))]
      .join('\n\n')
      .trim();
  }

  return [...new Set([titleLine, section.summary, section.body, runtimeOverlay, followUpLine].filter(Boolean))]
    .join('\n\n')
    .trim();
};
