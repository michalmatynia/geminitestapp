import 'server-only';

import { NextRequest, NextResponse } from 'next/server';

import { mergeContextRegistryRefs } from '@/features/ai/ai-context-registry/context/page-context-shared';
import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import { summarizeKangurAiTutorFollowUpActions } from '@/features/kangur/ai-tutor/follow-up-reporting';
import { buildKangurAiTutorContextRegistryRefs } from '@/features/kangur/context-registry/refs';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import {
  buildKangurAiTutorLearnerMood,
  resolveKangurActor,
  setKangurLearnerAiTutorState,
} from '@/features/kangur/server';
import { buildKangurAiTutorAdaptiveGuidance } from '@/features/kangur/server/ai-tutor-adaptive';
import { resolveKangurAiTutorNativeGuideResolution } from '@/features/kangur/server/ai-tutor-native-guide';
import { resolveKangurAiTutorSemanticGraphContext } from '@/features/kangur/server/knowledge-graph/retrieval';
import {
  consumeKangurAiTutorDailyUsage,
  ensureKangurAiTutorDailyUsageAvailable,
} from '@/features/kangur/server/ai-tutor-usage';
import { resolveKangurAiTutorRuntimeDocuments } from '@/features/kangur/server/context-registry';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  parseKangurAiTutorSettings,
  getKangurAiTutorSettingsForLearner,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  resolveKangurAiTutorAvailability,
  resolveKangurAiTutorAppSettings,
  type KangurAiTutorAvailabilityReason,
} from '@/features/kangur/settings-ai-tutor';
import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import {
  kangurAiTutorChatRequestSchema,
  type KangurAiTutorChatResponse,
  type KangurAiTutorCoachingMode,
  type KangurAiTutorConversationContext,
} from '@/shared/contracts/kangur-ai-tutor';
import { createDefaultKangurAiTutorLearnerMood } from '@/shared/contracts/kangur-ai-tutor-mood';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, isAppError } from '@/shared/errors/app-error';
import {
  resolveBrainExecutionConfigForCapability,
  readStoredSettingValue,
} from '@/shared/lib/ai-brain/server';
import {
  runBrainChatCompletion,
  type BrainChatMessage,
} from '@/shared/lib/ai-brain/server-runtime-client';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

import {
  SOCRATIC_CONSTRAINT,
  buildContextInstructions,
  buildLearnerMemoryInstructions,
  buildParentPreferenceInstructions,
} from './build-system-prompt';
import {
  analyzeLearnerDrawingWithBrain,
  buildTutorDrawingInstructions,
  extractTutorDrawingArtifactsFromResponse,
  shouldEnableTutorDrawingSupport,
} from './drawing';
import {
  buildPersonaChatMemoryContext,
  persistAgentPersonaExchangeMemory,
  resolveKangurPersonaSessionId,
  resolvePersonaInstructions,
} from './persona';
import {
  resolveKangurAiTutorSectionKnowledgeBundle,
  type KangurAiTutorSectionKnowledgeBundle,
} from './section-knowledge';
import {
  buildKangurTutorResponseSources,
  buildKnowledgeGraphResponseSummary,
  mergeFollowUpActions,
} from './sources';

const AVAILABILITY_ERROR_MESSAGES: Record<KangurAiTutorAvailabilityReason, string> = {
  disabled: 'AI tutor is not enabled for this learner.',
  email_unverified: 'Verify your parent email to unlock AI Tutor.',
  missing_context: 'AI tutor context is required for Kangur tutoring sessions.',
  lessons_disabled: 'AI tutor is disabled for lessons for this learner.',
  games_disabled: 'AI tutor is disabled for games for this learner.',
  tests_disabled: 'AI tutor is disabled for tests for this learner.',
  review_after_answer_only:
    'AI tutor is available in tests only after the answer has been revealed.',
};
const KANGUR_AI_TUTOR_BRAIN_CAPABILITY = 'kangur_ai_tutor.chat';

const readContextString = (value: string | null | undefined): string | null =>
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
    `Najlepszy nastepny krok: ${title}.`,
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

  return `Z tresci tej lekcji teraz: ${truncateOverlayText(documentSummary, 280)}`;
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
      ? `Wybrana odpowiedz: ${selectedChoiceLabel} - ${selectedChoiceText}.`
      : `Wybrana odpowiedz: ${selectedChoiceLabel}.`
    : null;
  const correctChoiceLabel = readRuntimeStringFact(testContext, 'correctChoiceLabel');
  if (!correctChoiceLabel && !selectedChoiceLine) {
    return null;
  }
  const correctChoiceText = readRuntimeStringFact(testContext, 'correctChoiceText');
  const correctChoiceLine = !correctChoiceLabel
    ? null
    : correctChoiceText
      ? `Poprawna odpowiedz: ${correctChoiceLabel} - ${correctChoiceText}.`
      : `Poprawna odpowiedz: ${correctChoiceLabel}.`;

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
        ? `Aktualnie zaznaczona odpowiedz: ${selectedChoiceLabel} - ${selectedChoiceText}.`
        : `Aktualnie zaznaczona odpowiedz: ${selectedChoiceLabel}.`
      : null,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join('\n\n') : null;
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
    focusKind === 'question' || focusKind === 'review' || focusKind === 'summary';
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

  if (shouldIncludeLearnerSummary && learnerSummary) {
    lines.push(`Na zywo dla tego ucznia: ${learnerSummary}`);
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
  if (focusKind === 'review' && revealedExplanation) {
    lines.push(`Po pokazaniu odpowiedzi: ${revealedExplanation}`);
  }
  if (shouldIncludeLoginActivity && loginActivitySummary) {
    lines.push(`Ostatnia aktywnosc logowania: ${loginActivitySummary}`);
  }

  const uniqueLines = [...new Set(lines.filter(Boolean))];
  return uniqueLines.length > 0 ? uniqueLines.join('\n\n') : null;
};

