import { useState } from 'react';

import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingImageAddonsBatchResult,
} from '@/shared/contracts/social-publishing-image-addons';

import type { BatchCaptureStateControls } from './useSocialImageAddons.types';

export const useBatchCaptureState = (): BatchCaptureStateControls => {
  const [batchCaptureResult, setBatchCaptureResult] =
    useState<SocialPublishingImageAddonsBatchResult | null>(null);
  const [batchCapturePending, setBatchCapturePending] = useState(false);
  const [batchCaptureJob, setBatchCaptureJob] =
    useState<SocialPublishingImageAddonsBatchJob | null>(null);
  const [batchCaptureMessage, setBatchCaptureMessage] = useState<string | null>(null);
  const [batchCaptureErrorMessage, setBatchCaptureErrorMessage] =
    useState<string | null>(null);

  return {
    batchCaptureResult,
    batchCapturePending,
    batchCaptureJob,
    batchCaptureMessage,
    batchCaptureErrorMessage,
    setBatchCaptureResult,
    setBatchCapturePending,
    setBatchCaptureJob,
    setBatchCaptureMessage,
    setBatchCaptureErrorMessage,
  };
};
