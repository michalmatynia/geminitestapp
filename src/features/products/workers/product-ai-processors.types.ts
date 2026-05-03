import type { GraphModelJobPayload, ProductAiJobRecord } from '@/shared/contracts/jobs';

export type JobPayload = GraphModelJobPayload & {
  skipAuthCollections?: boolean;
};

export type Job = ProductAiJobRecord & {
  payload: JobPayload;
};
