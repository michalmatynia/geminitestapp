import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';

type SocialPostAddonCaptureDetailOptions = {
  personaNameById?: ReadonlyMap<string, string>;
};

export const getSocialPostAddonCaptureDetailLabels = (
  addon: KangurSocialImageAddon,
  options: SocialPostAddonCaptureDetailOptions = {}
): string[] => {
  const labels: string[] = [];
  const sourceLabel = addon.sourceLabel?.trim();
  const personaId = addon.playwrightPersonaId?.trim();
  const personaName = personaId ? options.personaNameById?.get(personaId)?.trim() : '';
  const routeTitle = addon.playwrightCaptureRouteTitle?.trim();
  const routeId = addon.playwrightCaptureRouteId?.trim();
  const presetId = addon.presetId?.trim();
  const runId = addon.playwrightRunId?.trim();
  const appearanceMode = addon.captureAppearanceMode?.trim();

  if (sourceLabel) {
    labels.push(`Source: ${sourceLabel}`);
  }
  if (personaId) {
    labels.push(personaName ? `Persona: ${personaName} (${personaId})` : `Persona: ${personaId}`);
  }
  if (routeTitle || routeId) {
    const routeLabel =
      routeTitle && routeId && routeTitle !== routeId
        ? `${routeTitle} (${routeId})`
        : routeTitle || routeId;
    labels.push(`Route: ${routeLabel}`);
  } else if (presetId) {
    labels.push(`Preset: ${presetId}`);
  }
  if (runId) {
    labels.push(`Run: ${runId}`);
  }
  if (appearanceMode) {
    labels.push(`Appearance: ${appearanceMode}`);
  }
  const addonAny = addon as KangurSocialImageAddon & {
    playwrightCaptureMode?: string;
    playwrightReadinessMode?: string;
    playwrightViewportPreset?: string;
    playwrightAttemptCount?: number;
    playwrightCaptureDurationMs?: number;
    playwrightCaptureStage?: string;
  };
  if (addonAny.playwrightCaptureMode) {
    const mode = addonAny.playwrightCaptureMode;
    labels.push(`Capture: ${mode === 'full-page' ? 'Full page' : mode === 'viewport' ? 'Viewport' : mode}`);
  }
  if (addonAny.playwrightReadinessMode) {
    const ready = addonAny.playwrightReadinessMode;
    labels.push(`Ready: ${ready === 'networkidle' ? 'Network idle' : ready === 'load' ? 'Load' : ready}`);
  }
  if (addonAny.playwrightViewportPreset) {
    const vp = addonAny.playwrightViewportPreset;
    labels.push(`Viewport: ${vp.charAt(0).toUpperCase() + vp.slice(1)}`);
  }
  if (addonAny.playwrightAttemptCount !== undefined) {
    labels.push(`Attempts: ${addonAny.playwrightAttemptCount}`);
  }
  if (addonAny.playwrightCaptureDurationMs !== undefined) {
    labels.push(`Duration: ${addonAny.playwrightCaptureDurationMs / 1000}s`);
  }
  if (addonAny.playwrightCaptureStage) {
    const stage = addonAny.playwrightCaptureStage;
    labels.push(`Stage: ${stage.charAt(0).toUpperCase() + stage.slice(1)}`);
  }

  return labels;
};