const buildSectionExplainMessage = (input: {
  sectionKnowledgeBundle: KangurAiTutorSectionKnowledgeBundle;
  context: KangurAiTutorConversationContext | undefined;
  runtimeDocuments: ReturnType<typeof resolveKangurAiTutorRuntimeDocuments>;
}): string => {
  const section = input.sectionKnowledgeBundle.section;
  const scopedLabel =
    readContextString(input.context?.focusLabel) ?? readContextString(input.context?.title);
  const titleLine =
    scopedLabel &&
    normalizeSectionExplainLabel(scopedLabel) !== normalizeSectionExplainLabel(section.title)
      ? `${section.title}: ${scopedLabel}.`
      : `${section.title}.`;
  const followUpLine =
    input.sectionKnowledgeBundle.followUpActions.length > 0
      ? `Jesli chcesz przejsc dalej, wybierz: ${input.sectionKnowledgeBundle.followUpActions
        .map((action) => action.label)
        .join(', ')}.`
      : null;
  const runtimeOverlay = buildSectionRuntimeOverlay(input);

  return [...new Set([titleLine, section.summary, section.body, runtimeOverlay, followUpLine].filter(Boolean))]
    .join('\n\n')
    .trim();
};

const persistTutorMoodState = async (input: {
  learnerId: string;
  tutorMood: ReturnType<typeof createDefaultKangurAiTutorLearnerMood>;
  actor: Awaited<ReturnType<typeof resolveKangurActor>>;
  context: KangurAiTutorConversationContext | undefined;
  req: NextRequest;
  ctx: ApiHandlerContext;
}): Promise<void> => {
  try {
    await setKangurLearnerAiTutorState(input.learnerId, input.tutorMood);
  } catch (error) {
    await logKangurServerEvent({
      source: 'kangur.ai-tutor.chat.mood-persist-failed',
      service: 'kangur.ai-tutor',
      message: 'Failed to persist learner-specific Kangur tutor mood.',
      level: 'warn',
      request: input.req,
      requestContext: input.ctx,
      actor: input.actor,
      error,
      statusCode: 500,
      context: {
        learnerId: input.learnerId,
        tutorMoodId: input.tutorMood.currentMoodId,
        tutorBaselineMoodId: input.tutorMood.baselineMoodId,
        tutorMoodReasonCode: input.tutorMood.lastReasonCode,
        surface: input.context?.surface ?? null,
        contentId: input.context?.contentId ?? null,
      },
      });
  }
};

