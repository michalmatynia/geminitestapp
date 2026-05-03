/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toastMock, useIntegrationsWithConnectionsMock, useSearchParamsMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  useIntegrationsWithConnectionsMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationQueries', () => ({
  useIntegrationsWithConnections: () => useIntegrationsWithConnectionsMock(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock('nextjs-toploader/app', () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

import {
  type CategoryMapperMarketplace,
  CategoryMapperPageProvider,
  useCategoryMapperPageData,
  useCategoryMapperPageSelection,
} from './CategoryMapperPageContext';

function createWrapper(initialMarketplace?: CategoryMapperMarketplace) {
  return function Wrapper(props: { children: React.ReactNode }): React.JSX.Element {
    return (
      <CategoryMapperPageProvider initialMarketplace={initialMarketplace}>
        {props.children}
      </CategoryMapperPageProvider>
    );
  };
}

const BASE_INTEGRATION = {
  id: 'integration-base-1',
  name: 'Base.com',
  slug: 'base-com',
  connections: [
    { id: 'conn-base-1', name: 'Base Alpha', integrationId: 'integration-base-1' },
  ],
};

const TRADERA_INTEGRATION = {
  id: 'integration-tradera-1',
  name: 'Tradera',
  slug: 'tradera',
  connections: [
    { id: 'conn-tradera-1', name: 'Tradera Browser', integrationId: 'integration-tradera-1' },
  ],
};

const UNRELATED_INTEGRATION = {
  id: 'integration-shopify-1',
  name: 'Shopify',
  slug: 'shopify',
  connections: [
    { id: 'conn-shopify-1', name: 'Shopify Store', integrationId: 'integration-shopify-1' },
  ],
};

describe('CategoryMapperPageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    useIntegrationsWithConnectionsMock.mockReturnValue({
      data: [BASE_INTEGRATION, TRADERA_INTEGRATION, UNRELATED_INTEGRATION],
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  describe('marketplace slug filtering', () => {
    it('exposes Base.com and Tradera marketplace families', () => {
      const { result } = renderHook(() => useCategoryMapperPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.marketplaces).toEqual([
        expect.objectContaining({ value: 'base', label: 'Base.com' }),
        expect.objectContaining({ value: 'tradera', label: 'Tradera' }),
      ]);
    });

    it('includes Base.com integrations in the mapper', () => {
      const { result } = renderHook(() => useCategoryMapperPageData(), {
        wrapper: createWrapper(),
      });

      const slugs = result.current.integrations.map((i) => i.slug);
      expect(slugs).toContain('base-com');
    });

    it('includes Tradera browser integrations in the mapper', () => {
      useSearchParamsMock.mockReturnValue(new URLSearchParams('marketplace=tradera'));

      const { result } = renderHook(() => useCategoryMapperPageData(), {
        wrapper: createWrapper(),
      });

      const slugs = result.current.integrations.map((i) => i.slug);
      expect(slugs).toContain('tradera');
    });

    it('excludes unrelated integrations like Shopify', () => {
      const { result } = renderHook(() => useCategoryMapperPageData(), {
        wrapper: createWrapper(),
      });

      const slugs = result.current.integrations.map((i) => i.slug);
      expect(slugs).not.toContain('shopify');
    });

    it('returns only the selected marketplace family integrations at a time', () => {
      const { result } = renderHook(() => useCategoryMapperPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.integrations).toHaveLength(1);
      const slugs = new Set(result.current.integrations.map((i) => i.slug));
      expect(slugs).toEqual(new Set(['base-com']));
    });

    it('includes all Base.com variant slugs (baselinker, base, base-com)', () => {
      useIntegrationsWithConnectionsMock.mockReturnValue({
        data: [
          { ...BASE_INTEGRATION, slug: 'baselinker', id: 'bl-1', connections: [{ id: 'bl-c1', name: 'BL', integrationId: 'bl-1' }] },
          { ...BASE_INTEGRATION, slug: 'base', id: 'b-1', connections: [{ id: 'b-c1', name: 'B', integrationId: 'b-1' }] },
          { ...BASE_INTEGRATION, slug: 'base-com', id: 'bc-1', connections: [{ id: 'bc-c1', name: 'BC', integrationId: 'bc-1' }] },
        ],
        isLoading: false,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useCategoryMapperPageData(), {
        wrapper: createWrapper(),
      });

      const slugs = result.current.integrations.map((i) => i.slug);
      expect(slugs).toContain('baselinker');
      expect(slugs).toContain('base');
      expect(slugs).toContain('base-com');
    });

    it('performs case-insensitive slug matching', () => {
      useIntegrationsWithConnectionsMock.mockReturnValue({
        data: [
          { ...TRADERA_INTEGRATION, slug: 'Tradera' },
          { ...BASE_INTEGRATION, slug: 'Base-Com' },
        ],
        isLoading: false,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useCategoryMapperPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.integrations).toHaveLength(1);
      expect(new Set(result.current.integrations.map((i) => i.slug))).toEqual(
        new Set(['Tradera'])
      );
    });
  });

  describe('connection selection', () => {
    it('auto-selects the first available connection', () => {
      const { result } = renderHook(() => useCategoryMapperPageSelection(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedMarketplace).toBe('base');
      expect(result.current.selectedConnectionId).toBe('conn-base-1');
    });

    it('allows switching to the Tradera marketplace and selects its browser connection', () => {
      const { result } = renderHook(() => useCategoryMapperPageSelection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedMarketplace('tradera');
      });

      expect(result.current.selectedMarketplace).toBe('tradera');
      expect(result.current.selectedConnectionId).toBe('conn-tradera-1');
      expect(result.current.selectedConnection?.integration.slug).toBe('tradera');
    });

    it('preselects the requested connection from the URL when it exists', () => {
      useSearchParamsMock.mockReturnValue(new URLSearchParams('connectionId=conn-tradera-1'));

      const { result } = renderHook(() => useCategoryMapperPageSelection(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedConnectionId).toBe('conn-tradera-1');
      expect(result.current.selectedConnection?.integration.slug).toBe('tradera');
    });

    it('honors the requested marketplace from the URL even before a connection is chosen', () => {
      useSearchParamsMock.mockReturnValue(new URLSearchParams('marketplace=tradera'));

      const { result } = renderHook(() => useCategoryMapperPageSelection(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedMarketplace).toBe('tradera');
      expect(result.current.selectedMarketplaceLabel).toBe('Tradera');
      expect(result.current.selectedConnectionId).toBe('conn-tradera-1');
    });

    it('honors the initial marketplace prop for the legacy Base route', () => {
      const { result } = renderHook(() => useCategoryMapperPageSelection(), {
        wrapper: createWrapper('base'),
      });

      expect(result.current.selectedMarketplace).toBe('base');
      expect(result.current.selectedConnectionId).toBe('conn-base-1');
    });

    it('falls back to the first connection when the requested URL connection is unknown', () => {
      useSearchParamsMock.mockReturnValue(new URLSearchParams('connectionId=missing-connection'));

      const { result } = renderHook(() => useCategoryMapperPageSelection(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedConnectionId).toBe('conn-base-1');
    });

    it('marks Tradera connections as supported', () => {
      const { result } = renderHook(() => useCategoryMapperPageSelection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedMarketplace('tradera');
      });

      expect(result.current.isSupportedConnection).toBe(true);
    });

    it('shows no connection when the selected marketplace no longer has any connections', () => {
      const { result, rerender } = renderHook(() => useCategoryMapperPageSelection(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedMarketplace('tradera');
      });
      expect(result.current.selectedConnectionId).toBe('conn-tradera-1');

      // Simulate Tradera integration being removed from the data
      useIntegrationsWithConnectionsMock.mockReturnValue({
        data: [BASE_INTEGRATION],
        isLoading: false,
        isError: false,
        error: null,
      });
      rerender();

      expect(result.current.selectedMarketplace).toBe('tradera');
      expect(result.current.selectedConnectionId).toBeNull();
    });

    it('returns null when no integrations have connections', () => {
      useIntegrationsWithConnectionsMock.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      });

      const { result } = renderHook(() => useCategoryMapperPageSelection(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedConnectionId).toBeNull();
      expect(result.current.selectedConnection).toBeNull();
    });
  });

  describe('error handling', () => {
    it('toasts an error when the integrations query fails', () => {
      useIntegrationsWithConnectionsMock.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        error: new Error('Network failure'),
      });

      renderHook(() => useCategoryMapperPageData(), {
        wrapper: createWrapper(),
      });

      expect(toastMock).toHaveBeenCalledWith('Network failure', { variant: 'error' });
    });
  });
});
