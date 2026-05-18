'use client';

import { useCallback } from 'react';

import type { SocialPublishingImageAddonsBatchJob } from '@/shared/contracts/social-publishing-image-addons';

import {
  BATCH_CAPTURE_POLL_INTERVAL_MS,
  isBatchCaptureJobTerminal,
  waitForDelay,
} from '../SocialPublishingPage.capture-feedback';
import type {
  SocialCaptureFlowsProps,
  WaitForBatchCaptureJob,
} from './useSocialCaptureFlows.types';

const MAX_BATCH_CAPTURE_POLL_ATTEMPTS = 240;

type PollBatchCaptureJobParams = {
  readBatchCaptureJob: SocialCaptureFlowsProps['imageAddons']['readBatchCaptureJob'];
  initialJob: SocialPublishingImageAddonsBatchJob;
  currentJob: SocialPublishingImageAddonsBatchJob;
  attempt: number;
  onUpdate?: (job: SocialPublishingImageAddonsBatchJob) => void;
};

const pollBatchCaptureJob = async ({
  readBatchCaptureJob,
  initialJob,
  currentJob,
  attempt,
  onUpdate,
}: PollBatchCaptureJobParams): Promise<SocialPublishingImageAddonsBatchJob> => {
  if (attempt >= MAX_BATCH_CAPTURE_POLL_ATTEMPTS) {
    throw new Error('Timed out waiting for Playwright capture job.');
  }

  const latestJob = await readBatchCaptureJob(initialJob.id);
  const nextJob = latestJob ?? currentJob;

  if (latestJob !== null) {
    onUpdate?.(nextJob);
  }

  if (isBatchCaptureJobTerminal(nextJob.status)) {
    return nextJob;
  }

  await waitForDelay(BATCH_CAPTURE_POLL_INTERVAL_MS);

  return pollBatchCaptureJob({
    readBatchCaptureJob,
    initialJob,
    currentJob: nextJob,
    attempt: attempt + 1,
    onUpdate,
  });
};

export const useBatchCaptureJobWaiter = ({
  readBatchCaptureJob,
}: Pick<SocialCaptureFlowsProps['imageAddons'], 'readBatchCaptureJob'>): WaitForBatchCaptureJob =>
  useCallback(
    async (initialJob, onUpdate) => {
      onUpdate?.(initialJob);

      return pollBatchCaptureJob({
        readBatchCaptureJob,
        initialJob,
        currentJob: initialJob,
        attempt: 0,
        onUpdate,
      });
    },
    [readBatchCaptureJob]
  );
