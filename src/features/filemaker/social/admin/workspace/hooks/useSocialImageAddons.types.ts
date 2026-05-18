import type {
  SocialPublishingCaptureAppearanceMode,
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingImageAddonsBatchPayload,
  SocialPublishingImageAddonsBatchResult,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';
import type {
  fetchSocialPublishingImageAddonsBatchJob,
  useBatchCaptureSocialPublishingImageAddons,
  useCreateSocialPublishingImageAddon,
  useStartBatchCaptureSocialPublishingImageAddons,
} from '@/features/filemaker/social/hooks/useSocialPublishingImageAddons';
import type { useToast } from '@/shared/ui';

import type { AddonFormState } from '../SocialPublishingPage.Constants';

export type ToastFn = ReturnType<typeof useToast>['toast'];

export type SocialImageAddonsDeps = {
  addonForm: AddonFormState;
  setAddonForm: (value: AddonFormState) => void;
  batchCaptureBaseUrl: string;
  batchCapturePresetIds: string[];
  batchCapturePresetLimit: number | null;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
};

export type BatchCaptureOptions = {
  baseUrl?: string;
  presetIds?: string[];
  presetLimit?: number | null;
  playwrightPersonaId?: string | null;
  playwrightScript?: string;
  playwrightRoutes?: SocialPublishingProgrammableCaptureRoute[];
};

export type BatchCaptureRequest = {
  baseUrl: string;
  presetIds: string[];
  presetLimit: number | null;
  playwrightPersonaId?: string | null;
  playwrightScript?: string;
  playwrightRoutes?: SocialPublishingProgrammableCaptureRoute[];
};

export type SocialImageAddonsMutations = {
  createAddonMutation: ReturnType<typeof useCreateSocialPublishingImageAddon>;
  batchCaptureMutation: ReturnType<typeof useBatchCaptureSocialPublishingImageAddons>;
  startBatchCaptureMutation: ReturnType<
    typeof useStartBatchCaptureSocialPublishingImageAddons
  >;
};

export type BatchCaptureStateControls = {
  batchCaptureResult: SocialPublishingImageAddonsBatchResult | null;
  batchCapturePending: boolean;
  batchCaptureJob: SocialPublishingImageAddonsBatchJob | null;
  batchCaptureMessage: string | null;
  batchCaptureErrorMessage: string | null;
  setBatchCaptureResult: (value: SocialPublishingImageAddonsBatchResult | null) => void;
  setBatchCapturePending: (value: boolean) => void;
  setBatchCaptureJob: (value: SocialPublishingImageAddonsBatchJob | null) => void;
  setBatchCaptureMessage: (value: string | null) => void;
  setBatchCaptureErrorMessage: (value: string | null) => void;
};

export type SocialImageAddonsResult = SocialImageAddonsMutations &
  Pick<
    BatchCaptureStateControls,
    | 'batchCaptureErrorMessage'
    | 'batchCaptureJob'
    | 'batchCaptureMessage'
    | 'batchCapturePending'
    | 'batchCaptureResult'
    | 'setBatchCaptureResult'
  > & {
    captureAppearanceMode: SocialPublishingCaptureAppearanceMode;
    runBatchCapture: (
      options?: BatchCaptureOptions
    ) => Promise<SocialPublishingImageAddonsBatchResult>;
    startBatchCapture: (
      options?: BatchCaptureOptions
    ) => Promise<SocialPublishingImageAddonsBatchJob>;
    readBatchCaptureJob: typeof fetchSocialPublishingImageAddonsBatchJob;
    handleCreateAddon: () => Promise<void>;
    handleBatchCapture: (options?: BatchCaptureOptions) => Promise<void>;
    handleRetryFailedPresetBatchCaptureJob: (
      job: SocialPublishingImageAddonsBatchJob
    ) => Promise<void>;
  };

export type BatchCapturePayload = SocialPublishingImageAddonsBatchPayload;
