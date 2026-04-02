// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  toastMock,
  ensureTraderaBrowserSessionMock,
  createListingMutateAsyncMock,
  exportToBaseMutateAsyncMock,
  updateDefaultTraderaConnectionMutateAsyncMock,
  useListingSelectionMock,
  useListingBaseComSettingsMock,
  useListingTraderaSettingsMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  ensureTraderaBrowserSessionMock: vi.fn(),
  createListingMutateAsyncMock: vi.fn(),
  exportToBaseMutateAsyncMock: vi.fn(),
  updateDefaultTraderaConnectionMutateAsyncMock: vi.fn(),
  useListingSelectionMock: vi.fn(),
  useListingBaseComSettingsMock: vi.fn(),
  useListingTraderaSettingsMock: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/integrations/context/ListingSettingsContext', () => ({
  useListingSelection: () => useListingSelectionMock(),
  useListingBaseComSettings: () => useListingBaseComSettingsMock(),
  useListingTraderaSettings: () => useListingTraderaSettingsMock(),
}));

vi.mock('@/features/integrations/hooks/useProductListingMutations', () => ({
  useExportToBaseMutation: () => ({
    mutateAsync: exportToBaseMutateAsyncMock,
    isPending: false,
  }),
  useCreateListingMutation: () => ({
    mutateAsync: createListingMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/integrations/hooks/useIntegrationMutations', () => ({
  useUpdateDefaultTraderaConnection: () => ({
    mutateAsync: updateDefaultTraderaConnectionMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/integrations/utils/tradera-browser-session', () => ({
  ensureTraderaBrowserSession: (...args: unknown[]) =>
    ensureTraderaBrowserSessionMock(...args) as Promise<unknown>,
}));

import { useListProductForm } from './useListProductForm';

describe('useListProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useListingSelectionMock.mockReturnValue({
      selectedIntegrationId: 'integration-tradera-1',
      selectedConnectionId: 'conn-tradera-1',
      selectedIntegration: { id: 'integration-tradera-1', slug: 'tradera' },
      isBaseComIntegration: false,
      isTraderaIntegration: true,
    });
    useListingBaseComSettingsMock.mockReturnValue({
      selectedInventoryId: null,
      selectedTemplateId: 'none',
    });
    useListingTraderaSettingsMock.mockReturnValue({
      selectedTraderaDurationHours: 168,
      selectedTraderaAutoRelistEnabled: true,
      selectedTraderaAutoRelistLeadMinutes: 30,
      selectedTraderaTemplateId: 'template-tradera-1',
    });
    ensureTraderaBrowserSessionMock.mockResolvedValue({
      response: { ok: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      savedSession: true,
    });
    createListingMutateAsyncMock.mockResolvedValue({
      queue: { jobId: 'job-tradera-1' },
    });
    exportToBaseMutateAsyncMock.mockResolvedValue({});
    updateDefaultTraderaConnectionMutateAsyncMock.mockResolvedValue({
      connectionId: 'conn-tradera-1',
    });
  });

  it('runs Tradera browser session preflight and persists the preferred connection for browser Tradera', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useListProductForm('product-1'));

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(ensureTraderaBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
    expect(createListingMutateAsyncMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
      durationHours: 168,
      autoRelistEnabled: true,
      autoRelistLeadMinutes: 30,
      templateId: 'template-tradera-1',
    });
    expect(updateDefaultTraderaConnectionMutateAsyncMock).toHaveBeenCalledWith({
      connectionId: 'conn-tradera-1',
    });
    expect(toastMock).toHaveBeenCalledWith('Tradera login session refreshed.', {
      variant: 'success',
    });
    expect(toastMock).toHaveBeenCalledWith('Tradera listing queued (job job-tradera-1).', {
      variant: 'success',
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('skips browser session preflight and default persistence for Tradera API listings', async () => {
    useListingSelectionMock.mockReturnValue({
      selectedIntegrationId: 'integration-tradera-api-1',
      selectedConnectionId: 'conn-tradera-api-1',
      selectedIntegration: { id: 'integration-tradera-api-1', slug: 'tradera-api' },
      isBaseComIntegration: false,
      isTraderaIntegration: true,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useListProductForm('product-1'));

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    await waitFor(() => {
      expect(createListingMutateAsyncMock).toHaveBeenCalledWith({
        integrationId: 'integration-tradera-api-1',
        connectionId: 'conn-tradera-api-1',
        durationHours: 168,
        autoRelistEnabled: true,
        autoRelistLeadMinutes: 30,
        templateId: 'template-tradera-1',
      });
    });
    expect(ensureTraderaBrowserSessionMock).not.toHaveBeenCalled();
    expect(updateDefaultTraderaConnectionMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });
});
