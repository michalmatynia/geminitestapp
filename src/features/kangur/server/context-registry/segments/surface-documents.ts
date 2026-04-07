import {
  KANGUR_CONTEXT_ROOT_IDS,
  KANGUR_RUNTIME_ENTITY_TYPES,
} from '@/features/kangur/context-registry/refs';
import type {
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { readTrimmedString } from '../kangur-registry-utils';
import {
  buildKangurTestResultSummaryFromContext,
  buildKangurTestReviewSummaryFromContext,
  buildKangurTestSelectedChoiceFactsFromContext,
} from './test-summaries';

export const buildKangurGameSurfaceRuntimeDocument = (
  context: KangurAiTutorConversationContext | null | undefined
): ContextRuntimeDocument | null => {
  if (context?.surface !== 'game') {
    return null;
  }
  const contentId = readTrimmedString(context.contentId) ?? 'game';
  const questionId = readTrimmedString(context.questionId);
  const title = readTrimmedString(context.title) ?? 'Kangur game practice';
  const description = readTrimmedString(context.description);
  const masterySummary = readTrimmedString(context.masterySummary);
  const assignmentSummary = readTrimmedString(context.assignmentSummary);
  const assignmentId = readTrimmedString(context.assignmentId);
  const currentQuestion = readTrimmedString(context.currentQuestion);
  const questionProgressLabel = readTrimmedString(context.questionProgressLabel);
  const answerRevealed = context.answerRevealed ?? false;
  const summary =
    currentQuestion && questionProgressLabel
      ? `Active game question ${questionProgressLabel}.`
      : currentQuestion
        ? 'Active game question.'
        : assignmentSummary ?? description ?? title;
  return {
    id: `runtime:kangur:game:${contentId}:${questionId ?? 'summary'}:${answerRevealed ? 'revealed' : currentQuestion ? 'active' : 'summary'}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.testContext,
    title,
    summary,
    status: currentQuestion ? (answerRevealed ? 'summary' : 'in_progress') : 'active',
    tags: ['kangur', 'game', 'ai-tutor'],
    relatedNodeIds: [
      'page:kangur-game',
      'action:kangur-ai-tutor-chat',
      'policy:kangur-ai-tutor-socratic',
      'policy:kangur-ai-tutor-test-guardrails',
    ],
    facts: {
      contentId,
      title,
      answerRevealed,
      ...(description ? { description } : {}),
      ...(masterySummary ? { masterySummary } : {}),
      ...(assignmentSummary ? { assignmentSummary } : {}),
      ...(assignmentId ? { assignmentId } : {}),
      ...(questionId ? { questionId } : {}),
      ...(currentQuestion ? { currentQuestion } : {}),
      ...(questionProgressLabel ? { questionProgressLabel } : {}),
    },
    sections: [
      {
        id: 'game_overview',
        kind: 'text',
        title: 'Game overview',
        text: [title, description, masterySummary, assignmentSummary].filter(Boolean).join('
'),
      },
      {
        id: 'current_question',
        kind: 'text',
        title: 'Current question',
        text: currentQuestion ?? '',
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-conversation-context',
    },
  };
};

export const buildKangurTestSurfaceRuntimeDocument = (
  context: KangurAiTutorConversationContext | null | undefined
): ContextRuntimeDocument | null => {
  if (context?.surface !== 'test') {
    return null;
  }

  const contentId = readTrimmedString(context.contentId) ?? 'test';
  const questionId = readTrimmedString(context.questionId);
  const title = readTrimmedString(context.title) ?? 'Kangur test';
  const currentQuestion = readTrimmedString(context.currentQuestion);
  const questionProgressLabel = readTrimmedString(context.questionProgressLabel);
  const answerRevealed = context.answerRevealed ?? false;
  const resultSummary = buildKangurTestResultSummaryFromContext(context);
  const reviewSummary = buildKangurTestReviewSummaryFromContext(context);
  const selectedChoiceFacts = buildKangurTestSelectedChoiceFactsFromContext(context);
  const summary =
    currentQuestion && questionProgressLabel
      ? `Active test question ${questionProgressLabel}.`
      : currentQuestion
        ? 'Active test question.'
        : resultSummary ?? title;

  return {
    id: `runtime:kangur:test:${contentId}:${questionId ?? 'summary'}:${answerRevealed ? 'revealed' : currentQuestion ? 'active' : 'summary'}`,
    kind: 'runtime_document',
    entityType: KANGUR_RUNTIME_ENTITY_TYPES.testContext,
    title,
    summary,
    status: currentQuestion ? (answerRevealed ? 'summary' : 'in_progress') : 'summary',
    tags: ['kangur', 'test', 'ai-tutor'],
    relatedNodeIds: [...KANGUR_CONTEXT_ROOT_IDS.testContext],
    timestamps: undefined,
    facts: {
      contentId,
      title,
      answerRevealed,
      ...(questionId ? { questionId } : {}),
      ...(selectedChoiceFacts ?? {}),
      ...(currentQuestion ? { currentQuestion } : {}),
      ...(questionProgressLabel ? { questionProgressLabel } : {}),
      ...(reviewSummary ? { reviewSummary } : {}),
      ...(resultSummary ? { resultSummary } : {}),
    },
    sections: [
      {
        id: 'test_overview',
        kind: 'text',
        title: 'Test overview',
        text: [title, reviewSummary, resultSummary].filter(Boolean).join('
'),
      },
    ],
    provenance: {
      providerId: 'kangur',
      source: 'kangur-conversation-context',
    },
  };
};
