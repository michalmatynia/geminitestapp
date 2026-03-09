/**
 * @vitest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import { PATH_CONFIG_PREFIX, PATH_INDEX_KEY } from '@/shared/lib/ai-paths/core/constants';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

import { useAdminAiPathsValidationState } from '../useAdminAiPathsValidationState';

const mocks = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
  useAiPathsSettingsQueryMock: vi.fn(),
  updateAiPathsSettingsBulkMock: vi.fn(async () => []),
  toastMock: vi.fn(),
  logClientErrorMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: mocks.useSearchParamsMock,
}));

vi.mock('@/shared/lib/ai-paths/hooks/useAiPathQueries', () => ({
  useAiPathsSettingsQuery: mocks.useAiPathsSettingsQueryMock,
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/settings-store-client')
  >('@/shared/lib/ai-paths/settings-store-client');
  return {
    ...actual,
    updateAiPathsSettingsBulk: mocks.updateAiPathsSettingsBulkMock,
  };
});

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: mocks.logClientErrorMock,
}));

const timestamp = '2026-03-09T10:00:00.000Z';

const buildLegacyTriggerConfig = (pathId: string) => {
  const config = createDefaultPathConfig(pathId);
  const seedNode = config.nodes[0] as AiNode | undefined;
  if (!seedNode) {
    throw new Error('Expected default path fixture to include at least one node.');
  }
  config.nodes = [
    {
      ...seedNode,
      type: 'trigger',
      title: 'Trigger: Opis i Tytul',
      inputs: ['context'],
      outputs: ['trigger', 'context', 'entityId', 'entityType'],
      config: {
        trigger: {
          event: 'manual',
          contextMode: 'simulation_preferred',
        },
      },
    },
  ];
  config.edges = [];
  return config;
};

const buildSettings = (config: ReturnType<typeof createDefaultPathConfig>) => [
  {
    key: PATH_INDEX_KEY,
    value: JSON.stringify([
      {
        id: config.id,
        name: config.name,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]),
  },
  {
    key: `${PATH_CONFIG_PREFIX}${config.id}`,
    value: JSON.stringify(config),
  },
];

describe('useAdminAiPathsValidationState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams(''));
  });

  it('persists repaired legacy trigger configs back to settings', async () => {
    const config = buildLegacyTriggerConfig('path_validation_legacy_trigger');
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(config),
    });

    const { rerender } = renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(mocks.updateAiPathsSettingsBulkMock).toHaveBeenCalledTimes(1);
    });

    const repairedRecords = mocks.updateAiPathsSettingsBulkMock.mock.calls[0]?.[0];
    expect(repairedRecords).toHaveLength(1);
    expect(repairedRecords?.[0]?.key).toBe(`${PATH_CONFIG_PREFIX}${config.id}`);
    expect(JSON.parse(repairedRecords?.[0]?.value ?? '{}')).toMatchObject({
      id: config.id,
      nodes: [
        {
          config: {
            trigger: {
              contextMode: 'trigger_only',
            },
          },
        },
      ],
    });

    rerender();

    await waitFor(() => {
      expect(mocks.updateAiPathsSettingsBulkMock).toHaveBeenCalledTimes(1);
    });
  });

  it('does not persist settings when no legacy trigger repair is needed', async () => {
    const config = createDefaultPathConfig('path_validation_clean');
    mocks.useAiPathsSettingsQueryMock.mockReturnValue({
      data: buildSettings(config),
    });

    renderHook(() => useAdminAiPathsValidationState());

    await waitFor(() => {
      expect(mocks.updateAiPathsSettingsBulkMock).not.toHaveBeenCalled();
    });
  });
});
