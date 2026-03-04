import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { inspectAiPathsSettingsMaintenanceMock, applyAiPathsSettingsMaintenanceMock } = vi.hoisted(
  () => ({
    inspectAiPathsSettingsMaintenanceMock: vi.fn(),
    applyAiPathsSettingsMaintenanceMock: vi.fn(),
  })
);

vi.mock('@/features/ai/ai-paths/server', () => ({
  AI_PATHS_MAINTENANCE_ACTION_IDS: [
    'compact_oversized_configs',
    'repair_path_index',
    'ensure_starter_workflow_defaults',
  ] as const,
  inspectAiPathsSettingsMaintenance: inspectAiPathsSettingsMaintenanceMock,
  applyAiPathsSettingsMaintenance: applyAiPathsSettingsMaintenanceMock,
}));

import { GET_handler, POST_handler } from './handler';

describe('ai-paths maintenance handler', () => {
  beforeEach(() => {
    inspectAiPathsSettingsMaintenanceMock.mockReset();
    applyAiPathsSettingsMaintenanceMock.mockReset();
  });

  it('returns the current maintenance report', async () => {
    inspectAiPathsSettingsMaintenanceMock.mockResolvedValue({
      scannedAt: '2026-03-03T10:00:00.000Z',
      pendingActions: 0,
      blockingActions: 0,
      actions: [],
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/settings/maintenance') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(inspectAiPathsSettingsMaintenanceMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      scannedAt: '2026-03-03T10:00:00.000Z',
      pendingActions: 0,
      blockingActions: 0,
      actions: [],
    });
  });

  it('passes canonical maintenance action ids to apply', async () => {
    applyAiPathsSettingsMaintenanceMock.mockResolvedValue({
      appliedActionIds: ['repair_path_index'],
      report: {
        scannedAt: '2026-03-03T10:00:00.000Z',
        pendingActions: 0,
        blockingActions: 0,
        actions: [],
      },
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/settings/maintenance', {
        method: 'POST',
        body: JSON.stringify({ actionIds: ['repair_path_index'] }),
      }) as Parameters<typeof POST_handler>[0],
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(applyAiPathsSettingsMaintenanceMock).toHaveBeenCalledWith(['repair_path_index']);
  });

  it('rejects deprecated compatibility action ids', async () => {
    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/ai-paths/settings/maintenance', {
          method: 'POST',
          body: JSON.stringify({ actionIds: ['upgrade_translation_en_pl'] }),
        }) as Parameters<typeof POST_handler>[0],
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow('Invalid AI Paths maintenance payload.');
    expect(applyAiPathsSettingsMaintenanceMock).not.toHaveBeenCalled();
  });
});
