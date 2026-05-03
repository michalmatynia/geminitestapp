import 'server-only';

import type { NextRequest } from 'next/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { type createDefaultKangurAiTutorLearnerMood } from '@/shared/contracts/kangur-ai-tutor-mood';
import { type resolveKangurActor } from '@/features/kangur/server';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorAvailabilityReason } from '@/features/kangur/ai-tutor/settings';

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

export type TutorMoodStateInput = {
  learnerId: string;
  tutorMood: ReturnType<typeof createDefaultKangurAiTutorLearnerMood>;
  actor: Awaited<ReturnType<typeof resolveKangurActor>>;
  context: KangurAiTutorConversationContext | undefined;
  req: NextRequest;
  ctx: ApiHandlerContext;
};
