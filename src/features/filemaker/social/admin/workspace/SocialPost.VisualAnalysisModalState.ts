import type { SocialPublishingImageAddon } from '@/shared/contracts/social-publishing-image-addons';
import { type useSocialPostContext } from './SocialPostContext';
import { getSocialJobStatusLabel } from './SocialJobStatusPill';
import {
  formatRuntimeJobTitle,
  getRuntimeString,
  isSocialRuntimeJobInFlight,
  runtimeJobFailedReason,
  runtimeJobId,
  runtimeJobStatus,
} from './SocialPost.VisualsRuntime';

export type SocialVisualAnalysisModalContext = ReturnType<typeof useSocialPostContext>;

export type VisualAnalysisModalSelectionState = {
  availableAddons: SocialPublishingImageAddon[];
  missingAddonIds: string[];
  missingCount: number;
  selectedAddons: SocialPublishingImageAddon[];
  selectedCount: number;
  selectedIds: string[];
  shouldLoadPersonas: boolean;
};

export type VisualAnalysisModalMetadata = {
  errorMessage: string;
  hasFailedStatus: boolean;
  hasMetadata: boolean;
  jobId: string;
  modelId: string;
  savedError: string;
  status: string | null;
  statusLabel: string | null;
  title: string;
  updatedAt: string | null;
};

export type VisualAnalysisModalRuntimeState = {
  analyzeButtonTitle: string;
  analyzeText: string;
  isAnalyzeDisabled: boolean;
  isFollowUpGenerationInFlight: boolean;
  isSaveDisabled: boolean;
  isVisualAnalysisJobInFlight: boolean;
  saveButtonTitle: string;
  saveText: string;
};

const RUNTIME_BUSY_TITLE = 'Wait for the current Social runtime job to finish.';

const getRuntimeArray = <T>(value: T[] | undefined): T[] =>
  Array.isArray(value) ? value : [];

const selectedAddonSet = (ids: string[]): Set<string> => new Set(ids);

const hasAddonPersona = (addon: SocialPublishingImageAddon): boolean =>
  getRuntimeString(addon.playwrightPersonaId).length > 0;

const filterSelectedAddons = (
  addons: SocialPublishingImageAddon[],
  selectedIds: string[]
): SocialPublishingImageAddon[] => {
  const selected = selectedAddonSet(selectedIds);
  return addons.filter((addon) => selected.has(addon.id));
};

const shouldLoadPersonas = (
  context: SocialVisualAnalysisModalContext,
  selectedAddons: SocialPublishingImageAddon[]
): boolean => context.isVisualAnalysisModalOpen && selectedAddons.some(hasAddonPersona);

export const buildVisualAnalysisModalSelectionState = (
  context: SocialVisualAnalysisModalContext
): VisualAnalysisModalSelectionState => {
  const selectedIds = getRuntimeArray(context.imageAddonIds);
  const availableAddons = getRuntimeArray(context.recentAddons);
  const missingAddonIds = getRuntimeArray(context.missingSelectedImageAddonIds);
  const selectedAddons = filterSelectedAddons(availableAddons, selectedIds);

  return {
    availableAddons,
    missingAddonIds,
    missingCount: missingAddonIds.length,
    selectedAddons,
    selectedCount: selectedIds.length,
    selectedIds,
    shouldLoadPersonas: shouldLoadPersonas(context, selectedAddons),
  };
};

export const resolveVisionModelLabel = (
  context: SocialVisualAnalysisModalContext
): string => {
  const directModel = getRuntimeString(context.visionModelId);
  if (directModel.length > 0) return directModel;

  const options = context.visionModelOptions as { effectiveModelId?: unknown } | null;
  const effectiveModel = getRuntimeString(options?.effectiveModelId);
  if (effectiveModel.length > 0) return effectiveModel;

  return 'Not configured';
};

const savedVisualAnalysisStatus = (
  context: SocialVisualAnalysisModalContext
): string | null => context.activePost?.visualAnalysisStatus ?? null;

const visualAnalysisStatus = (
  context: SocialVisualAnalysisModalContext
): string | null => {
  const liveStatus = runtimeJobStatus(context.currentVisualAnalysisJob);
  if (liveStatus.length > 0) return liveStatus;
  return savedVisualAnalysisStatus(context);
};

const visualAnalysisJobId = (context: SocialVisualAnalysisModalContext): string => {
  const liveJobId = runtimeJobId(context.currentVisualAnalysisJob);
  if (liveJobId.length > 0) return liveJobId;
  return context.activePost?.visualAnalysisJobId?.trim() ?? '';
};

const savedVisualAnalysisError = (context: SocialVisualAnalysisModalContext): string =>
  context.activePost?.visualAnalysisError?.trim() ?? '';

const failedSavedError = (hasFailedStatus: boolean, savedError: string): string => {
  if (!hasFailedStatus) return '';
  return savedError;
};

const metadataHasContent = (metadata: VisualAnalysisModalMetadata): boolean =>
  metadata.statusLabel !== null ||
  metadata.updatedAt !== null ||
  metadata.modelId.length > 0 ||
  metadata.jobId.length > 0;

