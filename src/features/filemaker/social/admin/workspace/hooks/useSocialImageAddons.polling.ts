import { safeSetTimeout } from '@/shared/lib/timers';
import {
  fetchSocialPublishingImageAddonsBatchJob,
} from '@/features/filemaker/social/hooks/useSocialPublishingImageAddons';
import type { SocialPublishingImageAddonsBatchJob } from '@/shared/contracts/social-publishing-image-addons';

const BATCH_CAPTURE_POLL_INTERVAL_MS = 1000;
const BATCH_CAPTURE_MAX_POLL_ATTEMPTS = 240;

const delayBatchCapturePoll = (): Promise<void> =>
  new Promise((resolve) => {
    safeSetTimeout(() => {
      resolve();
    }, BATCH_CAPTURE_POLL_INTERVAL_MS);
  });

const isTerminalBatchCaptureJob = (job: SocialPublishingImageAddonsBatchJob): boolean =>
  job.status === 'completed' || job.status === 'failed';

const pollBatchCaptureJob = async ({
  attempt,
  currentJob,
  onUpdate,
}: {
  attempt: number;
  currentJob: SocialPublishingImageAddonsBatchJob;
  onUpdate?: (job: SocialPublishingImageAddonsBatchJob) => void;
}): Promise<SocialPublishingImageAddonsBatchJob> => {
  if (attempt >= BATCH_CAPTURE_MAX_POLL_ATTEMPTS) {
    throw new Error('Timed out waiting for Playwright capture job.');
  }

  const latestJob = await fetchSocialPublishingImageAddonsBatchJob(currentJob.id);
  const nextJob = latestJob ?? currentJob;
  if (latestJob !== null) {
    onUpdate?.(nextJob);
  }
  if (isTerminalBatchCaptureJob(nextJob)) {
    return nextJob;
  }

  await delayBatchCapturePoll();
  return pollBatchCaptureJob({ attempt: attempt + 1, currentJob: nextJob, onUpdate });
};

export const waitForBatchCaptureJob = (
  initialJob: SocialPublishingImageAddonsBatchJob,
  onUpdate?: (job: SocialPublishingImageAddonsBatchJob) => void
): Promise<SocialPublishingImageAddonsBatchJob> => {
  onUpdate?.(initialJob);
  return pollBatchCaptureJob({ attempt: 0, currentJob: initialJob, onUpdate });
};
