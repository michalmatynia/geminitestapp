// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BASE_EXPORT_MISSING_CATEGORY_MESSAGE } from '@/features/integrations/utils/baseExportPreflight';

const {
  exportToBaseMutateAsyncMock,
  createListingMutateAsyncMock,
  updateDefaultTraderaConnectionMutateAsyncMock,
  updateDefaultVintedConnectionMutateAsyncMock,
  preflightTraderaQuickListSessionMock,
  preflightVintedQuickListSessionMock,
  ensureTraderaBrowserSessionMock,
  ensureVintedBrowserSessionMock,
  useMassListProductModalViewContextMock,
  useListingSelectionMock,
  useListingBaseComSettingsMock,
  onSuccessMock,
} = vi.hoisted(() => ({
  exportToBaseMutateAsyncMock: vi.fn(),
  createListingMutateAsyncMock: vi.fn(),
  updateDefaultTraderaConnectionMutateAsyncMock: vi.fn(),
  updateDefaultVintedConnectionMutateAsyncMock: vi.fn(),
  preflightTraderaQuickListSessionMock: vi.fn(),
  preflightVintedQuickListSessionMock: vi.fn(),
  ensureTraderaBrowserSessionMock: vi.fn(),
  ensureVintedBrowserSessionMock: vi.fn(),
  useMassListProductModalViewContextMock: vi.fn(),
  useListingSelectionMock: vi.fn(),
  useListingBaseComSettingsMock: vi.fn(),
  onSuccessMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ListingSettingsContext', () => ({
  useListingSelection: () => useListingSelectionMock(),
  useListingBaseComSettings: () => useListingBaseComSettingsMock(),
}));

