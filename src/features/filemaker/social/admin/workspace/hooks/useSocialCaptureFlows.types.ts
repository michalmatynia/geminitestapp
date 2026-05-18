import type { Dispatch, SetStateAction } from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';
import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingImageAddonsBatchResult,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';

import type { UseSocialCaptureFlowsProps } from '../SocialPublishingPage.types';

export type SocialCaptureFlowsProps = UseSocialCaptureFlowsProps;

export type AttachBatchCaptureResult = (
  result: SocialPublishingImageAddonsBatchResult
) => Promise<{
  imageAddonIds: string[];
  imageAssets: ImageFileSelection[];
} | null>;

export type WaitForBatchCaptureJob = (
  initialJob: SocialPublishingImageAddonsBatchJob,
  onUpdate?: (job: SocialPublishingImageAddonsBatchJob) => void
) => Promise<SocialPublishingImageAddonsBatchJob>;

export type ProgrammableCaptureFlowParams = {
  baseUrl: string;
  personaId: string | null;
  script: string;
  routes: SocialPublishingProgrammableCaptureRoute[];
  runPipelineAfterCapture?: boolean;
};

export type SocialProgrammableCaptureState = {
  isProgrammablePlaywrightModalOpen: boolean;
  setIsProgrammablePlaywrightModalOpen: Dispatch<SetStateAction<boolean>>;
  programmableCaptureBaseUrl: string;
  setProgrammableCaptureBaseUrl: Dispatch<SetStateAction<string>>;
  programmableCapturePersonaId: string;
  setProgrammableCapturePersonaId: Dispatch<SetStateAction<string>>;
  programmableCaptureScript: string;
  setProgrammableCaptureScript: Dispatch<SetStateAction<string>>;
  programmableCaptureRoutes: SocialPublishingProgrammableCaptureRoute[];
  setProgrammableCaptureRoutes: Dispatch<
    SetStateAction<SocialPublishingProgrammableCaptureRoute[]>
  >;
  programmableCapturePending: boolean;
  setProgrammableCapturePending: Dispatch<SetStateAction<boolean>>;
  programmableCaptureMessage: string | null;
  setProgrammableCaptureMessage: Dispatch<SetStateAction<string | null>>;
  programmableCaptureErrorMessage: string | null;
  setProgrammableCaptureErrorMessage: Dispatch<SetStateAction<string | null>>;
  programmableCaptureBatchCaptureJob: SocialPublishingImageAddonsBatchJob | null;
  setProgrammableCaptureBatchCaptureJob: Dispatch<
    SetStateAction<SocialPublishingImageAddonsBatchJob | null>
  >;
};

export type SocialCaptureOnlyState = {
  captureOnlyPending: boolean;
  captureOnlyBatchCaptureJob: SocialPublishingImageAddonsBatchJob | null;
  captureOnlyMessage: string | null;
  captureOnlyErrorMessage: string | null;
  handleCaptureImagesOnly: () => Promise<void>;
};

export type SocialCaptureOnlyControls = SocialCaptureOnlyState & {
  clearCaptureOnlyFeedback: () => void;
};

export type SocialProgrammableCaptureControls = SocialProgrammableCaptureState & {
  handleOpenProgrammablePlaywrightModal: () => void;
  handleOpenProgrammablePlaywrightModalFromDefaults: () => void;
  handleCloseProgrammablePlaywrightModal: () => void;
  handleAddProgrammableCaptureRoute: () => void;
  handleUpdateProgrammableCaptureRoute: (
    routeId: string,
    patch: Partial<SocialPublishingProgrammableCaptureRoute>
  ) => void;
  handleRemoveProgrammableCaptureRoute: (routeId: string) => void;
  handleSeedProgrammableCaptureRoutesFromPresets: () => void;
  handleResetProgrammableCaptureScript: () => void;
  handleSaveProgrammableCaptureDefaults: () => Promise<void>;
  handleResetProgrammableCaptureDefaults: () => Promise<void>;
};

export type SocialCaptureFlowsResult = SocialCaptureOnlyState & {
  isProgrammablePlaywrightModalOpen: boolean;
  programmableCaptureBaseUrl: string;
  setProgrammableCaptureBaseUrl: Dispatch<SetStateAction<string>>;
  programmableCapturePersonaId: string;
  setProgrammableCapturePersonaId: Dispatch<SetStateAction<string>>;
  programmableCaptureScript: string;
  setProgrammableCaptureScript: Dispatch<SetStateAction<string>>;
  programmableCaptureRoutes: SocialPublishingProgrammableCaptureRoute[];
  programmableCapturePending: boolean;
  programmableCaptureBatchCaptureJob: SocialPublishingImageAddonsBatchJob | null;
  programmableCaptureMessage: string | null;
  programmableCaptureErrorMessage: string | null;
  handleOpenProgrammablePlaywrightModal: () => void;
  handleOpenProgrammablePlaywrightModalFromDefaults: () => void;
  handleCloseProgrammablePlaywrightModal: () => void;
  handleAddProgrammableCaptureRoute: () => void;
  handleUpdateProgrammableCaptureRoute: (
    routeId: string,
    patch: Partial<SocialPublishingProgrammableCaptureRoute>
  ) => void;
  handleRemoveProgrammableCaptureRoute: (routeId: string) => void;
  handleSeedProgrammableCaptureRoutesFromPresets: () => void;
  handleResetProgrammableCaptureScript: () => void;
  handleSaveProgrammableCaptureDefaults: () => Promise<void>;
  handleResetProgrammableCaptureDefaults: () => Promise<void>;
  handleRunProgrammablePlaywrightCapture: () => Promise<void>;
  handleRunProgrammablePlaywrightCaptureAndPipeline: () => Promise<void>;
  handleRetryFailedProgrammableCaptureJob: (
    job: SocialPublishingImageAddonsBatchJob
  ) => Promise<void>;
  attachBatchCaptureResultToActiveDraft: AttachBatchCaptureResult;
  waitForBatchCaptureJob: WaitForBatchCaptureJob;
};
