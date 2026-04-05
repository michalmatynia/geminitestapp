import { describe, expect, it } from 'vitest';

import * as playwrightPublic from './public';

describe('playwright public barrel', () => {
  it('continues exposing the feature-facing UI and page surface', () => {
    expect(playwrightPublic).toHaveProperty('PlaywrightSettingsForm');
    expect(playwrightPublic).toHaveProperty('PlaywrightSettingsProvider');
    expect(playwrightPublic).toHaveProperty('PlaywrightEngineSettingsModal');
    expect(playwrightPublic).toHaveProperty('PlaywrightPersonasPage');
  });

  it('continues exposing settings, engine, hook, and persona utilities', () => {
    expect(playwrightPublic).toHaveProperty('defaultPlaywrightSettings');
    expect(playwrightPublic).toHaveProperty('PLAYWRIGHT_CAPTURE_TIMEOUT_MS');
    expect(playwrightPublic).toHaveProperty('usePlaywrightPersonas');
    expect(playwrightPublic).toHaveProperty('createPlaywrightPersonaId');
    expect(playwrightPublic).toHaveProperty('buildPlaywrightSettings');
  });
});
