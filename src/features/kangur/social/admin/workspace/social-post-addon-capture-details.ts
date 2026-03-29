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

  return labels;
};
