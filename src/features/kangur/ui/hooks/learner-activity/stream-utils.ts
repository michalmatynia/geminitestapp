import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import { kangurLearnerActivityStatusSchema } from '@/features/kangur/shared/contracts/kangur';

export const resolveKangurLearnerActivityStreamUrl = (learnerId: string): string =>
  `/api/kangur/learner-activity/stream?learnerId=${encodeURIComponent(learnerId)}`;

export const openKangurLearnerActivityStream = (streamUrl: string): EventSource | null =>
  withKangurClientErrorSync(
    {
      source: 'kangur.hooks.useKangurLearnerActivityStatus',
      action: 'open-stream',
      description: 'Opens the learner activity SSE stream.',
      context: { streamUrl },
    },
    () => new EventSource(streamUrl),
    { fallback: null }
  );

export const parseKangurLearnerActivityStreamPayload = (
  event: MessageEvent<string>
): { type?: string; data?: unknown } | null =>
  withKangurClientErrorSync(
    {
      source: 'kangur.hooks.useKangurLearnerActivityStatus',
      action: 'parse-stream',
      description: 'Parses learner activity SSE payloads.',
    },
    () => JSON.parse(event.data) as { type?: string; data?: unknown },
    { fallback: null }
  );