vi.mock('@/features/integrations/hooks/useProductListingMutations', () => ({
  useGenericExportToBaseMutation: () => ({
    mutateAsync: exportToBaseMutateAsyncMock,
    isPending: false,
  }),
  useGenericCreateListingMutation: () => ({
    mutateAsync: createListingMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/integrations/hooks/useIntegrationMutations', () => ({
  useUpdateDefaultTraderaConnection: () => ({
    mutateAsync: updateDefaultTraderaConnectionMutateAsyncMock,
    isPending: false,
  }),
  useUpdateDefaultVintedConnection: () => ({
    mutateAsync: updateDefaultVintedConnectionMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/integrations/utils/tradera-browser-session', () => ({
  preflightTraderaQuickListSession: (...args: unknown[]) =>
    preflightTraderaQuickListSessionMock(...args) as Promise<unknown>,
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

vi.mock('@/features/integrations/utils/vinted-browser-session', () => ({
  preflightVintedQuickListSession: (...args: unknown[]) =>
    preflightVintedQuickListSessionMock(...args) as Promise<unknown>,
  ensureVintedBrowserSession: (...args: unknown[]) =>
    ensureVintedBrowserSessionMock(...args) as Promise<unknown>,
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

vi.mock('../mass-list-modal/context/MassListProductModalViewContext', () => ({
  useMassListProductModalViewContext: () => useMassListProductModalViewContextMock(),
}));

import { useMassListForm } from './useMassListForm';

describe('useMassListForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useMassListProductModalViewContextMock.mockReturnValue({
      productIds: ['product-1', 'product-2'],
      products: [
        { id: 'product-1', categoryId: 'category-1' },
        { id: 'product-2', categoryId: 'category-2' },
      ],
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
      onSuccess: onSuccessMock,
    });
    useListingSelectionMock.mockReturnValue({
      selectedConnectionId: 'conn-tradera-1',
      selectedIntegration: { id: 'integration-tradera-1', slug: 'tradera' },
      isBaseComIntegration: false,
      isTraderaIntegration: true,
    });
    useListingBaseComSettingsMock.mockReturnValue({
      selectedInventoryId: 'inventory-1',
      selectedTemplateId: 'template-base-1',
      allowDuplicateSku: true,
    });

    exportToBaseMutateAsyncMock.mockResolvedValue({});
    createListingMutateAsyncMock.mockResolvedValue({});
    updateDefaultTraderaConnectionMutateAsyncMock.mockResolvedValue({
      connectionId: 'conn-tradera-1',
    });
    updateDefaultVintedConnectionMutateAsyncMock.mockResolvedValue({
      connectionId: 'conn-vinted-1',
    });
    preflightTraderaQuickListSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [] },
      ready: true,
    });
    preflightVintedQuickListSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [] },
      ready: true,
    });
    ensureTraderaBrowserSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [] },
      savedSession: true,
    });
    ensureVintedBrowserSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      savedSession: true,
    });
  });

  it('exports every selected product to Base.com when bulk export is chosen', async () => {
    useMassListProductModalViewContextMock.mockReturnValue({
      productIds: ['product-1', 'product-2'],
      products: [
        { id: 'product-1', categoryId: 'category-1' },
        { id: 'product-2', categoryId: 'category-2' },
      ],
      integrationId: 'integration-base-1',
      connectionId: 'conn-base-1',
      onSuccess: onSuccessMock,
    });
    useListingSelectionMock.mockReturnValue({
      selectedConnectionId: 'conn-base-1',
      selectedIntegration: { id: 'integration-base-1', slug: 'baselinker' },
      isBaseComIntegration: true,
      isTraderaIntegration: false,
    });

    const { result } = renderHook(() => useMassListForm());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(exportToBaseMutateAsyncMock).toHaveBeenCalledTimes(2);
    expect(exportToBaseMutateAsyncMock).toHaveBeenNthCalledWith(1, {
      productId: 'product-1',
      connectionId: 'conn-base-1',
      inventoryId: 'inventory-1',
      allowDuplicateSku: true,
      requestId: expect.stringContaining('base-export-product-1-0-'),
      templateId: 'template-base-1',
    });
    expect(exportToBaseMutateAsyncMock).toHaveBeenNthCalledWith(2, {
      productId: 'product-2',
      connectionId: 'conn-base-1',
      inventoryId: 'inventory-1',
      allowDuplicateSku: true,
      requestId: expect.stringContaining('base-export-product-2-1-'),
      templateId: 'template-base-1',
    });
    expect(createListingMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('runs Vinted quick preflight for each product and persists the preferred connection once', async () => {
    useMassListProductModalViewContextMock.mockReturnValue({
      productIds: ['product-1', 'product-2'],
      products: [
        { id: 'product-1', categoryId: 'category-1' },
        { id: 'product-2', categoryId: 'category-2' },
      ],
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
      onSuccess: onSuccessMock,
    });
    useListingSelectionMock.mockReturnValue({
      selectedConnectionId: 'conn-vinted-1',
      selectedIntegration: { id: 'integration-vinted-1', slug: 'vinted' },
      isBaseComIntegration: false,
      isTraderaIntegration: false,
    });

    const { result } = renderHook(() => useMassListForm());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(preflightVintedQuickListSessionMock).toHaveBeenCalledTimes(2);
    expect(preflightVintedQuickListSessionMock).toHaveBeenNthCalledWith(1, {
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
      productId: 'product-1',
    });
    expect(preflightVintedQuickListSessionMock).toHaveBeenNthCalledWith(2, {
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
      productId: 'product-2',
    });
    expect(createListingMutateAsyncMock).toHaveBeenCalledTimes(2);
    expect(createListingMutateAsyncMock).toHaveBeenNthCalledWith(1, {
      productId: 'product-1',
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
    });
    expect(createListingMutateAsyncMock).toHaveBeenNthCalledWith(2, {
      productId: 'product-2',
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
    });
    expect(updateDefaultVintedConnectionMutateAsyncMock).toHaveBeenCalledTimes(1);
    expect(updateDefaultVintedConnectionMutateAsyncMock).toHaveBeenCalledWith({
      connectionId: 'conn-vinted-1',
    });
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('pauses a Tradera batch on auth-required, then resumes from the failed product after login', async () => {
    useMassListProductModalViewContextMock.mockReturnValue({
      productIds: ['product-1', 'product-2', 'product-3'],
      products: [
        { id: 'product-1', categoryId: 'category-1' },
        { id: 'product-2', categoryId: 'category-2' },
        { id: 'product-3', categoryId: 'category-3' },
      ],
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
      onSuccess: onSuccessMock,
    });
    preflightTraderaQuickListSessionMock
      .mockResolvedValueOnce({
        response: { ok: true, sessionReady: true, steps: [] },
        ready: true,
      })
      .mockRejectedValueOnce(
        new Error(
          'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
        )
      )
      .mockResolvedValueOnce({
        response: { ok: true, sessionReady: true, steps: [] },
        ready: true,
      })
      .mockResolvedValueOnce({
        response: { ok: true, sessionReady: true, steps: [] },
        ready: true,
      });

    const { result } = renderHook(() => useMassListForm());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.authRequired).toBe(true);
    expect(result.current.authRequiredMarketplace).toBe('tradera');
    expect(result.current.error).toBe(
      'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
    );
    expect(createListingMutateAsyncMock).toHaveBeenCalledTimes(1);
    expect(createListingMutateAsyncMock).toHaveBeenCalledWith({
      productId: 'product-1',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
    expect(updateDefaultTraderaConnectionMutateAsyncMock).toHaveBeenCalledTimes(1);
    expect(onSuccessMock).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleMarketplaceLogin();
    });

    expect(ensureTraderaBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
    expect(createListingMutateAsyncMock).toHaveBeenCalledTimes(3);
    expect(createListingMutateAsyncMock).toHaveBeenNthCalledWith(2, {
      productId: 'product-2',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
    expect(createListingMutateAsyncMock).toHaveBeenNthCalledWith(3, {
      productId: 'product-3',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
    expect(updateDefaultTraderaConnectionMutateAsyncMock).toHaveBeenCalledTimes(1);
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('keeps Vinted bulk recovery blocked when the manual login flow cannot save a session', async () => {
    useMassListProductModalViewContextMock.mockReturnValue({
      productIds: ['product-1', 'product-2'],
      products: [
        { id: 'product-1', categoryId: 'category-1' },
        { id: 'product-2', categoryId: 'category-2' },
      ],
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
      onSuccess: onSuccessMock,
    });
    useListingSelectionMock.mockReturnValue({
      selectedConnectionId: 'conn-vinted-1',
      selectedIntegration: { id: 'integration-vinted-1', slug: 'vinted' },
      isBaseComIntegration: false,
      isTraderaIntegration: false,
    });
    preflightVintedQuickListSessionMock.mockResolvedValueOnce({
      response: { ok: true, sessionReady: false, steps: [] },
      ready: false,
    });
    ensureVintedBrowserSessionMock.mockResolvedValueOnce({
      response: { ok: true, sessionReady: true, steps: [] },
      savedSession: false,
    });

    const { result } = renderHook(() => useMassListForm());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.authRequired).toBe(true);
    expect(result.current.authRequiredMarketplace).toBe('vinted');
    expect(result.current.error).toBe(
      'Vinted.pl login requires manual verification. Solve the browser challenge in the opened window and retry.'
    );
    expect(createListingMutateAsyncMock).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleMarketplaceLogin();
    });

    expect(ensureVintedBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
    });
    expect(result.current.error).toBe(
      'Vinted.pl login session could not be saved. Complete login verification and retry.'
    );
    expect(result.current.authRequired).toBe(true);
    expect(result.current.authRequiredMarketplace).toBe('vinted');
    expect(createListingMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccessMock).not.toHaveBeenCalled();
  });

  it('blocks Base.com bulk export when a selected product has no internal category assigned', async () => {
    useMassListProductModalViewContextMock.mockReturnValue({
      productIds: ['product-1', 'product-2'],
      products: [
        { id: 'product-1', categoryId: 'category-1' },
        { id: 'product-2', categoryId: null },
      ],
      integrationId: 'integration-base-1',
      connectionId: 'conn-base-1',
      onSuccess: onSuccessMock,
    });
    useListingSelectionMock.mockReturnValue({
      selectedConnectionId: 'conn-base-1',
      selectedIntegration: { id: 'integration-base-1', slug: 'baselinker' },
      isBaseComIntegration: true,
      isTraderaIntegration: false,
    });

    const { result } = renderHook(() => useMassListForm());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.error).toBe(BASE_EXPORT_MISSING_CATEGORY_MESSAGE);
    expect(exportToBaseMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccessMock).not.toHaveBeenCalled();
  });
});
