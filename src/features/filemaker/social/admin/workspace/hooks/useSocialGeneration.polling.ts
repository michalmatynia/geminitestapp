import { api } from '@/shared/lib/api-client';

import type { GenerationJobRecord, GenerationJobSetter } from './useSocialGeneration.types';

export const GENERATION_POLL_INTERVAL_MS = 2_000;
export const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;
export const GENERATION_REQUEST_TIMEOUT_MS = 60_000;

type WaitForNextPoll = (ms: number) => Promise<boolean>;

type PollGenerationJobParams = {
  jobId: string;
  setCurrentGenerationJob: GenerationJobSetter;
  startedAt: number;
  waitForNextPoll: WaitForNextPoll;
};

const fetchGenerationJob = (jobId: string): Promise<GenerationJobRecord | null> =>
  api.get<GenerationJobRecord | null>('/api/filemaker/social-pipeline/jobs', {
    params: { id: jobId },
    timeout: GENERATION_REQUEST_TIMEOUT_MS,
  });

const ensureWithinGenerationTimeout = (startedAt: number): void => {
  if (Date.now() - startedAt >= GENERATION_TIMEOUT_MS) {
    throw new Error('Generation timed out while waiting for the server job.');
  }
};

const resolveTerminalGenerationJob = ({
  job,
  setCurrentGenerationJob,
}: {
  job: GenerationJobRecord;
  setCurrentGenerationJob: GenerationJobSetter;
}): GenerationJobRecord | null => {
  setCurrentGenerationJob(job);
  if (job.status === 'completed') {
    return job;
  }
  if (job.status === 'failed') {
    throw new Error(job.failedReason ?? 'Server generation job failed.');
  }
  return null;
};

const pollGenerationJob = async (
  params: PollGenerationJobParams
): Promise<GenerationJobRecord | null> => {
  ensureWithinGenerationTimeout(params.startedAt);

  const job = await fetchGenerationJob(params.jobId);
  if (job !== null) {
    const terminalJob = resolveTerminalGenerationJob({
      job,
      setCurrentGenerationJob: params.setCurrentGenerationJob,
    });
    if (terminalJob !== null) {
      return terminalJob;
    }
  }

  const shouldContinue = await params.waitForNextPoll(GENERATION_POLL_INTERVAL_MS);
  if (shouldContinue === false) {
    return null;
  }

  return pollGenerationJob(params);
};

export const pollGenerationJobUntilComplete = ({
  jobId,
  setCurrentGenerationJob,
  waitForNextPoll,
}: {
  jobId: string;
  setCurrentGenerationJob: GenerationJobSetter;
  waitForNextPoll: WaitForNextPoll;
}): Promise<GenerationJobRecord | null> =>
  pollGenerationJob({
    jobId,
    setCurrentGenerationJob,
    startedAt: Date.now(),
    waitForNextPoll,
  });
