import { describe, expect, it } from 'vitest';

import {
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
  type PlaywrightAction,
} from '@/shared/contracts/playwright-steps';

import {
  buildProgrammableConnectionActionMigrationPreview,
  canCleanupProgrammableConnectionLegacyBrowserFields,
  hasProgrammableConnectionLegacyBrowserBehavior,
  mergePlaywrightActionsWithProgrammableConnectionDrafts,
} from './playwright-programmable-connection-migration';

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

describe('playwright programmable connection migration preview', () => {
  it('promotes legacy connection browser behavior into connection-specific draft actions', () => {
    const preview = buildProgrammableConnectionActionMigrationPreview({
      connection: {
        id: 'connection-1',
        name: 'Programmable Connection A',
        integrationId: 'integration-1',
        playwrightPersonaId: 'persona-marketplace',
        playwrightBrowser: 'brave',
        playwrightHeadless: false,
        playwrightLocale: 'pl-PL',
        playwrightProxyEnabled: true,
        playwrightProxyServer: 'http://proxy.test:8080',
        playwrightListingActionId: 'listing-base',
        playwrightImportActionId: 'import-base',
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
      actions: [
        buildAction({
          id: 'listing-base',
          name: 'Listing Base',
          executionSettings: {
            ...defaultPlaywrightActionExecutionSettings,
            timeout: 35_000,
          },
        }),
        buildAction({
          id: 'import-base',
          name: 'Import Base',
          executionSettings: {
            ...defaultPlaywrightActionExecutionSettings,
            slowMo: 120,
          },
        }),
      ],
    });

    expect(preview.hasLegacyBrowserBehavior).toBe(true);
    expect(preview.requiresManualProxyPasswordInput).toBe(false);
    expect(preview.legacySummary).toEqual(
      expect.arrayContaining([
        'Persona',
        'Browser preference',
        'Headless mode',
        'Locale',
        'Proxy enabled',
        'Proxy server',
      ])
    );
    expect(preview.listingDraftAction.name).toBe(
      'Programmable Connection A / Listing session'
    );
    expect(preview.listingDraftAction.runtimeKey).toBeNull();
    expect(preview.listingDraftAction.personaId).toBe('persona-marketplace');
    expect(preview.listingDraftAction.executionSettings).toMatchObject({
      browserPreference: 'brave',
      headless: false,
      locale: 'pl-PL',
      proxyEnabled: true,
      proxyServer: 'http://proxy.test:8080',
      timeout: 35_000,
    });
    expect(preview.importDraftAction.executionSettings).toMatchObject({
      browserPreference: 'brave',
      headless: false,
      locale: 'pl-PL',
      proxyEnabled: true,
      proxyServer: 'http://proxy.test:8080',
      slowMo: 120,
    });
    expect(preview.cleanupPayload).toEqual({
      resetPlaywrightOverrides: true,
    });
  });

  it('falls back to seeded programmable runtime actions when no action id is selected', () => {
    const preview = buildProgrammableConnectionActionMigrationPreview({
      connection: {
        id: 'connection-2',
        name: 'Programmable Connection B',
        integrationId: 'integration-1',
        playwrightPersonaId: null,
        playwrightBrowser: null,
        playwrightHeadless: undefined,
        playwrightLocale: null,
        playwrightListingActionId: null,
        playwrightImportActionId: null,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
      actions: [],
    });

    expect(preview.hasLegacyBrowserBehavior).toBe(false);
    expect(preview.requiresManualProxyPasswordInput).toBe(false);
    expect(preview.listingBaseAction.runtimeKey).toBe('playwright_programmable_listing');
    expect(preview.importBaseAction.runtimeKey).toBe('playwright_programmable_import');
    expect(preview.cleanupPayload.resetPlaywrightOverrides).toBe(false);
  });

  it('flags masked proxy passwords that must be re-entered before promotion', () => {
    const preview = buildProgrammableConnectionActionMigrationPreview({
      connection: {
        id: 'connection-3',
        name: 'Programmable Connection C',
        integrationId: 'integration-1',
        playwrightPersonaId: null,
        playwrightBrowser: null,
        playwrightProxyHasPassword: true,
        playwrightListingActionId: null,
        playwrightImportActionId: null,
      },
      actions: [],
    });

    expect(preview.hasLegacyBrowserBehavior).toBe(true);
    expect(preview.legacySummary).toContain('Proxy password');
    expect(preview.requiresManualProxyPasswordInput).toBe(true);
  });

  it('replaces existing connection draft actions in place when merging migrated drafts', () => {
    const merged = mergePlaywrightActionsWithProgrammableConnectionDrafts({
      actions: [
        buildAction({ id: 'seeded-listing', name: 'Seeded listing' }),
        buildAction({
          id: 'programmable_connection__connection-1__listing_session',
          name: 'Old listing draft',
        }),
      ],
      listingDraftAction: buildAction({
        id: 'programmable_connection__connection-1__listing_session',
        name: 'New listing draft',
      }),
      importDraftAction: buildAction({
        id: 'programmable_connection__connection-1__import_session',
        name: 'New import draft',
      }),
    });

    expect(merged.map((action) => action.id)).toEqual([
      'seeded-listing',
      'programmable_connection__connection-1__listing_session',
      'programmable_connection__connection-1__import_session',
    ]);
    expect(merged[1]?.name).toBe('New listing draft');
    expect(merged[2]?.name).toBe('New import draft');
  });

  it('detects when stored legacy browser fields can be cleaned after draft ownership is already in place', () => {
    expect(
      canCleanupProgrammableConnectionLegacyBrowserFields({
        connection: {
          id: 'connection-6',
          name: 'Programmable Connection F',
          integrationId: 'integration-1',
          playwrightPersonaId: 'persona-1',
          playwrightBrowser: 'chrome',
          playwrightListingActionId: 'programmable_connection__connection-6__listing_session',
          playwrightImportActionId: 'programmable_connection__connection-6__import_session',
        },
        actions: [
          buildAction({
            id: 'programmable_connection__connection-6__listing_session',
            name: 'Programmable Connection F / Listing session',
          }),
          buildAction({
            id: 'programmable_connection__connection-6__import_session',
            name: 'Programmable Connection F / Import session',
          }),
        ],
      })
    ).toBe(true);
  });

  it('detects when a programmable connection is already action-owned', () => {
    expect(
      hasProgrammableConnectionLegacyBrowserBehavior({
        id: 'connection-4',
        name: 'Programmable Connection D',
        integrationId: 'integration-1',
        playwrightPersonaId: null,
        playwrightBrowser: null,
        playwrightListingActionId: 'listing-draft',
        playwrightImportActionId: 'import-draft',
      })
    ).toBe(false);

    expect(
      hasProgrammableConnectionLegacyBrowserBehavior({
        id: 'connection-5',
        name: 'Programmable Connection E',
        integrationId: 'integration-1',
        playwrightPersonaId: 'persona-1',
        playwrightBrowser: null,
        playwrightListingActionId: 'listing-draft',
        playwrightImportActionId: 'import-draft',
      })
    ).toBe(true);
  });
});
