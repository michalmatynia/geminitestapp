// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useCatalogsMock: vi.fn(),
  useIntegrationsWithConnectionsMock: vi.fn(),
}));

vi.mock('@/features/data-import-export/hooks/useImportQueries', () => ({
  useCatalogs: () => mocks.useCatalogsMock(),
}));

vi.mock('@/shared/hooks/useIntegrationQueries', () => ({
  useIntegrationsWithConnections: () => mocks.useIntegrationsWithConnectionsMock(),
}));

import { useImportExportBootstrapResources } from './useImportExportBootstrapResources';

describe('useImportExportBootstrapResources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not clear a saved connection while integrations are still loading', () => {
    mocks.useIntegrationsWithConnectionsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    mocks.useCatalogsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const setBaseConnections = vi.fn();
    const setCatalogId = vi.fn();
    const setIsBaseConnected = vi.fn();
    const setSelectedBaseConnectionId = vi.fn();

    renderHook(() =>
      useImportExportBootstrapResources({
        catalogId: '',
        catalogIdRef: { current: '' },
        hasInitializedCatalog: { current: false },
        selectedBaseConnectionId: '',
        selectedBaseConnectionIdRef: { current: 'saved-conn' },
        setBaseConnections,
        setCatalogId,
        setIsBaseConnected,
        setSelectedBaseConnectionId,
      })
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(setSelectedBaseConnectionId).not.toHaveBeenCalled();
    expect(setBaseConnections).toHaveBeenCalledWith([]);
    expect(setIsBaseConnected).toHaveBeenCalledWith(false);
  });

  it('does not overwrite saved connection or catalog when defaulting runs after hydration', () => {
    mocks.useIntegrationsWithConnectionsMock.mockReturnValue({
      data: [
        {
          slug: 'base',
          connections: [
            { id: 'saved-conn', name: 'Saved connection' },
            { id: 'conn-fallback', name: 'Fallback connection' },
          ],
        },
      ],
      isLoading: false,
    });
    mocks.useCatalogsMock.mockReturnValue({
      data: [
        { id: 'saved-cat', name: 'Saved catalog', isDefault: false },
        { id: 'cat-default', name: 'Default catalog', isDefault: true },
      ],
      isLoading: false,
    });

    const setBaseConnections = vi.fn();
    const setCatalogId = vi.fn();
    const setIsBaseConnected = vi.fn();
    const setSelectedBaseConnectionId = vi.fn();

    renderHook(() =>
      useImportExportBootstrapResources({
        catalogId: '',
        catalogIdRef: { current: 'saved-cat' },
        hasInitializedCatalog: { current: false },
        selectedBaseConnectionId: '',
        selectedBaseConnectionIdRef: { current: 'saved-conn' },
        setBaseConnections,
        setCatalogId,
        setIsBaseConnected,
        setSelectedBaseConnectionId,
      })
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(setSelectedBaseConnectionId).not.toHaveBeenCalled();
    expect(setCatalogId).not.toHaveBeenCalled();
  });
});
