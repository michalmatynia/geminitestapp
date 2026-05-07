import { describe, expect, it } from 'vitest';

import { getSocialPostAddonCaptureDetailLabels } from './social-post-addon-capture-details';

describe('social-post-addon-capture-details', () => {
  it('formats persisted Playwright capture diagnostics into editor labels', () => {
    expect(
      getSocialPostAddonCaptureDetailLabels(
        {
          id: 'addon-1',
          title: 'Pricing hero capture',
          sourceLabel: 'Programmable Playwright capture',
          presetId: null,
          imageAsset: {
            id: 'asset-1',
            url: 'https://example.com/pricing.png',
          },
          playwrightPersonaId: 'persona-1',
          playwrightCaptureRouteId: 'pricing-route',
          playwrightCaptureRouteTitle: 'Pricing page',
          playwrightRunId: 'run-1',
          captureAppearanceMode: 'dark',
          playwrightCaptureMode: 'full-page',
          playwrightReadinessMode: 'networkidle',
          playwrightViewportPreset: 'tablet',
          playwrightAttemptCount: 2,
          playwrightCaptureDurationMs: 4200,
          playwrightCaptureStage: 'completed',
        },
        {
          personaNameById: new Map([['persona-1', 'Teacher reviewer']]),
        }
      )
    ).toEqual([
      'Source: Programmable Playwright capture',
      'Persona: Teacher reviewer (persona-1)',
      'Route: Pricing page (pricing-route)',
      'Run: run-1',
      'Appearance: dark',
      'Capture: Full page',
      'Ready: Network idle',
      'Viewport: Tablet',
      'Attempts: 2',
      'Duration: 4.2s',
      'Stage: Completed',
    ]);
  });
});
