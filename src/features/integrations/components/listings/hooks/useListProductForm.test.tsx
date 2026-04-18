// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BASE_EXPORT_MISSING_CATEGORY_MESSAGE } from '@/features/integrations/utils/baseExportPreflight';

const {
  toastMock,
  preflightTraderaQuickListSessionMock,
  ensureTraderaBrowserSessionMock,
  preflightVintedQuickListSessionMock,
  ensureVintedBrowserSessionMock,
  createListingMutateAsyncMock,
  exportToBaseMutateAsyncMock,
  updateDefaultTraderaConnectionMutateAsyncMock,
  updateDefaultVintedConnectionMutateAsyncMock,
  useListingSelectionMock,
  useListingBaseComSettingsMock,
  useListingTraderaSettingsMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  preflightTraderaQuickListSessionMock: vi.fn(),
  ensureTraderaBrowserSessionMock: vi.fn(),
  preflightVintedQuickListSessionMock: vi.fn(),
  ensureVintedBrowserSessionMock: vi.fn(),
  createListingMutateAsyncMock: vi.fn(),
  exportToBaseMutateAsyncMock: vi.fn(),
  updateDefaultTraderaConnectionMutateAsyncMock: vi.fn(),
  updateDefaultVintedConnectionMutateAsyncMock: vi.fn(),
  useListingSelectionMock: vi.fn(),
  useListingBaseComSettingsMock: vi.fn(),
  useListingTraderaSettingsMock: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
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
  useUpdateDefaultVintedConnection: () => ({
    mutateAsync: updateDefaultVintedConnectionMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/features/integrations/utils/tradera-browser-session', () => ({
  TRADERA_BROWSER_MANUAL_VERIFICATION_MESSAGE:
    'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.',
  TRADERA_BROWSER_SESSION_SAVE_FAILURE_MESSAGE:
    'Tradera login session could not be saved. Complete login verification and retry.',
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
    preflightTraderaQuickListSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [] },
      ready: true,
    });
    preflightVintedQuickListSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [] },
      ready: true,
    });
    ensureTraderaBrowserSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      savedSession: true,
    });
    ensureVintedBrowserSessionMock.mockResolvedValue({
      response: { ok: true, sessionReady: true, steps: [{ step: 'Saving session', status: 'ok' }] },
      savedSession: true,
    });
    createListingMutateAsyncMock.mockResolvedValue({
      queue: { jobId: 'job-tradera-1' },
    });
    exportToBaseMutateAsyncMock.mockResolvedValue({});
    updateDefaultTraderaConnectionMutateAsyncMock.mockResolvedValue({
      connectionId: 'conn-tradera-1',
    });
    updateDefaultVintedConnectionMutateAsyncMock.mockResolvedValue({
      connectionId: 'conn-vinted-1',
    });
  });

  it('blocks Base.com listing when the product has no internal category assigned', async () => {
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
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useListProductForm('product-1', null));

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(result.current.error).toBe(BASE_EXPORT_MISSING_CATEGORY_MESSAGE);
    expect(exportToBaseMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('blocks Base.com image retry when the product has no internal category assigned', async () => {
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
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useListProductForm('product-1', null));

    await act(async () => {
      await result.current.handleImageRetry(
        { id: 'preset-1', label: 'Base64', imageBase64Mode: 'base-only' },
        onSuccess
      );
    });

    expect(result.current.error).toBe(BASE_EXPORT_MISSING_CATEGORY_MESSAGE);
    expect(exportToBaseMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('runs fast Tradera quick preflight and persists the preferred connection for browser Tradera', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useListProductForm('product-1', 'category-1'));

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
      durationHours: 168,
      autoRelistEnabled: true,
      autoRelistLeadMinutes: 30,
      templateId: 'template-tradera-1',
    });
    expect(updateDefaultTraderaConnectionMutateAsyncMock).toHaveBeenCalledWith({
      connectionId: 'conn-tradera-1',
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
    const { result } = renderHook(() => useListProductForm('product-1', 'category-1'));

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
    expect(preflightTraderaQuickListSessionMock).not.toHaveBeenCalled();
    expect(updateDefaultTraderaConnectionMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows a toast and preserves the auth-required message when Tradera quick preflight needs manual verification', async () => {
    preflightTraderaQuickListSessionMock.mockRejectedValue(
      new Error(
        'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
      )
    );

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useListProductForm('product-1', 'category-1'));

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(result.current.authRequired).toBe(true);
    expect(result.current.error).toBe(
      'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
    );
    expect(createListingMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('treats a non-ready Tradera quick preflight response as auth-required recovery', async () => {
    preflightTraderaQuickListSessionMock.mockResolvedValueOnce({
      response: { ok: true, sessionReady: false, steps: [] },
      ready: false,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useListProductForm('product-1', 'category-1'));

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(result.current.authRequired).toBe(true);
    expect(result.current.authRequiredMarketplace).toBe('tradera');
    expect(result.current.error).toBe(
      'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
    );
    expect(createListingMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('refreshes the Tradera session and resumes listing after auth-required recovery', async () => {
    preflightTraderaQuickListSessionMock
      .mockRejectedValueOnce(
        new Error(
          'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
        )
      )
      .mockResolvedValueOnce({
        response: { ok: true, sessionReady: true, steps: [] },
        ready: true,
      });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useListProductForm('product-1', 'category-1'));

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(result.current.authRequired).toBe(true);
    expect(result.current.authRequiredMarketplace).toBe('tradera');

    await act(async () => {
      await result.current.handleMarketplaceLogin(onSuccess);
    });

    expect(ensureTraderaBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
    expect(toastMock).toHaveBeenCalledWith('Tradera login session refreshed.', {
      variant: 'success',
    });
    expect(createListingMutateAsyncMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
      durationHours: 168,
      autoRelistEnabled: true,
      autoRelistLeadMinutes: 30,
      templateId: 'template-tradera-1',
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('keeps Tradera auth recovery blocked when the manual login flow cannot save a session', async () => {
    preflightTraderaQuickListSessionMock.mockRejectedValueOnce(
      new Error(
        'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
      )
    );
    ensureTraderaBrowserSessionMock.mockResolvedValueOnce({
      response: { ok: true, sessionReady: true, steps: [] },
      savedSession: false,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useListProductForm('product-1', 'category-1'));

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    await act(async () => {
      await result.current.handleMarketplaceLogin(onSuccess);
    });

    expect(ensureTraderaBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
    expect(result.current.authRequired).toBe(true);
    expect(result.current.authRequiredMarketplace).toBe('tradera');
    expect(result.current.error).toBe(
      'Tradera login session could not be saved. Complete login verification and retry.'
    );
    expect(createListingMutateAsyncMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('surfaces Tradera product configuration failures from quick preflight before queueing', async () => {
    preflightTraderaQuickListSessionMock.mockRejectedValue(
      new Error(
        'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
      )
    );

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useListProductForm('product-1', 'category-1'));

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(createListingMutateAsyncMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.'
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('runs fast Vinted quick preflight and persists the preferred connection for Vinted browser listings', async () => {
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
    const { result } = renderHook(() => useListProductForm('product-1', 'category-1'));

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
    expect(updateDefaultVintedConnectionMutateAsyncMock).toHaveBeenCalledWith({
      connectionId: 'conn-vinted-1',
    });
    expect(toastMock).toHaveBeenCalledWith('Vinted.pl listing queued (job job-vinted-1).', {
      variant: 'success',
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('marks Vinted auth-required preflight failures and retries after a successful Vinted login refresh', async () => {
    useListingSelectionMock.mockReturnValue({
      selectedIntegrationId: 'integration-vinted-1',
      selectedConnectionId: 'conn-vinted-1',
      selectedIntegration: { id: 'integration-vinted-1', slug: 'vinted' },
      isBaseComIntegration: false,
      isTraderaIntegration: false,
    });
    preflightVintedQuickListSessionMock
      .mockResolvedValueOnce({
        response: { ok: true, sessionReady: false, steps: [] },
        ready: false,
      })
      .mockResolvedValueOnce({
        response: { ok: true, sessionReady: true, steps: [] },
        ready: true,
      });
    createListingMutateAsyncMock.mockResolvedValue({
      queue: { jobId: 'job-vinted-2' },
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useListProductForm('product-1', 'category-1'));

    await act(async () => {
      await result.current.handleSubmit(onSuccess);
    });

    expect(result.current.authRequired).toBe(true);
    expect(result.current.authRequiredMarketplace).toBe('vinted');
    expect(result.current.error).toBe(
      'Vinted.pl login requires manual verification. Solve the browser challenge in the opened window and retry.'
    );

    await act(async () => {
      await result.current.handleMarketplaceLogin(onSuccess);
    });

    expect(ensureVintedBrowserSessionMock).toHaveBeenCalledWith({
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
    });
    expect(toastMock).toHaveBeenCalledWith('Vinted.pl login session refreshed.', {
      variant: 'success',
    });
    expect(createListingMutateAsyncMock).toHaveBeenCalledWith({
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
    });
    expect(onSuccess).toHaveBeenCalled();
  });
});
