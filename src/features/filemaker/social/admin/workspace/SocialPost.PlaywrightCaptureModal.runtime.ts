import { useMemo } from 'react';

import {
  buildSocialPublishingCaptureFailureSummary,
  buildSocialPublishingCapturePrimaryIssueSummary,
} from '@/features/filemaker/social/shared/social-capture-feedback';
import {
  buildSocialPublishingProgrammableCaptureRuntimeRequestPreview,
  validateSocialPublishingProgrammableCaptureRoutes,
} from '@/features/filemaker/social/shared/social-playwright-capture';
import type { PlaywrightCaptureValidationResult } from '@/shared/contracts/playwright';
import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';

import type { useSocialPostContext } from './SocialPostContext';
import {
  captureAndRunPipelineText,
  captureAndRunPipelineTitle,
  captureSaveTitle,
  selectedPersonaLabel,
  SOCIAL_RUNTIME_LOCK_TITLE,
} from './SocialPost.PlaywrightCaptureModal.copy';
import {
  resolveCaptureProgressState,
  type CaptureProgressState,
} from './SocialPost.PlaywrightCaptureModal.progress';

export const PLAYWRIGHT_RUNTIME_PERSONA_VALUE = '';

export type SocialPostPlaywrightCaptureContext = ReturnType<typeof useSocialPostContext>;

export type PlaywrightPersonaOption = {
  label: string;
  value: string;
};

type SocialRuntimeJob = {
  id?: string;
  status?: string | null;
  failedReason?: string | null;
  progress?: {
    message?: string | null;
  } | null;
};

type RouteValidationState = {
  routeValidation: PlaywrightCaptureValidationResult;
  routeValidationById: Map<string, PlaywrightCaptureValidationResult['routes'][number]>;
};

type RuntimeJobsState = {
  currentGenerationJobTitle: string; currentPipelineJobTitle: string;
  currentVisualAnalysisJobTitle: string; hasAnyRuntimeJobStatus: boolean;
  hasBlockingRuntimeJob: boolean; isGenerationJobInFlight: boolean;
  isPipelineJobInFlight: boolean;
};

type CaptureFeedbackState = {
  programmableCaptureFailureTotal: number; programmableCaptureFailureSummary: string | null;
  programmableCapturePrimaryIssueSummary: string | null;
  recentProgrammableCaptureJobs: SocialPublishingImageAddonsBatchJob[];
};
export type SocialPostPlaywrightCaptureModalState = RouteValidationState &
  RuntimeJobsState &
  CaptureProgressState &
  CaptureFeedbackState & {
    canCaptureAndRunPipeline: boolean; canSave: boolean; captureAndRunPipelineText: string;
    captureAndRunPipelineTitle: string; captureSaveTitle: string;
    configLockTitle: string | undefined; hasValidCaptureConfig: boolean;
    isConfigEditingLocked: boolean; personaOptions: PlaywrightPersonaOption[];
    programmableConfigIssue: string | null;
    runtimeRequestPreview: ReturnType<
      typeof buildSocialPublishingProgrammableCaptureRuntimeRequestPreview
    >;
    selectedPersonaLabel: string;
  };

const hasText = (value: string | null | undefined): boolean =>
  (value?.trim().length ?? 0) > 0;

export const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (normalized === undefined || normalized.length === 0) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

const runtimeJobTitlePart = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

export const formatRuntimeJobTitle = (job: SocialRuntimeJob | null | undefined): string =>
  [
    runtimeJobTitlePart(job?.progress?.message),
    runtimeJobTitlePart(job?.failedReason),
    hasText(job?.id) ? `Queue job: ${job?.id ?? ''}` : null,
  ]
    .filter((value): value is string => value !== null)
    .join(' · ');

const runtimeJobStatus = (job: SocialRuntimeJob | null | undefined): string | null =>
  job?.status ?? null;

const hasRuntimeJobStatus = (job: SocialRuntimeJob | null | undefined): boolean =>
  hasText(runtimeJobStatus(job));

const hasAnyRuntimeJobStatus = (context: SocialPostPlaywrightCaptureContext): boolean =>
  hasRuntimeJobStatus(context.currentVisualAnalysisJob) ||
  hasRuntimeJobStatus(context.currentGenerationJob) ||
  hasRuntimeJobStatus(context.currentPipelineJob);

const usePersonaOptions = (
  personas: Array<{ id: string; name: string }> | undefined
): PlaywrightPersonaOption[] =>
  useMemo(
    () => [
      { value: PLAYWRIGHT_RUNTIME_PERSONA_VALUE, label: 'Default runtime persona' },
      ...(personas ?? []).map((persona) => ({
        value: persona.id,
        label: persona.name,
      })),
    ],
    [personas]
  );

const useRouteValidationState = (
  routes: SocialPublishingProgrammableCaptureRoute[],
  baseUrl: string
): RouteValidationState => {
  const routeValidation = useMemo(
    () => validateSocialPublishingProgrammableCaptureRoutes(routes, baseUrl),
    [baseUrl, routes]
  );
  const routeValidationById = useMemo(
    () => new Map(routeValidation.routes.map((route) => [route.routeId, route])),
    [routeValidation.routes]
  );

  return { routeValidation, routeValidationById };
};

