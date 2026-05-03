// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BASE_EXPORT_MISSING_CATEGORY_MESSAGE } from '@/features/integrations/utils/baseExportPreflight';

const {
  toastMock,
  preflightTraderaQuickListSessionMock,
  preflightVintedQuickListSessionMock,
  createListingMutateAsyncMock,
  exportToBaseMutateAsyncMock,
  useListingSelectionMock,
  useListingBaseComSettingsMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  preflightTraderaQuickListSessionMock: vi.fn(),
  preflightVintedQuickListSessionMock: vi.fn(),
  createListingMutateAsyncMock: vi.fn(),
  exportToBaseMutateAsyncMock: vi.fn(),
  useListingSelectionMock: vi.fn(),
  useListingBaseComSettingsMock: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
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
  TRADERA_BROWSER_MANUAL_VERIFICATION_MESSAGE:
    'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.',
  preflightTraderaQuickListSession: (...args: unknown[]) =>
    preflightTraderaQuickListSessionMock(...args) as Promise<unknown>,
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

vi.mock('@/features/integrations/utils/vinted-browser-session', () => ({
  preflightVintedQuickListSession: (...args: unknown[]) =>
    preflightVintedQuickListSessionMock(...args) as Promise<unknown>,
  isVintedBrowserAuthRequiredMessage: (value: string | null | undefined) => {
    const normalized = value?.trim().toLowerCase() ?? '';
    return (
      normalized.includes('auth_required') ||
      normalized.includes('manual verification') ||
      normalized.includes('browser challenge') ||
      normalized.includes('could not be verified') ||
      normalized.includes('verification is incomplete') ||
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
    preflightTraderaQuickListSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [] },
      ready: true,
    });
    preflightVintedQuickListSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [] },
      ready: true,
    });
    createListingMutateAsyncMock.mockResolvedValue({
      queue: { jobId: 'job-tradera-1' },
    });
    exportToBaseMutateAsyncMock.mockResolvedValue({});
  });

  it('blocks Base.com listing when the selected product has no internal category assigned', async () => {
    useListingSelectionMock.mockReturnValue({
      selectedIntegrationId: 'integration-base-1',
      selectedConnectionId: 'conn-base-1',
      selectedIntegration: { id: 'integration-base-1', slug: 'base' },
      isBaseComIntegration: true,
      isTraderaIntegration: false,
    });
    useListingBaseComSettingsMock.mockReturnValue({
      selectedInventoryId: 'inventory-base-1',
      selectedTemplateId: 'template-base-1',
      allowDuplicateSku: false,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useProductSelectionForm(() => null));

    await act(async () => {
      result.current.setSelectedProductId('product-1');
    });

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(result.current.error).toBe(BASE_EXPORT_MISSING_CATEGORY_MESSAGE);
    expect(exportToBaseMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('runs fast Tradera quick preflight before creating a Tradera browser listing', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useProductSelectionForm(() => 'category-1'));

    await act(async () => {
      result.current.setSelectedProductId('product-1');
    });

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(preflightTraderaQuickListSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
      productId: 'product-1',
    });
    expect(createListingMutateAsyncMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows a toast and preserves the auth-required message when Tradera quick preflight needs manual verification', async () => {
    preflightTraderaQuickListSessionMock.mockRejectedValue(
      new Error(
        'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
      )
    );

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useProductSelectionForm(() => 'category-1'));

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

  it('shows a toast when Tradera quick preflight returns not ready without throwing', async () => {
    preflightTraderaQuickListSessionMock.mockResolvedValueOnce({
      response: { ok: true, sessionReady: false, steps: [] },
      ready: false,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useProductSelectionForm(() => 'category-1'));

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

  it('surfaces Tradera product configuration failures from quick preflight before creating a listing', async () => {
    preflightTraderaQuickListSessionMock.mockRejectedValue(
      new Error(
        'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
      )
    );

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useProductSelectionForm(() => 'category-1'));

    await act(async () => {
      result.current.setSelectedProductId('product-1');
    });

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(createListingMutateAsyncMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('runs fast Vinted quick preflight before creating a Vinted browser listing', async () => {
    useListingSelectionMock.mockReturnValue({
      selectedIntegrationId: 'integration-vinted-1',
      selectedConnectionId: 'conn-vinted-1',
      selectedIntegration: { id: 'integration-vinted-1', slug: 'vinted' },
      isBaseComIntegration: false,
      isTraderaIntegration: false,
    });
    createListingMutateAsyncMock.mockResolvedValue({
      queue: { jobId: 'job-vinted-1' },
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useProductSelectionForm(() => 'category-1'));

    await act(async () => {
      result.current.setSelectedProductId('product-1');
    });

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(preflightVintedQuickListSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
      productId: 'product-1',
    });
    expect(createListingMutateAsyncMock).toHaveBeenCalledWith({
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows a toast and preserves the auth-required message when Vinted quick preflight needs manual verification', async () => {
    useListingSelectionMock.mockReturnValue({
      selectedIntegrationId: 'integration-vinted-1',
      selectedConnectionId: 'conn-vinted-1',
      selectedIntegration: { id: 'integration-vinted-1', slug: 'vinted' },
      isBaseComIntegration: false,
      isTraderaIntegration: false,
    });
    preflightVintedQuickListSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: false, steps: [] },
      ready: false,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useProductSelectionForm(() => 'category-1'));

    await act(async () => {
      result.current.setSelectedProductId('product-1');
    });

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(toastMock).toHaveBeenCalledWith(
      'Vinted.pl login requires manual verification. Solve the browser challenge in the opened window and retry.',
      { variant: 'error' }
    );
    expect(result.current.error).toBe(
      'Vinted.pl login requires manual verification. Solve the browser challenge in the opened window and retry.'
    );
    expect(createListingMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
