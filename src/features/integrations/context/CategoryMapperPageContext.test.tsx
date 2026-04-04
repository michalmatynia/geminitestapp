/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { toastMock, useIntegrationsWithConnectionsMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  useIntegrationsWithConnectionsMock: vi.fn(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationQueries', () => ({
  useIntegrationsWithConnections: () => useIntegrationsWithConnectionsMock(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

import {
  CategoryMapperPageProvider,
  useCategoryMapperPageData,
  useCategoryMapperPageSelection,
} from './CategoryMapperPageContext';

function createWrapper(initialMarketplace?: 'base' | 'tradera') {
  return function Wrapper(props: { children: React.ReactNode }): React.JSX.Element {
    return (
      <CategoryMapperPageProvider initialMarketplace={initialMarketplace}>
        {props.children}
      </CategoryMapperPageProvider>
    );
  };
}

describe('CategoryMapperPageContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIntegrationsWithConnectionsMock.mockReturnValue({
      data: [
        {
          id: 'integration-base-1',
          name: 'Base.com',
          slug: 'base-com',
          connections: [{ id: 'conn-base-1', name: 'Base Alpha', integrationId: 'integration-base-1' }],
        },
        {
          id: 'integration-tradera-1',
          name: 'Tradera',
          slug: 'tradera',
          connections: [
            { id: 'conn-tradera-1', name: 'Tradera Browser', integrationId: 'integration-tradera-1' },
          ],
        },
        {
          id: 'integration-tradera-api-1',
          name: 'Tradera API',
          slug: 'tradera-api',
          connections: [
            {
              id: 'conn-tradera-api-1',
              name: 'Tradera API Alpha',
              integrationId: 'integration-tradera-api-1',
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('defaults to Base.com and excludes Tradera API connections from the mapper', () => {
    const { result } = renderHook(
      () => ({
        data: useCategoryMapperPageData(),
        selection: useCategoryMapperPageSelection(),
      }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.selection.selectedMarketplace).toBe('base');
    expect(result.current.selection.selectedMarketplaceLabel).toBe('Base.com');
    expect(result.current.data.integrations).toHaveLength(1);
    expect(result.current.data.integrations[0]?.slug).toBe('base-com');
    expect(result.current.selection.selectedConnectionId).toBe('conn-base-1');
  });

  it('switches to browser Tradera connections only when Tradera is selected', () => {
    const { result } = renderHook(
      () => ({
        data: useCategoryMapperPageData(),
        selection: useCategoryMapperPageSelection(),
      }),
      {
        wrapper: createWrapper(),
      }
    );

    act(() => {
      result.current.selection.setSelectedMarketplace('tradera');
    });

    expect(result.current.selection.selectedMarketplace).toBe('tradera');
    expect(result.current.selection.selectedMarketplaceLabel).toBe('Tradera');
    expect(result.current.data.integrations).toHaveLength(1);
    expect(result.current.data.integrations[0]?.slug).toBe('tradera');
    expect(result.current.selection.selectedConnectionId).toBe('conn-tradera-1');
    expect(result.current.selection.selectedConnection?.integration.slug).toBe('tradera');
  });

  it('honors an initial Tradera marketplace selection', () => {
    const { result } = renderHook(
      () => ({
        data: useCategoryMapperPageData(),
        selection: useCategoryMapperPageSelection(),
      }),
      {
        wrapper: createWrapper('tradera'),
      }
    );

    expect(result.current.selection.selectedMarketplace).toBe('tradera');
    expect(result.current.data.integrations).toHaveLength(1);
    expect(result.current.selection.selectedConnectionId).toBe('conn-tradera-1');
  });
});
