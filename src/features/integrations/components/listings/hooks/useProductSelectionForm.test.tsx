// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  toastMock,
  ensureTraderaBrowserSessionMock,
  createListingMutateAsyncMock,
  exportToBaseMutateAsyncMock,
  useListingSelectionMock,
  useListingBaseComSettingsMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  ensureTraderaBrowserSessionMock: vi.fn(),
  createListingMutateAsyncMock: vi.fn(),
  exportToBaseMutateAsyncMock: vi.fn(),
  useListingSelectionMock: vi.fn(),
  useListingBaseComSettingsMock: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/integrations/context/ListingSettingsContext', () => ({
  useListingSelection: () => useListingSelectionMock(),
  useListingBaseComSettings: () => useListingBaseComSettingsMock(),
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

vi.mock('@/features/integrations/utils/tradera-browser-session', () => ({
  ensureTraderaBrowserSession: (...args: unknown[]) =>
    ensureTraderaBrowserSessionMock(...args) as Promise<unknown>,
  isTraderaBrowserAuthRequiredMessage: (value: string | null | undefined) => {
    const normalized = value?.trim().toLowerCase() ?? '';
    return (
      normalized.includes('auth_required') ||
      normalized.includes('manual verification') ||
      normalized.includes('captcha') ||
      normalized.includes('login requires') ||
      normalized.includes('session expired')
    );
  },
}));

import { useProductSelectionForm } from './useProductSelectionForm';

describe('useProductSelectionForm', () => {
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
      allowDuplicateSku: false,
    });
    ensureTraderaBrowserSessionMock.mockResolvedValue({
      response: { ok: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      savedSession: true,
    });
    createListingMutateAsyncMock.mockResolvedValue({
      queue: { jobId: 'job-tradera-1' },
    });
    exportToBaseMutateAsyncMock.mockResolvedValue({});
  });

  it('runs Tradera browser session preflight before creating a Tradera browser listing', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useProductSelectionForm());

    await act(async () => {
      result.current.setSelectedProductId('product-1');
    });

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
    });
    expect(toastMock).toHaveBeenCalledWith('Tradera login session refreshed.', {
      variant: 'success',
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows a toast and preserves the auth-required message when Tradera preflight needs manual verification', async () => {
    ensureTraderaBrowserSessionMock.mockRejectedValue(
      new Error(
        'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
      )
    );

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useProductSelectionForm());

    await act(async () => {
      result.current.setSelectedProductId('product-1');
    });

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(toastMock).toHaveBeenCalledWith(
      'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.',
      { variant: 'error' }
    );
    expect(result.current.error).toBe(
      'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
    );
    expect(createListingMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