export const buildVisualAnalysisModalMetadata = (
  context: SocialVisualAnalysisModalContext
): VisualAnalysisModalMetadata => {
  const status = visualAnalysisStatus(context);
  const hasFailedStatus = status === 'failed';
  const savedError = savedVisualAnalysisError(context);
  const savedFailure = failedSavedError(hasFailedStatus, savedError);
  const liveError = runtimeJobFailedReason(context.currentVisualAnalysisJob);
  const metadata = {
    errorMessage: liveError.length > 0 ? liveError : savedFailure,
    hasFailedStatus,
    hasMetadata: false,
    jobId: visualAnalysisJobId(context),
    modelId: context.activePost?.visualAnalysisModelId?.trim() ?? '',
    savedError,
    status,
    statusLabel: getSocialJobStatusLabel(status),
    title: formatRuntimeJobTitle(context.currentVisualAnalysisJob, savedFailure),
    updatedAt: context.activePost?.visualAnalysisUpdatedAt ?? null,
  };

  return {
    ...metadata,
    hasMetadata: metadataHasContent(metadata),
  };
};

const hasVisualAnalysisResult = (context: SocialVisualAnalysisModalContext): boolean =>
  context.visualAnalysisResult !== null;

const isVisualAnalysisJobInFlight = (
  context: SocialVisualAnalysisModalContext
): boolean =>
  context.visualAnalysisPending === true ||
  isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentVisualAnalysisJob));

const saveButtonText = (isPipelineJobInFlight: boolean, isGenerationJobInFlight: boolean): string => {
  if (isPipelineJobInFlight) return 'Full pipeline in progress...';
  if (isGenerationJobInFlight) return 'Generate post in progress...';
  return 'Generate post with analysis';
};

const saveTitleForMissingResult = (
  context: SocialVisualAnalysisModalContext,
  metadata: VisualAnalysisModalMetadata
): string => {
  if (context.isSavedVisualAnalysisStale && context.hasSavedVisualAnalysis) {
    return 'Rerun image analysis before generating post copy from visuals.';
  }
  if (metadata.hasFailedStatus) return 'Rerun image analysis before generating post copy from visuals.';
  return 'Run image analysis before generating post copy from visuals.';
};

const saveButtonTitle = ({
  context,
  hasResult,
  isFollowUpGenerationInFlight,
  isVisualJobInFlight,
  metadata,
}: {
  context: SocialVisualAnalysisModalContext;
  hasResult: boolean;
  isFollowUpGenerationInFlight: boolean;
  isVisualJobInFlight: boolean;
  metadata: VisualAnalysisModalMetadata;
}): string => {
  if (isVisualJobInFlight || isFollowUpGenerationInFlight) return RUNTIME_BUSY_TITLE;
  if (!hasResult) return saveTitleForMissingResult(context, metadata);
  return 'Generate post with analysis';
};

const analyzeButtonTitle = ({
  isVisualJobInFlight,
  selection,
}: {
  isVisualJobInFlight: boolean;
  selection: VisualAnalysisModalSelectionState;
}): string => {
  if (selection.selectedCount === 0) {
    return 'Select at least one image add-on before running image analysis.';
  }
  if (selection.missingCount > 0) {
    return 'Some selected image add-ons are missing from the loaded list. Refresh the image add-ons or remove the missing selections before running image analysis.';
  }
  if (isVisualJobInFlight) return RUNTIME_BUSY_TITLE;
  return 'Analyze selected visuals';
};

export const buildVisualAnalysisModalRuntimeState = ({
  context,
  metadata,
  selection,
}: {
  context: SocialVisualAnalysisModalContext;
  metadata: VisualAnalysisModalMetadata;
  selection: VisualAnalysisModalSelectionState;
}): VisualAnalysisModalRuntimeState => {
  const isVisualJobInFlight = isVisualAnalysisJobInFlight(context);
  const isGenerationJobInFlight = isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentGenerationJob));
  const isPipelineJobInFlight = isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentPipelineJob));
  const isFollowUpGenerationInFlight = isGenerationJobInFlight || isPipelineJobInFlight;
  const hasResult = hasVisualAnalysisResult(context);

  return {
    analyzeButtonTitle: analyzeButtonTitle({ isVisualJobInFlight, selection }),
    analyzeText: isVisualJobInFlight ? 'Analyzing visuals...' : 'Analyze selected visuals',
    isAnalyzeDisabled: isVisualJobInFlight || selection.selectedCount === 0 || selection.missingCount > 0,
    isFollowUpGenerationInFlight,
    isSaveDisabled: !hasResult || isVisualJobInFlight || isFollowUpGenerationInFlight,
    isVisualAnalysisJobInFlight: isVisualJobInFlight,
    saveButtonTitle: saveButtonTitle({
      context,
      hasResult,
      isFollowUpGenerationInFlight,
      isVisualJobInFlight,
      metadata,
    }),
    saveText: saveButtonText(isPipelineJobInFlight, isGenerationJobInFlight),
  };
};
