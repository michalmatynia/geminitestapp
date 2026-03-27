// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useIntegrationsData = vi.fn();
const useIntegrationsForm = vi.fn();
const useIntegrationsActions = vi.fn();
const useIntegrationsTesting = vi.fn();
const useSettings = vi.fn();
const useUpdateSettingsBulk = vi.fn();
const useDefaultExportConnection = vi.fn();
const useUpdateDefaultExportConnection = vi.fn();

vi.mock('@/features/integrations/context/IntegrationsContext', () => ({
  useIntegrationsData: () => useIntegrationsData(),
  useIntegrationsForm: () => useIntegrationsForm(),
  useIntegrationsActions: () => useIntegrationsActions(),
  useIntegrationsTesting: () => useIntegrationsTesting(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettings: () => useSettings(),
  useUpdateSettingsBulk: () => useUpdateSettingsBulk(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationQueries', () => ({
  useDefaultExportConnection: () => useDefaultExportConnection(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationMutations', () => ({
  useUpdateDefaultExportConnection: () => useUpdateDefaultExportConnection(),
}));

import { useBaselinkerSettingsState } from './useBaselinkerSettingsState';

describe('useBaselinkerSettingsState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIntegrationsActions.mockReturnValue({
      handleBaselinkerTest: vi.fn(),
    });
    useIntegrationsTesting.mockReturnValue({
      isTesting: false,
    });
    useSettings.mockReturnValue({
      data: [],
    });
    useUpdateSettingsBulk.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    useDefaultExportConnection.mockReturnValue({
      data: { connectionId: 'conn-2' },
    });
    useUpdateDefaultExportConnection.mockReturnValue({
      mutateAsync: vi.fn(),
    });
  });

  it('resolves the active connection from the editing connection id', () => {
    useIntegrationsData.mockReturnValue({
      connections: [
        {
          id: 'conn-1',
          name: 'First',
          hasBaseApiToken: false,
        },
        {
          id: 'conn-2',
          name: 'Second',
          hasBaseApiToken: true,
          baseTokenUpdatedAt: '2026-03-27T12:00:00.000Z',
        },
      ],
    });
    useIntegrationsForm.mockReturnValue({
      editingConnectionId: 'conn-2',
    });

    const { result } = renderHook(() => useBaselinkerSettingsState());

    expect(result.current.activeConnection?.id).toBe('conn-2');
    expect(result.current.baselinkerConnected).toBe(true);
    expect(result.current.defaultOneClickConnectionId).toBe('conn-2');
  });

  it('falls back to the first connection when no editing connection is selected', () => {
    useIntegrationsData.mockReturnValue({
      connections: [
        {
          id: 'conn-1',
          name: 'First',
          hasBaseApiToken: true,
        },
        {
          id: 'conn-2',
          name: 'Second',
          hasBaseApiToken: false,
        },
      ],
    });
    useIntegrationsForm.mockReturnValue({
      editingConnectionId: null,
    });

    const { result } = renderHook(() => useBaselinkerSettingsState());

    expect(result.current.activeConnection?.id).toBe('conn-1');
    expect(result.current.baselinkerConnected).toBe(true);
  });
});
