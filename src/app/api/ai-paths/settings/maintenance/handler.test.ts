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
    'prune_deprecated_starter_workflows',
    'restore_static_recovery_bundle',
    'ensure_starter_workflow_defaults',
    'refresh_starter_workflow_configs',
    'normalize_runtime_kernel_settings',
  ] as const,
  inspectAiPathsSettingsMaintenance: inspectAiPathsSettingsMaintenanceMock,
  applyAiPathsSettingsMaintenance: applyAiPathsSettingsMaintenanceMock,
}));

import { getHandler, postHandler } from './handler';

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

    const response = await getHandler(
      new NextRequest('http://localhost/api/ai-paths/settings/maintenance'),
      {} as Parameters<typeof getHandler>[1]
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

    const response = await postHandler(
      new NextRequest('http://localhost/api/ai-paths/settings/maintenance', {
        method: 'POST',
        body: JSON.stringify({ actionIds: ['repair_path_index'] }),
      }),
      {} as Parameters<typeof postHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(applyAiPathsSettingsMaintenanceMock).toHaveBeenCalledWith(['repair_path_index']);
  });

  it('accepts static recovery restore action ids', async () => {
    applyAiPathsSettingsMaintenanceMock.mockResolvedValue({
      appliedActionIds: ['restore_static_recovery_bundle'],
      report: {
        scannedAt: '2026-03-03T10:00:00.000Z',
        pendingActions: 0,
        blockingActions: 0,
        actions: [],
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/ai-paths/settings/maintenance', {
        method: 'POST',
        body: JSON.stringify({ actionIds: ['restore_static_recovery_bundle'] }),
      }),
      {} as Parameters<typeof postHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(applyAiPathsSettingsMaintenanceMock).toHaveBeenCalledWith([
      'restore_static_recovery_bundle',
    ]);
  });

  it('accepts deprecated runtime-kernel mode alias and normalizes it before apply', async () => {
    applyAiPathsSettingsMaintenanceMock.mockResolvedValue({
      appliedActionIds: ['normalize_runtime_kernel_settings'],
      report: {
        scannedAt: '2026-03-03T10:00:00.000Z',
        pendingActions: 0,
        blockingActions: 0,
        actions: [],
      },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/ai-paths/settings/maintenance', {
        method: 'POST',
        body: JSON.stringify({ actionIds: ['normalize_runtime_kernel_mode'] }),
      }),
      {} as Parameters<typeof postHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(applyAiPathsSettingsMaintenanceMock).toHaveBeenCalledWith([
      'normalize_runtime_kernel_settings',
    ]);
  });

  it('rejects unknown compatibility action ids', async () => {
    await expect(
      postHandler(
        new NextRequest('http://localhost/api/ai-paths/settings/maintenance', {
          method: 'POST',
          body: JSON.stringify({ actionIds: ['upgrade_translation_en_pl'] }),
        }),
        {} as Parameters<typeof postHandler>[1]
      )
    ).rejects.toThrow('Invalid AI Paths maintenance payload.');
    expect(applyAiPathsSettingsMaintenanceMock).not.toHaveBeenCalled();
  });
});
