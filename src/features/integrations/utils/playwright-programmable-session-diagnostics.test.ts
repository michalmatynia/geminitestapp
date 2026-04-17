import { describe, expect, it } from 'vitest';

import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
  type PlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import { defaultIntegrationConnectionPlaywrightSettings } from '@/features/playwright/utils/playwright-settings-baseline';
import { buildProgrammableSessionPreview } from '@/features/playwright/utils/playwright-programmable-session-preview';

import { buildProgrammableSessionDiagnostics } from '@/features/playwright/utils/playwright-programmable-session-diagnostics';

const buildAction = (overrides: Partial<PlaywrightAction>): PlaywrightAction =>
  normalizePlaywrightAction({
    id: 'action-1',
    name: 'Action 1',
    description: null,
    runtimeKey: null,
    blocks: [],
    stepSetIds: [],
    personaId: null,
    executionSettings: defaultPlaywrightActionExecutionSettings,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
    ...overrides,
  });

describe('playwright programmable session diagnostics', () => {
  it('flags shared connection overrides that flatten divergent listing and import actions', () => {
    const personaBaseline = defaultIntegrationConnectionPlaywrightSettings;
    const currentSettings = {
      ...defaultIntegrationConnectionPlaywrightSettings,
      locale: 'pl-PL',
      timeout: 45_000,
    };

    const listingPreview = buildProgrammableSessionPreview({
      actions: [
        buildAction({
          id: 'listing-action',
          name: 'Listing action',
          executionSettings: {
            ...defaultPlaywrightActionExecutionSettings,
            locale: 'en-GB',
            timeout: 35_000,
          },
        }),
      ],
      selectedActionId: 'listing-action',
      defaultRuntimeKey: 'playwright_programmable_listing',
      personaBaseline,
      currentSettings,
      personas: undefined,
    });

    const importPreview = buildProgrammableSessionPreview({
      actions: [
        buildAction({
          id: 'import-action',
          name: 'Import action',
          executionSettings: {
            ...defaultPlaywrightActionExecutionSettings,
            locale: 'de-DE',
            timeout: 32_000,
          },
        }),
      ],
      selectedActionId: 'import-action',
      defaultRuntimeKey: 'playwright_programmable_import',
      personaBaseline,
      currentSettings,
      personas: undefined,
    });

    expect(
      buildProgrammableSessionDiagnostics({
        listingPreview,
        importPreview,
        currentSettings,
        personaBaseline,
      })
    ).toEqual({
      sharedOverrideSummary: ['Timeout', 'Locale'],
      divergentActionSummary: ['Timeout', 'Locale'],
      conflictingSharedOverrideSummary: ['Timeout', 'Locale'],
    });
  });

  it('keeps divergent actions visible when no shared override flattens them', () => {
    const personaBaseline = defaultIntegrationConnectionPlaywrightSettings;
    const currentSettings = defaultIntegrationConnectionPlaywrightSettings;

    const listingPreview = buildProgrammableSessionPreview({
      actions: [
        buildAction({
          id: 'listing-action',
          name: 'Listing action',
          executionSettings: {
            ...defaultPlaywrightActionExecutionSettings,
            headless: false,
          },
        }),
      ],
      selectedActionId: 'listing-action',
      defaultRuntimeKey: 'playwright_programmable_listing',
      personaBaseline,
      currentSettings,
      personas: undefined,
    });

    const importPreview = buildProgrammableSessionPreview({
      actions: [
        buildAction({
          id: 'import-action',
          name: 'Import action',
          executionSettings: {
            ...defaultPlaywrightActionExecutionSettings,
            headless: true,
          },
        }),
      ],
      selectedActionId: 'import-action',
      defaultRuntimeKey: 'playwright_programmable_import',
      personaBaseline,
      currentSettings,
      personas: undefined,
    });

    expect(
      buildProgrammableSessionDiagnostics({
        listingPreview,
        importPreview,
        currentSettings,
        personaBaseline,
      })
    ).toEqual({
      sharedOverrideSummary: [],
      divergentActionSummary: ['Headless mode'],
      conflictingSharedOverrideSummary: [],
    });
  });
});