const useRuntimeJobsState = (context: SocialPostPlaywrightCaptureContext): RuntimeJobsState => {
  const visualAnalysisInFlight = isSocialRuntimeJobInFlight(
    runtimeJobStatus(context.currentVisualAnalysisJob)
  );
  const generationInFlight = isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentGenerationJob));
  const pipelineInFlight = isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentPipelineJob));

  return {
    currentGenerationJobTitle: formatRuntimeJobTitle(context.currentGenerationJob),
    currentPipelineJobTitle: formatRuntimeJobTitle(context.currentPipelineJob),
    currentVisualAnalysisJobTitle: formatRuntimeJobTitle(context.currentVisualAnalysisJob),
    hasAnyRuntimeJobStatus: hasAnyRuntimeJobStatus(context),
    hasBlockingRuntimeJob: visualAnalysisInFlight || generationInFlight || pipelineInFlight,
    isGenerationJobInFlight: generationInFlight,
    isPipelineJobInFlight: pipelineInFlight,
  };
};

const resolveProgrammableConfigIssue = (
  context: SocialPostPlaywrightCaptureContext,
  routeValidation: PlaywrightCaptureValidationResult
): string | null => {
  if (context.programmableCaptureRoutes.length === 0) {
    return 'Add at least one route or seed routes from the current Social presets.';
  }
  if (context.programmableCaptureScript.trim().length === 0) {
    return 'Add a Playwright script before starting programmable capture.';
  }
  return routeValidation.firstIssue;
};

const hasValidCaptureConfig = (
  context: SocialPostPlaywrightCaptureContext,
  routeValidation: PlaywrightCaptureValidationResult
): boolean =>
  context.activePost !== null &&
  context.programmableCaptureRoutes.length > 0 &&
  context.programmableCaptureScript.trim().length > 0 &&
  routeValidation.isValid;

const buildCaptureFailureSummary = (
  context: SocialPostPlaywrightCaptureContext
): string | null => {
  const failures = context.programmableCaptureBatchCaptureJob?.result?.failures ?? [];
  if (failures.length === 0) return null;
  return buildSocialPublishingCaptureFailureSummary(failures, {
    routes: context.programmableCaptureRoutes,
  });
};

const buildCapturePrimaryIssueSummary = (
  context: SocialPostPlaywrightCaptureContext
): string | null => {
  const captureResults = context.programmableCaptureBatchCaptureJob?.result?.captureResults ?? [];
  if (captureResults.length === 0) return null;
  return buildSocialPublishingCapturePrimaryIssueSummary(captureResults, {
    routes: context.programmableCaptureRoutes,
  });
};

const recentProgrammableCaptureJobs = (
  jobs: SocialPublishingImageAddonsBatchJob[] | undefined
): SocialPublishingImageAddonsBatchJob[] =>
  (jobs ?? []).filter((job) => (job.request?.playwrightRoutes.length ?? 0) > 0);

const useCaptureFeedbackState = (
  context: SocialPostPlaywrightCaptureContext
): CaptureFeedbackState =>
  useMemo(() => {
    const failureTotal = context.programmableCaptureBatchCaptureJob?.result?.failures.length ?? 0;
    return {
      programmableCaptureFailureTotal: failureTotal,
      programmableCaptureFailureSummary: buildCaptureFailureSummary(context),
      programmableCapturePrimaryIssueSummary: buildCapturePrimaryIssueSummary(context),
      recentProgrammableCaptureJobs: recentProgrammableCaptureJobs(context.batchCaptureRecentJobs),
    };
  }, [
    context.batchCaptureRecentJobs,
    context.programmableCaptureBatchCaptureJob?.result,
    context.programmableCaptureRoutes,
  ]);

export const useSocialPostPlaywrightCaptureModalState = ({
  context,
  personas,
}: {
  context: SocialPostPlaywrightCaptureContext;
  personas: Array<{ id: string; name: string }> | undefined;
}): SocialPostPlaywrightCaptureModalState => {
  const personaOptions = usePersonaOptions(personas);
  const routeState = useRouteValidationState(
    context.programmableCaptureRoutes,
    context.programmableCaptureBaseUrl
  );
  const runtimeJobs = useRuntimeJobsState(context);
  const progress = resolveCaptureProgressState(context);
  const feedback = useCaptureFeedbackState(context);
  const programmableConfigIssue = resolveProgrammableConfigIssue(context, routeState.routeValidation);
  const validCaptureConfig = hasValidCaptureConfig(context, routeState.routeValidation);
  const isConfigEditingLocked = context.programmableCapturePending || runtimeJobs.hasBlockingRuntimeJob;
  const canSave = validCaptureConfig && !isConfigEditingLocked;

  return {
    ...routeState,
    ...runtimeJobs,
    ...progress,
    ...feedback,
    canCaptureAndRunPipeline: canSave && context.canGenerateSocialDraft,
    canSave,
    captureAndRunPipelineText: captureAndRunPipelineText(runtimeJobs),
    captureAndRunPipelineTitle: captureAndRunPipelineTitle({
      context,
      hasBlockingRuntimeJob: runtimeJobs.hasBlockingRuntimeJob,
      hasValidConfig: validCaptureConfig,
      issue: programmableConfigIssue,
    }),
    captureSaveTitle: captureSaveTitle({
      context,
      hasBlockingRuntimeJob: runtimeJobs.hasBlockingRuntimeJob,
      hasValidConfig: validCaptureConfig,
      issue: programmableConfigIssue,
    }),
    configLockTitle: isConfigEditingLocked ? SOCIAL_RUNTIME_LOCK_TITLE : undefined,
    hasValidCaptureConfig: validCaptureConfig,
    isConfigEditingLocked,
    personaOptions,
    programmableConfigIssue,
    runtimeRequestPreview: buildSocialPublishingProgrammableCaptureRuntimeRequestPreview({
      appearanceMode: context.captureAppearanceMode,
      personaId: context.programmableCapturePersonaId,
      routes: context.programmableCaptureRoutes,
      baseUrl: context.programmableCaptureBaseUrl,
    }),
    selectedPersonaLabel: selectedPersonaLabel(personaOptions, context.programmableCapturePersonaId),
  };
};
