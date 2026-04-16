import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettingValueMock } = vi.hoisted(() => ({
  getSettingValueMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai/server-settings', () => ({
  getSettingValue: getSettingValueMock,
}));

import {
  buildResolvedActionSteps,
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
});
