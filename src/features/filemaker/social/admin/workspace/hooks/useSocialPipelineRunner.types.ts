import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { Toast } from '@/shared/contracts/ui/base';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type {
  SocialPublishingImageAddon,
  SocialPublishingImageAddonsBatchResult,
} from '@/shared/contracts/social-publishing-image-addons';
import type {
  SocialPublishingPost,
  SocialPublishingVisualAnalysis,
} from '@/shared/contracts/social-publishing-posts';
import type {
  SocialPublishingManualPipelineProgress,
  SocialPublishingPipelineCaptureMode,
} from '@/shared/contracts/social-publishing-pipeline';
import type { SafeTimerId } from '@/shared/lib/timers';

import type {
  EditorState,
  PipelineStep,
} from '../SocialPublishingPage.Constants';

export type SocialPipelineRunnerDeps = {
  activePost: SocialPublishingPost | null;
  activePostId: string | null;
  editorState: EditorState;
  imageAssets: ImageFileSelection[];
  imageAddonIds: string[];
  batchCaptureBaseUrl: string;
  batchCapturePresetIds: string[];
  batchCapturePresetLimit: number | null;
  publishingConnectionId: string | null;
  brainModelId: string | null;
  visionModelId: string | null;
  canRunServerPipeline: boolean;
  pipelineBlockedReason: string | null;
  canRunVisualAnalysisPipeline: boolean;
  visualAnalysisBlockedReason: string | null;
  projectUrl: string;
  generationNotes: string;
  resolveDocReferences: () => string[];
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  handleLoadContext: (options?: {
    notify?: boolean;
    persist?: boolean;
    useDirect?: boolean;
  }) => Promise<{ summary: string | null; docCount: number | null; error?: boolean }>;
  setContextSummary: (value: string | null) => void;
  setActivePostId: (value: string | null) => void;
  setEditorState: (value: EditorState) => void;
  setImageAddonIds: (value: string[]) => void;
  setImageAssets: (value: ImageFileSelection[]) => void;
  setBatchCaptureResult: (value: SocialPublishingImageAddonsBatchResult | null) => void;
  handleSelectAddons: (addons: SocialPublishingImageAddon[]) => void;
};

export type PipelineTriggerResponse = {
  success: boolean;
  jobId: string;
  jobType: 'pipeline-tick' | 'manual-post-pipeline';
};

export type VisualAnalysisTriggerResponse = {
  success: boolean;
  jobId: string;
  jobType: 'manual-post-visual-analysis';
};

export type PipelineCaptureMode = Extract<
  SocialPublishingPipelineCaptureMode,
  'existing_assets' | 'fresh_capture'
>;

export type ManualPipelineJobResult = {
  type: 'manual-post-pipeline';
  postId: string;
  captureMode: PipelineCaptureMode;
  addonsCreated: number;
  failures: number;
  runId: string | null;
  contextSummary: string | null;
  contextDocCount: number;
  imageAddonIds: string[];
  imageAssets: ImageFileSelection[];
  batchCaptureResult: SocialPublishingImageAddonsBatchResult | null;
  generatedPost: SocialPublishingPost | null;
};

export type PipelineJobRecord = {
  id: string;
  status: string;
  progress: SocialPublishingManualPipelineProgress | null;
  result: ManualPipelineJobResult | null;
  failedReason: string | null;
};

export type VisualAnalysisJobResult = {
  type: 'manual-post-visual-analysis';
  analysis: SocialPublishingVisualAnalysis;
  savedPost: SocialPublishingPost | null;
};

export type VisualAnalysisJobRecord = {
  id: string;
  status: string;
  progress: {
    type: 'manual-post-visual-analysis';
    step: 'loading_assets' | 'analyzing' | 'saving';
    message: string | null;
    updatedAt: number;
    postId: string | null;
    imageAddonCount: number;
    highlightCount: number | null;
  } | null;
  result: VisualAnalysisJobResult | null;
  failedReason: string | null;
};

export type RunPipelineOptions = {
  prefetchedVisualAnalysis?: SocialPublishingVisualAnalysis;
  requireVisualAnalysisInBody?: boolean;
  imageAssetsOverride?: ImageFileSelection[];
  imageAddonIdsOverride?: string[];
};

export type TransientVisualAnalysisResult = {
  postId: string;
  result: SocialPublishingVisualAnalysis;
};

export type SocialPipelineRunnerState = {
  pipelineStep: PipelineStep;
  setPipelineStep: Dispatch<SetStateAction<PipelineStep>>;
  pipelineProgress: SocialPublishingManualPipelineProgress | null;
  setPipelineProgress: Dispatch<SetStateAction<SocialPublishingManualPipelineProgress | null>>;
  pipelineErrorMessage: string | null;
  setPipelineErrorMessage: Dispatch<SetStateAction<string | null>>;
  isVisualAnalysisModalOpen: boolean;
  setIsVisualAnalysisModalOpen: Dispatch<SetStateAction<boolean>>;
  transientVisualAnalysisResult: TransientVisualAnalysisResult | null;
  setTransientVisualAnalysisResult: Dispatch<SetStateAction<TransientVisualAnalysisResult | null>>;
  visualAnalysisErrorMessage: string | null;
  setVisualAnalysisErrorMessage: Dispatch<SetStateAction<string | null>>;
  visualAnalysisPending: boolean;
  setVisualAnalysisPending: Dispatch<SetStateAction<boolean>>;
  currentPipelineJob: PipelineJobRecord | null;
  setCurrentPipelineJob: Dispatch<SetStateAction<PipelineJobRecord | null>>;
  currentVisualAnalysisJob: VisualAnalysisJobRecord | null;
  setCurrentVisualAnalysisJob: Dispatch<SetStateAction<VisualAnalysisJobRecord | null>>;
};

export type SocialPipelineRunnerRefs = {
  depsRef: MutableRefObject<SocialPipelineRunnerDeps>;
  pollDelayTimeoutRef: MutableRefObject<SafeTimerId | null>;
  isUnmountedRef: MutableRefObject<boolean>;
  visualAnalysisPollRunRef: MutableRefObject<number>;
};

export type VisualAnalysisSnapshot = {
  visualAnalysisResult: SocialPublishingVisualAnalysis | null;
  hasSavedVisualAnalysis: boolean;
  isSavedVisualAnalysisStale: boolean;
  visualAnalysisScope: string;
};

export type UseSocialPipelineRunnerResult = {
  pipelineStep: PipelineStep;
  pipelineProgress: SocialPublishingManualPipelineProgress | null;
  pipelineErrorMessage: string | null;
  isVisualAnalysisModalOpen: boolean;
  visualAnalysisResult: SocialPublishingVisualAnalysis | null;
  hasSavedVisualAnalysis: boolean;
  isSavedVisualAnalysisStale: boolean;
  visualAnalysisErrorMessage: string | null;
  visualAnalysisPending: boolean;
  currentPipelineJob: PipelineJobRecord | null;
  currentVisualAnalysisJob: VisualAnalysisJobRecord | null;
  handleRunFullPipeline: () => Promise<void>;
  handleRunFullPipelineWithOverrides: (options: {
    imageAssets: ImageFileSelection[];
    imageAddonIds: string[];
  }) => Promise<void>;
  handleRunFullPipelineWithFreshCapture: () => Promise<void>;
  handleOpenVisualAnalysisModal: () => void;
  handleCloseVisualAnalysisModal: () => void;
  handleAnalyzeSelectedVisuals: () => Promise<void>;
  handleRunFullPipelineWithVisualAnalysis: () => Promise<void>;
};

export type SocialPipelineToast = Toast;
