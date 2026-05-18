import type { SocialPublishingImageAddon } from '@/shared/contracts/social-publishing-image-addons';

type SocialPostAddonCaptureDetailOptions = {
  personaNameById?: ReadonlyMap<string, string>;
};

type SocialPostAddonCaptureDetails = SocialPublishingImageAddon & {
  playwrightAttemptCount?: number;
  playwrightCaptureDurationMs?: number;
  playwrightCaptureMode?: string;
  playwrightCaptureStage?: string;
  playwrightReadinessMode?: string;
  playwrightViewportPreset?: string;
};

const trimOptional = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const appendLabel = (labels: string[], label: string | null): void => {
  if (label !== null) {
    labels.push(label);
  }
};

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const resolvePersonaLabel = (
  addon: SocialPostAddonCaptureDetails,
  options: SocialPostAddonCaptureDetailOptions
): string | null => {
  const personaId = trimOptional(addon.playwrightPersonaId);
  if (personaId === null) {
    return null;
  }

  const personaName = trimOptional(options.personaNameById?.get(personaId));
  return personaName === null
    ? `Persona: ${personaId}`
    : `Persona: ${personaName} (${personaId})`;
};

const resolveRouteLabelValue = ({
  routeId,
  routeTitle,
}: {
  routeId: string | null;
  routeTitle: string | null;
}): string | null => {
  if (routeTitle !== null && routeId !== null && routeTitle !== routeId) {
    return `${routeTitle} (${routeId})`;
  }
  return routeTitle ?? routeId;
};

const resolveRouteOrPresetLabel = (
  addon: SocialPostAddonCaptureDetails
): string | null => {
  const routeTitle = trimOptional(addon.playwrightCaptureRouteTitle);
  const routeId = trimOptional(addon.playwrightCaptureRouteId);
  const routeLabel = resolveRouteLabelValue({ routeId, routeTitle });
  if (routeLabel !== null) {
    return `Route: ${routeLabel}`;
  }

  const presetId = trimOptional(addon.presetId);
  return presetId === null ? null : `Preset: ${presetId}`;
};

const formatCaptureMode = (mode: string): string => {
  if (mode === 'full-page') {
    return 'Full page';
  }
  return mode === 'viewport' ? 'Viewport' : mode;
};

const formatReadinessMode = (mode: string): string => {
  if (mode === 'networkidle') {
    return 'Network idle';
  }
  return mode === 'load' ? 'Load' : mode;
};

const getBaseCaptureDetailLabels = (
  addon: SocialPostAddonCaptureDetails,
  options: SocialPostAddonCaptureDetailOptions
): string[] => {
  const labels: string[] = [];
  const sourceLabel = trimOptional(addon.sourceLabel);
  const runId = trimOptional(addon.playwrightRunId);
  const appearanceMode = trimOptional(addon.captureAppearanceMode);

  appendLabel(labels, sourceLabel === null ? null : `Source: ${sourceLabel}`);
  appendLabel(labels, resolvePersonaLabel(addon, options));
  appendLabel(labels, resolveRouteOrPresetLabel(addon));
  appendLabel(labels, runId === null ? null : `Run: ${runId}`);
  appendLabel(labels, appearanceMode === null ? null : `Appearance: ${appearanceMode}`);
  return labels;
};

const getPlaywrightDiagnosticLabels = (
  addon: SocialPostAddonCaptureDetails
): string[] => {
  const labels: string[] = [];
  const captureMode = trimOptional(addon.playwrightCaptureMode);
  const readinessMode = trimOptional(addon.playwrightReadinessMode);
  const viewportPreset = trimOptional(addon.playwrightViewportPreset);
  const stage = trimOptional(addon.playwrightCaptureStage);

  appendLabel(labels, captureMode === null ? null : `Capture: ${formatCaptureMode(captureMode)}`);
  appendLabel(labels, readinessMode === null ? null : `Ready: ${formatReadinessMode(readinessMode)}`);
  appendLabel(labels, viewportPreset === null ? null : `Viewport: ${capitalize(viewportPreset)}`);
  if (addon.playwrightAttemptCount !== undefined) {
    labels.push(`Attempts: ${addon.playwrightAttemptCount}`);
  }
  if (addon.playwrightCaptureDurationMs !== undefined) {
    labels.push(`Duration: ${addon.playwrightCaptureDurationMs / 1000}s`);
  }
  appendLabel(labels, stage === null ? null : `Stage: ${capitalize(stage)}`);
  return labels;
};

export const getSocialPostAddonCaptureDetailLabels = (
  addon: SocialPublishingImageAddon,
  options: SocialPostAddonCaptureDetailOptions = {}
): string[] => {
  const captureDetails: SocialPostAddonCaptureDetails = addon;
  return [
    ...getBaseCaptureDetailLabels(captureDetails, options),
    ...getPlaywrightDiagnosticLabels(captureDetails),
  ];
};
