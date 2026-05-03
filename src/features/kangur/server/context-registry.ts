import 'server-only';
import {
  KANGUR_RUNTIME_ENTITY_TYPES,
} from '@/features/kangur/context-registry/refs';
import {
  augmentKangurTestSurfaceRuntimeDocument,
} from './context-registry/kangur-registry-resolvers';
import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

export * from './context-registry/segments/test-summaries';
export * from './context-registry/segments/learner-summaries';
export * from './context-registry/segments/loaders';
export * from './context-registry/segments/learner-documents';
export * from './context-registry/segments/lesson-test-documents';
export * from './context-registry/segments/assignment-document';
export * from './context-registry/segments/surface-documents';

import {
  buildKangurTestResultSummaryFromContext,
  buildKangurTestReviewSummaryFromContext,
  buildKangurTestSelectedChoiceFactsFromContext,
} from './context-registry/segments/test-summaries';
import {
  buildKangurGameSurfaceRuntimeDocument,
  buildKangurTestSurfaceRuntimeDocument,
} from './context-registry/segments/surface-documents';

export const resolveKangurAiTutorRuntimeDocuments = (
  bundle: ContextRegistryResolutionBundle | null | undefined,
  context?: KangurAiTutorConversationContext | null
): {
  learnerSnapshot: ContextRuntimeDocument | null;
  loginActivity: ContextRuntimeDocument | null;
  surfaceContext: ContextRuntimeDocument | null;
  assignmentContext: ContextRuntimeDocument | null;
} => {
  const documents = bundle?.documents ?? [];
  const bundleSurfaceContext =
    documents.find(
      (document) =>
        document.entityType === KANGUR_RUNTIME_ENTITY_TYPES.lessonContext ||
        document.entityType === KANGUR_RUNTIME_ENTITY_TYPES.testContext
    ) ?? null;
  const fallbackSurfaceContext =
    buildKangurTestSurfaceRuntimeDocument(context) ?? buildKangurGameSurfaceRuntimeDocument(context);
  return {
    learnerSnapshot:
      documents.find((document) => document.entityType === KANGUR_RUNTIME_ENTITY_TYPES.learnerSnapshot) ??
      null,
    loginActivity:
      documents.find((document) => document.entityType === KANGUR_RUNTIME_ENTITY_TYPES.loginActivity) ??
      null,
    surfaceContext: augmentKangurTestSurfaceRuntimeDocument(
      bundleSurfaceContext ?? fallbackSurfaceContext,
      {
        resultSummary: buildKangurTestResultSummaryFromContext(context),
        reviewSummary: buildKangurTestReviewSummaryFromContext(context),
        selectedChoiceFacts: buildKangurTestSelectedChoiceFactsFromContext(context),
        testContextType: KANGUR_RUNTIME_ENTITY_TYPES.testContext,
      }
    ),
    assignmentContext:
      documents.find(
        (document) => document.entityType === KANGUR_RUNTIME_ENTITY_TYPES.assignmentContext
      ) ?? null,
  };
};
