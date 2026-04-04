// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mutateAsyncMock, toastMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useSaveCatalogMutation: () => ({
    mutateAsync: (...args: unknown[]) => mutateAsyncMock(...args),
    isPending: false,
  }),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: (...args: unknown[]) => toastMock(...args),
  }),
}));

import { useCatalogForm } from './useCatalogForm';

describe('useCatalogForm', () => {
  const languages = [
    {
      id: 'en',
      code: 'EN',
      name: 'English',
      nativeName: 'English',
      isDefault: true,
      isActive: true,
    },
  ];

  const priceGroups = [
    {
      id: 'group-pln',
      groupId: 'PLN_STANDARD',
      name: 'Standard PLN',
      description: null,
      currencyId: 'PLN',
      currencyCode: 'PLN',
      isDefault: true,
      type: 'standard',
      basePriceField: 'price',
      sourceGroupId: null,
      priceMultiplier: 1,
      addToPrice: 0,
    },
    {
      id: 'group-eur',
      groupId: 'EUR_STANDARD',
      name: 'Standard EUR',
      description: null,
      currencyId: 'EUR',
      currencyCode: 'EUR',
      isDefault: false,
      type: 'standard',
      basePriceField: 'price',
      sourceGroupId: null,
      priceMultiplier: 1.2,
      addToPrice: 5,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncMock.mockResolvedValue(undefined);
  });

  it('normalizes catalog price group identifiers from groupId to internal ids on load', async () => {
    const { result } = renderHook(() =>
      useCatalogForm({
        catalog: {
          id: 'catalog-1',
          name: 'Main catalog',
          description: null,
          isDefault: true,
          languageIds: ['en'],
          defaultLanguageId: 'en',
          priceGroupIds: ['PLN_STANDARD', 'group-eur'],
          defaultPriceGroupId: 'PLN_STANDARD',
        },
        languages,
        priceGroups,
        defaultGroupId: 'group-pln',
      })
    );

    await waitFor(() => {
      expect(result.current.catalogPriceGroupIds).toEqual(['group-pln', 'group-eur']);
      expect(result.current.catalogDefaultPriceGroupId).toBe('group-pln');
    });
  });

  it('saves normalized internal price group ids when state holds legacy groupId values', async () => {
    const { result } = renderHook(() =>
      useCatalogForm({
        catalog: {
          id: 'catalog-1',
          name: 'Main catalog',
          description: null,
          isDefault: true,
          languageIds: ['en'],
          defaultLanguageId: 'en',
          priceGroupIds: ['PLN_STANDARD', 'group-eur'],
          defaultPriceGroupId: 'PLN_STANDARD',
        },
        languages,
        priceGroups,
        defaultGroupId: 'group-pln',
      })
    );

    await waitFor(() => {
      expect(result.current.catalogPriceGroupIds).toEqual(['group-pln', 'group-eur']);
      expect(result.current.catalogDefaultPriceGroupId).toBe('group-pln');
    });

    act(() => {
      result.current.setCatalogDefaultPriceGroupId('PLN_STANDARD');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      id: 'catalog-1',
      data: expect.objectContaining({
        priceGroupIds: ['group-pln', 'group-eur'],
        defaultPriceGroupId: 'group-pln',
      }),
    });
  });
});
