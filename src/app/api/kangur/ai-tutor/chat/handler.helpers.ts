import { type NextRequest } from 'next/server';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { type resolveKangurActor, setKangurLearnerAiTutorState } from '@/features/kangur/server';
import {
  type KangurAiTutorAvailabilityReason,
} from '@/features/kangur/ai-tutor/settings';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';
import { type createDefaultKangurAiTutorLearnerMood } from '@/shared/contracts/kangur-ai-tutor-mood';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const AVAILABILITY_ERROR_MESSAGES: Record<KangurAiTutorAvailabilityReason, string> = {
  disabled: 'AI Tutor is not enabled for this learner.',
  email_unverified: 'Verify your parent email to unlock AI Tutor.',
  missing_context: 'AI Tutor context is required for Kangur tutoring sessions.',
  lessons_disabled: 'AI Tutor is disabled for lessons for this learner.',
  games_disabled: 'AI Tutor is disabled for games for this learner.',
  tests_disabled: 'AI Tutor is disabled for tests for this learner.',
  review_after_answer_only:
    'AI Tutor is available in tests only after the answer has been revealed.',
};

export const KANGUR_AI_TUTOR_BRAIN_CAPABILITY = 'kangur_ai_tutor.chat';

type TutorMoodState = ReturnType<typeof createDefaultKangurAiTutorLearnerMood>;

export const persistTutorMoodState = async (input: {
  learnerId: string;
  tutorMood: TutorMoodState;
  actor: Awaited<ReturnType<typeof resolveKangurActor>>;
  context: KangurAiTutorConversationContext | undefined;
  req: NextRequest;
  ctx: ApiHandlerContext;
}): Promise<void> => {
  try {
    await setKangurLearnerAiTutorState(input.learnerId, input.tutorMood);
  } catch (error) {
    void ErrorSystem.captureException(error);
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

export const buildKgTelemetry = (input: {
  knowledgeGraphApplied: boolean;
  knowledgeGraphQueryMode: 'website_help' | 'semantic' | null;
  knowledgeGraphRecallStrategy: 'metadata_only' | 'vector_only' | 'hybrid_vector' | null;
  knowledgeGraphLexicalHitCount: number;
  knowledgeGraphVectorHitCount: number;
  knowledgeGraphVectorRecallAttempted: boolean;
  knowledgeGraphNodeIds: string[];
  knowledgeGraphSourceCollections: string[];
  knowledgeGraphHydrationSources: string[];
  websiteHelpGraphApplied: boolean;
  knowledgeGraphWebsiteHelpTargetNodeId: string | null;
  knowledgeGraphWebsiteHelpTargetRoute: string | null;
  knowledgeGraphWebsiteHelpTargetAnchorId: string | null;
}) => ({
  knowledgeGraphApplied: input.knowledgeGraphApplied,
  knowledgeGraphQueryMode: input.knowledgeGraphQueryMode,
  knowledgeGraphRecallStrategy: input.knowledgeGraphRecallStrategy,
  knowledgeGraphLexicalHitCount: input.knowledgeGraphLexicalHitCount,
  knowledgeGraphVectorHitCount: input.knowledgeGraphVectorHitCount,
  knowledgeGraphVectorRecallAttempted: input.knowledgeGraphVectorRecallAttempted,
  knowledgeGraphNodeIds: input.knowledgeGraphNodeIds,
  knowledgeGraphSourceCollections: input.knowledgeGraphSourceCollections,
  knowledgeGraphHydrationSources: input.knowledgeGraphHydrationSources,
  websiteHelpGraphApplied: input.websiteHelpGraphApplied,
  websiteHelpGraphNodeIds: input.websiteHelpGraphApplied ? input.knowledgeGraphNodeIds : [],
  websiteHelpGraphSourceCollections: input.websiteHelpGraphApplied
    ? input.knowledgeGraphSourceCollections
    : [],
  websiteHelpGraphHydrationSources: input.websiteHelpGraphApplied
    ? input.knowledgeGraphHydrationSources
    : [],
  websiteHelpGraphTargetNodeId: input.websiteHelpGraphApplied
    ? input.knowledgeGraphWebsiteHelpTargetNodeId
    : null,
  websiteHelpGraphTargetRoute: input.websiteHelpGraphApplied
    ? input.knowledgeGraphWebsiteHelpTargetRoute
    : null,
  websiteHelpGraphTargetAnchorId: input.websiteHelpGraphApplied
    ? input.knowledgeGraphWebsiteHelpTargetAnchorId
    : null,
});

export const buildSettingsTelemetry = (
  input: Pick<
    KangurAiTutorLearnerSettings,
    | 'showSources'
    | 'allowSelectedTextSupport'
    | 'allowLessons'
    | 'allowGames'
    | 'testAccessMode'
    | 'hintDepth'
    | 'proactiveNudges'
    | 'rememberTutorContext'
  >
) => ({
  showSources: input.showSources,
  allowSelectedTextSupport: input.allowSelectedTextSupport,
  allowLessons: input.allowLessons,
  allowGames: input.allowGames,
  testAccessMode: input.testAccessMode,
  hintDepth: input.hintDepth,
  proactiveNudges: input.proactiveNudges,
  rememberTutorContext: input.rememberTutorContext,
});

export const buildMoodTelemetry = (input: TutorMoodState) => ({
  tutorMoodId: input.currentMoodId,
  tutorBaselineMoodId: input.baselineMoodId,
  tutorMoodReasonCode: input.lastReasonCode,
  tutorMoodConfidence: input.confidence,
});
import type { KangurAiTutorLearnerSettings } from '@/features/kangur/ai-tutor/settings';
