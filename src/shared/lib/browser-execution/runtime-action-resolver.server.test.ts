import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettingValueMock } = vi.hoisted(() => ({
  getSettingValueMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai/server-settings', () => ({
  getSettingValue: getSettingValueMock,
}));

import {
  buildResolvedActionSteps,
  resolvePlaywrightActionDefinitionById,
  resolveRuntimeActionDefinition,
  resolveRuntimeActionStepIds,
} from './runtime-action-resolver.server';

describe('runtime-action-resolver.server', () => {
  beforeEach(() => {
    getSettingValueMock.mockReset();
  });

  it('falls back to the seeded default runtime action when nothing is stored', async () => {
    getSettingValueMock.mockResolvedValue(null);

    await expect(resolveRuntimeActionStepIds('vinted_sync')).resolves.toEqual([
      'browser_preparation',
      'browser_open',
      'cookie_accept',
      'auth_check',
      'auth_login',
      'auth_manual',
      'sync_check',
      'image_upload',
      'title_fill',
      'description_fill',
      'price_set',
      'category_select',
      'brand_fill',
      'condition_set',
      'size_set',
      'publish',
      'publish_verify',
      'browser_close',
    ]);
  });

  it('uses enabled runtime_step blocks from the stored runtime action and ignores disabled ones', async () => {
    getSettingValueMock.mockResolvedValue(JSON.stringify([
      {
        id: 'custom_vinted_list',
        name: 'Custom Vinted List',
        description: null,
        runtimeKey: 'vinted_list',
        blocks: [
          { id: 'block_1', kind: 'runtime_step', refId: 'browser_open', enabled: true, label: null },
          { id: 'block_2', kind: 'runtime_step', refId: 'title_fill', enabled: true, label: 'Custom title' },
          { id: 'block_3', kind: 'runtime_step', refId: 'publish', enabled: false, label: null },
          { id: 'block_4', kind: 'runtime_step', refId: 'browser_close', enabled: true, label: null },
        ],
        stepSetIds: [],
        personaId: null,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
    ]));

    await expect(resolveRuntimeActionStepIds('vinted_list')).resolves.toEqual([
      'browser_open',
      'title_fill',
      'browser_close',
    ]);
  });

  it('falls back to the seeded runtime sequence when the stored runtime action is invalid', async () => {
    getSettingValueMock.mockResolvedValue(JSON.stringify([
      {
        id: 'invalid_tradera_sync',
        name: 'Invalid Tradera Sync',
        description: null,
        runtimeKey: 'tradera_quicklist_sync',
        blocks: [
          { id: 'block_1', kind: 'runtime_step', refId: 'browser_open', enabled: true, label: null },
          { id: 'block_2', kind: 'runtime_step', refId: 'publish', enabled: true, label: null },
          { id: 'block_3', kind: 'runtime_step', refId: 'publish_verify', enabled: true, label: null },
        ],
        stepSetIds: [],
        personaId: null,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
    ]));

    await expect(resolveRuntimeActionStepIds('tradera_quicklist_sync')).resolves.toEqual([
      'browser_preparation',
      'browser_open',
      'cookie_accept',
      'auth_check',
      'auth_login',
      'auth_manual',
      'sync_check',
      'image_upload',
      'title_fill',
      'description_fill',
      'listing_format_select',
      'price_set',
      'category_select',
      'attribute_select',
      'shipping_set',
      'publish',
      'publish_verify',
      'browser_close',
    ]);
  });

  it('builds pending browser execution steps from the resolved runtime sequence', async () => {
    getSettingValueMock.mockResolvedValue(JSON.stringify([
      {
        id: 'custom_tradera_status',
        name: 'Custom Tradera Status',
        description: null,
        runtimeKey: 'tradera_check_status',
        blocks: [
          { id: 'block_1', kind: 'runtime_step', refId: 'browser_open', enabled: true, label: null },
          { id: 'block_2', kind: 'runtime_step', refId: 'resolve_status', enabled: true, label: null },
        ],
        stepSetIds: [],
        personaId: null,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
    ]));

    await expect(buildResolvedActionSteps('tradera_check_status')).resolves.toEqual([
      { id: 'browser_open', label: 'Open browser', status: 'pending', message: null },
      { id: 'resolve_status', label: 'Resolve listing status', status: 'pending', message: null },
    ]);
  });

  it('resolves action-owned execution settings and runtime-step config for valid runtime actions', async () => {
    getSettingValueMock.mockResolvedValue(JSON.stringify([
      {
        id: 'custom_tradera_standard',
        name: 'Custom Tradera Standard',
        description: null,
        runtimeKey: 'tradera_standard_list',
        blocks: [
          {
            id: 'block_1',
            kind: 'runtime_step',
            refId: 'browser_preparation',
            enabled: true,
            label: null,
            config: {
              viewportWidth: 1440,
              viewportHeight: 900,
              settleDelayMs: 500,
              locale: 'en-US',
              timezoneId: 'Europe/Warsaw',
              userAgent: 'custom-ua',
              colorScheme: 'dark',
              reducedMotion: 'reduce',
              geolocationLatitude: 52.2297,
              geolocationLongitude: 21.0122,
              permissions: ['geolocation'],
            },
          },
          { id: 'block_2', kind: 'runtime_step', refId: 'browser_open', enabled: true, label: null },
        ],
        stepSetIds: [],
        personaId: null,
        executionSettings: {
          headless: false,
          browserPreference: 'chrome',
          emulateDevice: true,
          deviceName: 'Pixel 7',
          slowMo: 125,
          timeout: 45_000,
          navigationTimeout: 46_000,
          locale: 'en-US',
          timezoneId: 'Europe/Warsaw',
        },
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
    ]));

    await expect(resolveRuntimeActionDefinition('tradera_standard_list')).resolves.toMatchObject({
      id: 'custom_tradera_standard',
      executionSettings: {
        headless: false,
        browserPreference: 'chrome',
        slowMo: 125,
        timeout: 45_000,
        navigationTimeout: 46_000,
        locale: 'en-US',
        timezoneId: 'Europe/Warsaw',
      },
    });
    await expect(buildResolvedActionSteps('tradera_standard_list')).resolves.toEqual([
      {
        id: 'browser_preparation',
        label: 'Browser preparation',
        status: 'pending',
        message: null,
        config: {
          viewportWidth: 1440,
          viewportHeight: 900,
          settleDelayMs: 500,
          locale: 'en-US',
          timezoneId: 'Europe/Warsaw',
          userAgent: 'custom-ua',
          colorScheme: 'dark',
          reducedMotion: 'reduce',
          geolocationLatitude: 52.2297,
          geolocationLongitude: 21.0122,
          permissions: ['geolocation'],
        },
      },
      { id: 'browser_open', label: 'Open browser', status: 'pending', message: null },
    ]);
  });

  it('resolves a saved draft action by id', async () => {
    getSettingValueMock.mockResolvedValue(JSON.stringify([
      {
        id: 'programmable_draft_action',
        name: 'Programmable Draft',
        description: null,
        runtimeKey: null,
        blocks: [
          {
            id: 'block_1',
            kind: 'runtime_step',
            refId: 'browser_preparation',
            enabled: true,
            label: null,
            config: {
              viewportWidth: 1366,
              viewportHeight: 768,
            },
          },
        ],
        stepSetIds: [],
        personaId: null,
        executionSettings: {
          headless: false,
          browserPreference: 'brave',
        },
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
    ]));

    await expect(resolvePlaywrightActionDefinitionById('programmable_draft_action')).resolves.toMatchObject({
      id: 'programmable_draft_action',
      executionSettings: {
        headless: false,
        browserPreference: 'brave',
      },
    });
  });

  it('returns null for an invalid runtime action addressed by id', async () => {
    getSettingValueMock.mockResolvedValue(JSON.stringify([
      {
        id: 'invalid_programmable_runtime',
        name: 'Invalid Programmable Runtime',
        description: null,
        runtimeKey: 'tradera_quicklist_sync',
        blocks: [
          { id: 'block_1', kind: 'runtime_step', refId: 'publish', enabled: true, label: null },
        ],
        stepSetIds: [],
        personaId: null,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
    ]));

    await expect(resolvePlaywrightActionDefinitionById('invalid_programmable_runtime')).resolves.toBeNull();
  });
});
