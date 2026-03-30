import 'server-only';

import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { logKangurServerEvent } from '@/features/kangur/observability/server';
import { setKangurLearnerAiTutorState } from '@/features/kangur/server';
import type { TutorMoodStateInput } from './chat-constants';

export const persistTutorMoodState = async (input: TutorMoodStateInput): Promise<void> => {
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