export async function postKangurAiTutorChatHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveKangurActor(req);
  const learnerId = actor.activeLearner.id;

  const parsed = await parseJsonBody(req, kangurAiTutorChatRequestSchema, {
    logPrefix: 'kangur.ai-tutor.chat.POST',
  });
  if (!parsed.ok) return parsed.response;

  const { messages, context, contextRegistry, memory } = parsed.data;
  const resolvedPromptMode = context?.promptMode ?? 'chat';
  const learnerDrawingImageData = readContextString(context?.drawingImageData);
  const requestedContextRegistryRefs = mergeContextRegistryRefs(
    context
      ? buildKangurAiTutorContextRegistryRefs({
        learnerId,
        context,
      })
      : [],
    contextRegistry?.refs ?? []
  );

  const rawSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const settingsStore = parseKangurAiTutorSettings(rawSettings);
  const rawAppSettings = await readStoredSettingValue(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const appSettings = resolveKangurAiTutorAppSettings(rawAppSettings, settingsStore);
  const tutorSettings = getKangurAiTutorSettingsForLearner(settingsStore, learnerId, appSettings);
  const sessionId = `kangur-ai-tutor:${learnerId}`;
  const baseTimestamp = new Date().toISOString();
  const chatMessages: ChatMessage[] = messages.map((message, index) => ({
    id: `${sessionId}:message:${index}`,
    sessionId,
    role: message.role,
    content:
      message.artifacts?.some((artifact) => artifact.type === 'user_drawing')
        ? `${message.content}\n\n[The learner attached a drawing to this message.]`
        : message.content,
    timestamp: baseTimestamp,
  }));
  let adaptiveGuidanceApplied = false;
  let adaptiveCoachingMode: KangurAiTutorCoachingMode | null = null;
  let knowledgeGraphApplied = false;
  let knowledgeGraphQueryStatus: 'hit' | 'miss' | 'skipped' | 'disabled' = 'skipped';
  let knowledgeGraphQueryMode: 'website_help' | 'semantic' | null = null;
  let knowledgeGraphRecallStrategy: 'metadata_only' | 'vector_only' | 'hybrid_vector' | null =
    null;
  let knowledgeGraphLexicalHitCount = 0;
  let knowledgeGraphVectorHitCount = 0;
  let knowledgeGraphVectorRecallAttempted = false;
  let websiteHelpGraphApplied = false;
  const latestUserMessage =
    [...messages].reverse().find((message) => message.role === 'user')?.content ?? null;
  const drawingSupportEnabled = shouldEnableTutorDrawingSupport({
    context,
    latestUserMessage,
    messages,
  });

  try {
    const availability = resolveKangurAiTutorAvailability(tutorSettings, context);
    const emailAwareAvailability = availability.allowed
      ? resolveKangurAiTutorAvailability(tutorSettings, context, {
        ownerEmailVerified: actor.ownerEmailVerified,
      })
      : availability;
    if (!emailAwareAvailability.allowed) {
      throw badRequestError(AVAILABILITY_ERROR_MESSAGES[emailAwareAvailability.reason], {
        reason: emailAwareAvailability.reason,
      });
    }

    if (
      !tutorSettings.allowSelectedTextSupport &&
      (context?.promptMode === 'selected_text' || Boolean(context?.selectedText?.trim()))
    ) {
      throw badRequestError('Selected-text tutor help is disabled for this learner.');
    }

    await ensureKangurAiTutorDailyUsageAvailable({
      learnerId,
      dailyMessageLimit: tutorSettings.dailyMessageLimit,
    });
    const contextRegistryBundle = requestedContextRegistryRefs.length > 0
      ? await contextRegistryEngine.resolveRefs({
        refs: requestedContextRegistryRefs,
        maxNodes: 24,
        depth: 1,
      })
      : null;
    const resolvedRuntimeDocuments = resolveKangurAiTutorRuntimeDocuments(contextRegistryBundle, context);

    const personaInstructions = await resolvePersonaInstructions(tutorSettings.agentPersonaId);
    const systemParts: string[] = [SOCRATIC_CONSTRAINT];
    if (personaInstructions) systemParts.push(personaInstructions);
    let personaMemorySessionId: string | null = null;
    let suggestedPersonaMoodId: AgentPersonaMoodId | null = null;
    if (tutorSettings.agentPersonaId) {
      try {
        const personaContext = await buildPersonaChatMemoryContext({
          personaId: tutorSettings.agentPersonaId,
          latestUserMessage,
        });
        if (personaContext.systemPrompt) {
          systemParts.push(personaContext.systemPrompt);
        }
        suggestedPersonaMoodId = personaContext.suggestedMoodId ?? null;
        personaMemorySessionId = await resolveKangurPersonaSessionId({
          learnerId,
          personaId: tutorSettings.agentPersonaId,
          personaName: personaContext.persona.name ?? null,
        });
      } catch (error) {
        await logKangurServerEvent({
          source: 'kangur.ai-tutor.chat.persona-memory.failed',
          service: 'kangur.ai-tutor',
          message: 'Failed to resolve Kangur tutor persona memory context.',
          level: 'warn',
          request: req,
          requestContext: ctx,
          actor,
          error,
          statusCode: 500,
          context: {
            learnerId,
            personaId: tutorSettings.agentPersonaId,
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
          },
        });
      }
    }
    let tutorMood = actor.activeLearner.aiTutor ?? createDefaultKangurAiTutorLearnerMood();
    try {
      tutorMood = await buildKangurAiTutorLearnerMood({
        learnerId,
        context,
        messages,
        latestUserMessage,
        personaSuggestedMoodId: suggestedPersonaMoodId,
        previousMood: actor.activeLearner.aiTutor ?? null,
      });
    } catch (error) {
      await logKangurServerEvent({
        source: 'kangur.ai-tutor.chat.mood-build-failed',
        service: 'kangur.ai-tutor',
        message: 'Failed to resolve learner-specific Kangur tutor mood.',
        level: 'warn',
        request: req,
        requestContext: ctx,
        actor,
        error,
        statusCode: 500,
        context: {
          learnerId,
          surface: context?.surface ?? null,
          contentId: context?.contentId ?? null,
          previousTutorMoodId: actor.activeLearner.aiTutor?.currentMoodId ?? null,
        },
      });
    }
    systemParts.push(
      [
        `Learner-specific tutor mood: ${tutorMood.currentMoodId}.`,
        `Baseline learner mood: ${tutorMood.baselineMoodId}.`,
        'Match this tone in your wording, but keep the answer concise and age-appropriate.',
      ].join(' ')
    );
    let learnerDrawingAnalysis: string | null = null;
    if (learnerDrawingImageData) {
      try {
        learnerDrawingAnalysis = await analyzeLearnerDrawingWithBrain({
          drawingImageData: learnerDrawingImageData,
          context,
          latestUserMessage,
        });
      } catch (error) {
        await logKangurServerEvent({
          source: 'kangur.ai-tutor.chat.drawing-analysis.failed',
          service: 'kangur.ai-tutor',
          message: 'Failed to analyze the learner drawing for Kangur AI tutor.',
          level: 'warn',
          request: req,
          requestContext: ctx,
          actor,
          error,
          statusCode: 500,
          context: {
            learnerId,
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
            promptMode: resolvedPromptMode,
          },
        });
      }
    }
    if (learnerDrawingAnalysis) {
      systemParts.push(
        [
          'Learner drawing analysis summary:',
          learnerDrawingAnalysis,
          'Use this as an inference from the attached sketch. If the sketch seems ambiguous, say so briefly instead of overstating certainty.',
        ].join('\n')
      );
    }
    if (drawingSupportEnabled) {
      systemParts.push(buildTutorDrawingInstructions());
    }
    const sectionKnowledgeBundle =
      !learnerDrawingImageData &&
      context?.interactionIntent === 'explain' &&
      context?.knowledgeReference?.sourceCollection === 'kangur_page_content'
        ? await resolveKangurAiTutorSectionKnowledgeBundle({
          latestUserMessage,
          context,
          locale: 'pl',
        })
        : null;

    if (sectionKnowledgeBundle) {
      const sectionExplainResponse = extractTutorDrawingArtifactsFromResponse(
        buildSectionExplainMessage({
          sectionKnowledgeBundle,
          context,
          runtimeDocuments: resolvedRuntimeDocuments,
        })
      );
      const usage = await consumeKangurAiTutorDailyUsage({
        learnerId,
        dailyMessageLimit: tutorSettings.dailyMessageLimit,
      });
      const resolvedSources = buildKangurTutorResponseSources({
        ...resolvedRuntimeDocuments,
        extraSources: sectionKnowledgeBundle.sources,
      });
      const responseSources = tutorSettings.showSources ? resolvedSources : [];

      await persistTutorMoodState({
        learnerId,
        tutorMood,
        actor,
        context,
        req,
        ctx,
      });

      await logKangurServerEvent({
        source: 'kangur.ai-tutor.chat.page-content.completed',
        service: 'kangur.ai-tutor',
        message: 'Kangur AI tutor answered from canonical page-content knowledge.',
        request: req,
        requestContext: ctx,
        actor,
        statusCode: 200,
        context: {
          surface: context?.surface ?? null,
          contentId: context?.contentId ?? null,
          promptMode: resolvedPromptMode,
          focusKind: context?.focusKind ?? null,
          interactionIntent: context?.interactionIntent ?? null,
          pageContentEntryId: sectionKnowledgeBundle.section.id,
          linkedNativeGuideIds: sectionKnowledgeBundle.linkedNativeGuides.map((entry) => entry.id),
          retrievedSourceCount: resolvedSources.length,
          returnedSourceCount: responseSources.length,
          followUpActionCount: sectionKnowledgeBundle.followUpActions.length,
          showSources: tutorSettings.showSources,
          allowSelectedTextSupport: tutorSettings.allowSelectedTextSupport,
          allowLessons: tutorSettings.allowLessons,
          allowGames: tutorSettings.allowGames,
          testAccessMode: tutorSettings.testAccessMode,
          hintDepth: tutorSettings.hintDepth,
          proactiveNudges: tutorSettings.proactiveNudges,
          rememberTutorContext: tutorSettings.rememberTutorContext,
          tutorMoodId: tutorMood.currentMoodId,
          tutorBaselineMoodId: tutorMood.baselineMoodId,
          tutorMoodReasonCode: tutorMood.lastReasonCode,
          tutorMoodConfidence: tutorMood.confidence,
          knowledgeGraphApplied,
          knowledgeGraphQueryMode,
          knowledgeGraphRecallStrategy,
          knowledgeGraphLexicalHitCount,
          knowledgeGraphVectorHitCount,
          knowledgeGraphVectorRecallAttempted,
          contextRegistryRefCount: contextRegistryBundle?.refs.length ?? 0,
          contextRegistryDocumentCount: contextRegistryBundle?.documents.length ?? 0,
          dailyMessageLimit: usage.dailyMessageLimit,
          dailyUsageCount: usage.messageCount,
          dailyUsageRemaining: usage.remainingMessages,
          usageDateKey: usage.dateKey,
          messageCount: messages.length,
        },
      });

      return NextResponse.json({
        message: sectionExplainResponse.message,
        sources: responseSources,
        followUpActions: sectionKnowledgeBundle.followUpActions,
        artifacts: sectionExplainResponse.artifacts,
        answerResolutionMode: 'page_content',
        knowledgeGraph: buildKnowledgeGraphResponseSummary({
          knowledgeGraphApplied,
          knowledgeGraphQueryStatus,
          knowledgeGraphQueryMode,
          knowledgeGraphRecallStrategy,
          knowledgeGraphLexicalHitCount,
          knowledgeGraphVectorHitCount,
          knowledgeGraphVectorRecallAttempted,
          websiteHelpGraphApplied,
          websiteHelpGraphTargetNodeId: null,
        }),
        tutorMood,
        usage,
      } satisfies KangurAiTutorChatResponse);
    }
    const nativeGuideResolution = learnerDrawingImageData
      ? {
        status: 'skipped' as const,
        message: null,
        followUpActions: [],
        entryId: null,
        matchedSignals: [],
        coverageLevel: null,
      }
      : await resolveKangurAiTutorNativeGuideResolution({
        latestUserMessage,
        context,
        locale: 'pl',
      });
    const knowledgeGraphContext = await resolveKangurAiTutorSemanticGraphContext({
      latestUserMessage,
      context,
      locale: 'pl',
      runtimeDocuments: [
        resolvedRuntimeDocuments.learnerSnapshot,
        resolvedRuntimeDocuments.loginActivity,
        resolvedRuntimeDocuments.surfaceContext,
        resolvedRuntimeDocuments.assignmentContext,
      ].filter((document): document is ContextRuntimeDocument => Boolean(document)),
    });
    knowledgeGraphApplied = knowledgeGraphContext.status === 'hit';
    knowledgeGraphQueryStatus = knowledgeGraphContext.status;
    knowledgeGraphQueryMode = knowledgeGraphContext.status === 'hit'
      ? knowledgeGraphContext.queryMode
      : null;
    knowledgeGraphRecallStrategy = knowledgeGraphContext.status === 'hit'
      ? knowledgeGraphContext.recallStrategy
      : null;
    knowledgeGraphLexicalHitCount = knowledgeGraphContext.status === 'hit'
      ? knowledgeGraphContext.lexicalHitCount
      : 0;
    knowledgeGraphVectorHitCount = knowledgeGraphContext.status === 'hit'
      ? knowledgeGraphContext.vectorHitCount
      : 0;
    knowledgeGraphVectorRecallAttempted = knowledgeGraphContext.status === 'hit'
      ? knowledgeGraphContext.vectorRecallAttempted
      : false;
    websiteHelpGraphApplied = knowledgeGraphQueryMode === 'website_help';
    const knowledgeGraphNodeIds =
      knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.nodeIds : [];
    const knowledgeGraphSourceCollections =
      knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.sourceCollections : [];
    const knowledgeGraphHydrationSources =
      knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.hydrationSources : [];
    const knowledgeGraphWebsiteHelpTarget =
      knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.websiteHelpTarget ?? null : null;
    const knowledgeGraphWebsiteHelpTargetNodeId =
      knowledgeGraphWebsiteHelpTarget?.nodeId ?? null;
    const knowledgeGraphWebsiteHelpTargetRoute =
      knowledgeGraphWebsiteHelpTarget?.route ?? null;
    const knowledgeGraphWebsiteHelpTargetAnchorId =
      knowledgeGraphWebsiteHelpTarget?.anchorId ?? null;
    const knowledgeGraphFollowUpActions =
      knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.graphFollowUpActions : [];

    // Telemetry helpers — capture the resolved KG/settings state once so each
    // log callsite can spread them instead of repeating 15+ fields verbatim.
    const buildKgTelemetry = () => ({
      knowledgeGraphApplied,
      knowledgeGraphQueryMode,
      knowledgeGraphRecallStrategy,
      knowledgeGraphLexicalHitCount,
      knowledgeGraphVectorHitCount,
      knowledgeGraphVectorRecallAttempted,
      knowledgeGraphNodeIds,
      knowledgeGraphSourceCollections,
      knowledgeGraphHydrationSources,
      websiteHelpGraphApplied,
      websiteHelpGraphNodeIds: websiteHelpGraphApplied ? knowledgeGraphNodeIds : [],
      websiteHelpGraphSourceCollections: websiteHelpGraphApplied ? knowledgeGraphSourceCollections : [],
      websiteHelpGraphHydrationSources: websiteHelpGraphApplied ? knowledgeGraphHydrationSources : [],
      websiteHelpGraphTargetNodeId: websiteHelpGraphApplied ? knowledgeGraphWebsiteHelpTargetNodeId : null,
      websiteHelpGraphTargetRoute: websiteHelpGraphApplied ? knowledgeGraphWebsiteHelpTargetRoute : null,
      websiteHelpGraphTargetAnchorId: websiteHelpGraphApplied ? knowledgeGraphWebsiteHelpTargetAnchorId : null,
    });
    const buildSettingsTelemetry = () => ({
      showSources: tutorSettings.showSources,
      allowSelectedTextSupport: tutorSettings.allowSelectedTextSupport,
      allowLessons: tutorSettings.allowLessons,
      allowGames: tutorSettings.allowGames,
      testAccessMode: tutorSettings.testAccessMode,
      hintDepth: tutorSettings.hintDepth,
      proactiveNudges: tutorSettings.proactiveNudges,
      rememberTutorContext: tutorSettings.rememberTutorContext,
    });
    const buildMoodTelemetry = () => ({
      tutorMoodId: tutorMood.currentMoodId,
      tutorBaselineMoodId: tutorMood.baselineMoodId,
      tutorMoodReasonCode: tutorMood.lastReasonCode,
      tutorMoodConfidence: tutorMood.confidence,
    });

    if (nativeGuideResolution.status === 'hit') {
      const nativeGuideResponse = extractTutorDrawingArtifactsFromResponse(
        nativeGuideResolution.message
      );
      const usage = await consumeKangurAiTutorDailyUsage({
        learnerId,
        dailyMessageLimit: tutorSettings.dailyMessageLimit,
      });
      const resolvedSources = buildKangurTutorResponseSources({
        ...resolvedRuntimeDocuments,
        extraSources: knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.sources : [],
      });
      const responseSources = tutorSettings.showSources ? resolvedSources : [];

      await persistTutorMoodState({
        learnerId,
        tutorMood,
        actor,
        context,
        req,
        ctx,
      });

      if (nativeGuideResolution.coverageLevel === 'overview_fallback') {
        await logKangurServerEvent({
          source: 'kangur.ai-tutor.chat.native-guide.coverage-gap',
          service: 'kangur.ai-tutor',
          message:
            'Kangur AI tutor used a generic overview entry for a section-specific request.',
          level: 'warn',
          request: req,
          requestContext: ctx,
          actor,
          statusCode: 200,
          context: {
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
            title: context?.title ?? null,
            focusKind: context?.focusKind ?? null,
            focusId: context?.focusId ?? null,
            assignmentId: context?.assignmentId ?? null,
            questionId: context?.questionId ?? null,
            promptMode: resolvedPromptMode,
            interactionIntent: context?.interactionIntent ?? null,
            nativeGuideApplied: true,
            nativeGuideCoverageLevel: nativeGuideResolution.coverageLevel,
            nativeGuideEntryId: nativeGuideResolution.entryId,
            nativeGuideMatchSignals: nativeGuideResolution.matchedSignals,
            ...buildKgTelemetry(),
          },
        });
      }

      await logKangurServerEvent({
        source: 'kangur.ai-tutor.chat.native-guide.completed',
        service: 'kangur.ai-tutor',
        message: 'Kangur AI tutor answered from the native guide repository.',
        request: req,
        requestContext: ctx,
        actor,
        statusCode: 200,
        context: {
          surface: context?.surface ?? null,
          contentId: context?.contentId ?? null,
          promptMode: resolvedPromptMode,
          focusKind: context?.focusKind ?? null,
          interactionIntent: context?.interactionIntent ?? null,
          retrievedSourceCount: resolvedSources.length,
          returnedSourceCount: responseSources.length,
          ...buildSettingsTelemetry(),
          nativeGuideApplied: true,
          nativeGuideCoverageLevel: nativeGuideResolution.coverageLevel,
          nativeGuideEntryId: nativeGuideResolution.entryId,
          nativeGuideMatchSignals: nativeGuideResolution.matchedSignals,
          ...buildKgTelemetry(),
          contextRegistryRefCount: contextRegistryBundle?.refs.length ?? 0,
          contextRegistryDocumentCount: contextRegistryBundle?.documents.length ?? 0,
          followUpActionCount: nativeGuideResolution.followUpActions.length,
          ...buildMoodTelemetry(),
          dailyMessageLimit: usage.dailyMessageLimit,
          dailyUsageCount: usage.messageCount,
          dailyUsageRemaining: usage.remainingMessages,
          usageDateKey: usage.dateKey,
          messageCount: messages.length,
        },
      });

      return NextResponse.json({
        message: nativeGuideResponse.message,
        sources: responseSources,
        followUpActions: mergeFollowUpActions(
          nativeGuideResolution.followUpActions,
          knowledgeGraphFollowUpActions
        ),
        artifacts: nativeGuideResponse.artifacts,
        answerResolutionMode: 'native_guide',
        knowledgeGraph: buildKnowledgeGraphResponseSummary({
          knowledgeGraphApplied,
          knowledgeGraphQueryStatus,
          knowledgeGraphQueryMode,
          knowledgeGraphRecallStrategy,
          knowledgeGraphLexicalHitCount,
          knowledgeGraphVectorHitCount,
          knowledgeGraphVectorRecallAttempted,
          websiteHelpGraphApplied,
          websiteHelpGraphTargetNodeId: knowledgeGraphWebsiteHelpTargetNodeId,
        }),
        ...(knowledgeGraphContext.status === 'hit' && knowledgeGraphContext.websiteHelpTarget
          ? { websiteHelpTarget: knowledgeGraphContext.websiteHelpTarget }
          : {}),
        tutorMood,
        usage,
      } satisfies KangurAiTutorChatResponse);
    }
    if (nativeGuideResolution.status === 'miss') {
      await logKangurServerEvent({
        source: 'kangur.ai-tutor.chat.native-guide.missing',
        service: 'kangur.ai-tutor',
        message: 'Kangur AI tutor did not find a native guide entry for an eligible request.',
        level: 'warn',
        request: req,
        requestContext: ctx,
        actor,
        statusCode: 200,
        context: {
          surface: context?.surface ?? null,
          contentId: context?.contentId ?? null,
          title: context?.title ?? null,
          focusKind: context?.focusKind ?? null,
          focusId: context?.focusId ?? null,
          assignmentId: context?.assignmentId ?? null,
          questionId: context?.questionId ?? null,
          promptMode: resolvedPromptMode,
          interactionIntent: context?.interactionIntent ?? null,
          nativeGuideApplied: false,
          ...buildKgTelemetry(),
        },
      });
    }
    const contextInstructions = buildContextInstructions({
      context,
      registryBundle: contextRegistryBundle,
      options: {
        testAccessMode: tutorSettings.testAccessMode,
      },
    });
    if (contextInstructions) systemParts.push(contextInstructions);
    if (knowledgeGraphContext.status === 'hit') {
      systemParts.push(knowledgeGraphContext.instructions);
    }
    if (knowledgeGraphWebsiteHelpTarget) {
      systemParts.push(
        [
          `You have a resolved navigation target for this query: "${knowledgeGraphWebsiteHelpTarget.label}".`,
          'Reference this specific page or section by name in your answer.',
          'The learner will see a navigation button below your message to go there directly.',
          'Guide them on what they will find there, not just that they should go there.',
        ].join(' ')
      );
    }
    systemParts.push(
      buildParentPreferenceInstructions({
        hintDepth: tutorSettings.hintDepth,
        proactiveNudges: tutorSettings.proactiveNudges,
        rememberTutorContext: tutorSettings.rememberTutorContext,
      })
    );
    const learnerMemoryInstructions = buildLearnerMemoryInstructions(memory);
    if (learnerMemoryInstructions) {
      systemParts.push(learnerMemoryInstructions);
    }
    const adaptiveGuidance = await buildKangurAiTutorAdaptiveGuidance({
      learnerId,
      context,
      registryBundle: contextRegistryBundle,
      memory,
    });
    const followUpReporting = summarizeKangurAiTutorFollowUpActions(
      adaptiveGuidance.followUpActions
    );
    const adaptiveInstructions = adaptiveGuidance.instructions;
    adaptiveCoachingMode = adaptiveGuidance.coachingFrame?.mode ?? null;
    if (adaptiveInstructions) {
      systemParts.push(adaptiveInstructions);
      adaptiveGuidanceApplied = true;
    }
    const systemPrompt = systemParts.join('\n\n');

    const brainConfig = await resolveBrainExecutionConfigForCapability(
      KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
      {
        defaultTemperature: 0.4,
        defaultMaxTokens: 600,
        runtimeKind: 'chat',
      }
    );

    const combinedSystemPrompt = [brainConfig.systemPrompt.trim(), systemPrompt]
      .filter(Boolean)
      .join('\n\n');

    const res = await runBrainChatCompletion({
      modelId: brainConfig.modelId,
      temperature: brainConfig.temperature,
      maxTokens: brainConfig.maxTokens,
      messages: [
        { role: 'system', content: combinedSystemPrompt },
        ...(chatMessages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
        })) as BrainChatMessage[]),
      ],
    });
    const parsedTutorResponse = extractTutorDrawingArtifactsFromResponse(res.text);
    const usage = await consumeKangurAiTutorDailyUsage({
      learnerId,
      dailyMessageLimit: tutorSettings.dailyMessageLimit,
    });
    const resolvedSources = buildKangurTutorResponseSources({
      ...resolvedRuntimeDocuments,
      extraSources: knowledgeGraphContext.status === 'hit' ? knowledgeGraphContext.sources : [],
    });
    const responseSources = tutorSettings.showSources ? resolvedSources : [];

    if (personaMemorySessionId && tutorSettings.agentPersonaId) {
      try {
        if (latestUserMessage) {
          await chatbotSessionRepository.addMessage(personaMemorySessionId, {
            role: 'user',
            content: latestUserMessage,
            metadata: {
              source: 'kangur_ai_tutor',
              learnerId,
              surface: context?.surface ?? null,
              contentId: context?.contentId ?? null,
              questionId: context?.questionId ?? null,
              promptMode: resolvedPromptMode,
              interactionIntent: context?.interactionIntent ?? null,
            },
          });
        }

        await chatbotSessionRepository.addMessage(personaMemorySessionId, {
          role: 'assistant',
          content: parsedTutorResponse.message,
          model: brainConfig.modelId,
          metadata: {
            source: 'kangur_ai_tutor',
            learnerId,
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
            questionId: context?.questionId ?? null,
            promptMode: resolvedPromptMode,
            interactionIntent: context?.interactionIntent ?? null,
            ...(suggestedPersonaMoodId ? { moodHints: [suggestedPersonaMoodId] } : {}),
            ...(suggestedPersonaMoodId ? { suggestedPersonaMoodId } : {}),
          },
        });

        await persistAgentPersonaExchangeMemory({
          personaId: tutorSettings.agentPersonaId,
          sourceType: 'chat_message',
          sourceId: `kangur:${learnerId}:${context?.surface ?? 'lesson'}:${context?.contentId ?? 'unknown'}:${Date.now()}`,
          sourceLabel:
            context?.surface === 'test'
              ? `Kangur test${context?.contentId ? ` · ${context.contentId}` : ''}`
              : context?.surface === 'game'
                ? `Kangur game${context?.contentId ? ` · ${context.contentId}` : ''}`
                : `Kangur lesson${context?.contentId ? ` · ${context.contentId}` : ''}`,
          sourceCreatedAt: new Date().toISOString(),
          sessionId: personaMemorySessionId,
          userMessage: latestUserMessage,
          assistantMessage: parsedTutorResponse.message,
          tags: [
            'kangur',
            context?.surface ?? 'lesson',
            resolvedPromptMode,
            ...(context?.interactionIntent ? [context.interactionIntent] : []),
          ],
          topicHints: [
            ...(context?.selectedText ? [context.selectedText] : []),
            ...(context?.contentId ? [context.contentId] : []),
            ...(context?.questionId ? [context.questionId] : []),
          ],
          moodHints: suggestedPersonaMoodId ? [suggestedPersonaMoodId] : [],
          metadata: {
            source: 'kangur_ai_tutor',
            learnerId,
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
            questionId: context?.questionId ?? null,
            promptMode: resolvedPromptMode,
            interactionIntent: context?.interactionIntent ?? null,
          },
        });
      } catch (error) {
        await logKangurServerEvent({
          source: 'kangur.ai-tutor.chat.persona-memory.persist-failed',
          service: 'kangur.ai-tutor',
          message: 'Failed to persist Kangur tutor chat into persona memory.',
          level: 'warn',
          request: req,
          requestContext: ctx,
          actor,
          error,
          statusCode: 500,
          context: {
            learnerId,
            personaId: tutorSettings.agentPersonaId,
            personaMemorySessionId,
            surface: context?.surface ?? null,
            contentId: context?.contentId ?? null,
          },
        });
      }
    }

    await persistTutorMoodState({
      learnerId,
      tutorMood,
      actor,
      context,
      req,
      ctx,
    });

    await logKangurServerEvent({
      source: 'kangur.ai-tutor.chat.completed',
      service: 'kangur.ai-tutor',
      message: 'Kangur AI tutor chat completed through Brain routing.',
      request: req,
      requestContext: ctx,
      actor,
      statusCode: 200,
      context: {
        surface: context?.surface ?? null,
        contentId: context?.contentId ?? null,
        promptMode: resolvedPromptMode,
        focusKind: context?.focusKind ?? null,
        interactionIntent: context?.interactionIntent ?? null,
        brainCapability: KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
        retrievedSourceCount: resolvedSources.length,
        returnedSourceCount: responseSources.length,
        ...buildSettingsTelemetry(),
        adaptiveGuidanceApplied,
        ...buildKgTelemetry(),
        contextRegistryRefCount: contextRegistryBundle?.refs.length ?? 0,
        contextRegistryDocumentCount: contextRegistryBundle?.documents.length ?? 0,
        followUpActionCount: adaptiveGuidance.followUpActions.length,
        primaryFollowUpActionId: followUpReporting.primaryFollowUpActionId,
        primaryFollowUpPage: followUpReporting.primaryFollowUpPage,
        hasBridgeFollowUpAction: followUpReporting.hasBridgeFollowUpAction,
        bridgeFollowUpActionCount: followUpReporting.bridgeFollowUpActionCount,
        bridgeFollowUpDirection: followUpReporting.bridgeFollowUpDirection,
        coachingMode: adaptiveCoachingMode,
        hasLearnerMemory: Boolean(memory),
        personaId: tutorSettings.agentPersonaId,
        suggestedPersonaMoodId,
        personaMemorySessionId,
        ...buildMoodTelemetry(),
        dailyMessageLimit: usage.dailyMessageLimit,
        dailyUsageCount: usage.messageCount,
        dailyUsageRemaining: usage.remainingMessages,
        usageDateKey: usage.dateKey,
        messageCount: messages.length,
      },
    });

    return NextResponse.json({
      message: parsedTutorResponse.message,
      sources: responseSources,
      followUpActions: mergeFollowUpActions(
        adaptiveGuidance.followUpActions,
        knowledgeGraphFollowUpActions
      ),
      artifacts: parsedTutorResponse.artifacts,
      answerResolutionMode: 'brain',
      knowledgeGraph: buildKnowledgeGraphResponseSummary({
        knowledgeGraphApplied,
        knowledgeGraphQueryStatus,
        knowledgeGraphQueryMode,
        knowledgeGraphRecallStrategy,
        knowledgeGraphLexicalHitCount,
        knowledgeGraphVectorHitCount,
        knowledgeGraphVectorRecallAttempted,
        websiteHelpGraphApplied,
        websiteHelpGraphTargetNodeId: knowledgeGraphWebsiteHelpTargetNodeId,
      }),
      ...(knowledgeGraphContext.status === 'hit' && knowledgeGraphContext.websiteHelpTarget
        ? { websiteHelpTarget: knowledgeGraphContext.websiteHelpTarget }
        : {}),
      ...(adaptiveGuidance.coachingFrame
        ? { coachingFrame: adaptiveGuidance.coachingFrame }
        : {}),
      ...(suggestedPersonaMoodId ? { suggestedMoodId: suggestedPersonaMoodId } : {}),
      tutorMood,
      usage,
    } satisfies KangurAiTutorChatResponse);
  } catch (error) {
    await logKangurServerEvent({
      source: 'kangur.ai-tutor.chat.failed',
      service: 'kangur.ai-tutor',
      message: 'Kangur AI tutor chat failed.',
      level: isAppError(error) && error.expected ? 'warn' : 'error',
      request: req,
      requestContext: ctx,
      actor,
      error,
      statusCode: isAppError(error) ? error.httpStatus : 500,
      context: {
        surface: context?.surface ?? null,
        contentId: context?.contentId ?? null,
        promptMode: resolvedPromptMode,
        focusKind: context?.focusKind ?? null,
        interactionIntent: context?.interactionIntent ?? null,
        brainCapability: KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
        showSources: tutorSettings.showSources,
        allowSelectedTextSupport: tutorSettings.allowSelectedTextSupport,
        allowLessons: tutorSettings.allowLessons,
        allowGames: tutorSettings.allowGames,
        testAccessMode: tutorSettings.testAccessMode,
        hintDepth: tutorSettings.hintDepth,
        proactiveNudges: tutorSettings.proactiveNudges,
        rememberTutorContext: tutorSettings.rememberTutorContext,
        adaptiveGuidanceApplied,
        knowledgeGraphApplied,
        knowledgeGraphQueryMode,
        knowledgeGraphRecallStrategy,
        knowledgeGraphLexicalHitCount,
        knowledgeGraphVectorHitCount,
        knowledgeGraphVectorRecallAttempted,
        websiteHelpGraphApplied,
        contextRegistryRefCount: requestedContextRegistryRefs.length,
        coachingMode: adaptiveCoachingMode,
        hasLearnerMemory: Boolean(memory),
        personaId: tutorSettings.agentPersonaId,
        dailyMessageLimit: tutorSettings.dailyMessageLimit,
        messageCount: messages.length,
      },
    });
    throw error;
  }
}
