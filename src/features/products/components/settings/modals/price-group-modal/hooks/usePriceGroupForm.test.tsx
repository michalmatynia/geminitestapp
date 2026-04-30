// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PRICE_GROUP_SOURCE_PRICE_FIELD,
  type PriceGroup,
} from '@/shared/contracts/products/catalogs';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useSavePriceGroupMutation: () => ({
    isPending: false,
    mutateAsync: mocks.mutateAsync,
  }),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: vi.fn(),
}));

import { usePriceGroupForm } from './usePriceGroupForm';

const dependentPriceGroup: PriceGroup = {
  id: 'group-eur',
  groupId: 'EUR_RETAIL',
  name: 'Retail EUR',
  description: null,
  currencyId: 'EUR',
  currencyCode: 'EUR',
  isDefault: false,
  type: 'dependent',
  basePriceField: 'price',
  sourceGroupId: 'group-pln',
  priceMultiplier: 1.25,
  addToPrice: 3,
  createdAt: '2026-04-04T00:00:00.000Z',
  updatedAt: '2026-04-04T00:00:00.000Z',
};

const standardAdjustedPriceGroup: PriceGroup = {
  id: 'group-eur-standard',
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
  createdAt: '2026-04-04T00:00:00.000Z',
  updatedAt: '2026-04-04T00:00:00.000Z',
};

const sourcePriceDependentPriceGroup: PriceGroup = {
  ...dependentPriceGroup,
  id: 'group-retail',
  groupId: 'RETAIL_FROM_SOURCE',
  name: 'Retail from Source',
  basePriceField: PRICE_GROUP_SOURCE_PRICE_FIELD,
  sourceGroupId: null,
};

describe('usePriceGroupForm', () => {
  beforeEach(() => {
    mocks.mutateAsync.mockReset().mockResolvedValue(undefined);
    mocks.toast.mockReset();
  });

  it('hydrates dependent price-group values from the edited item', () => {
    const { result } = renderHook(() => usePriceGroupForm({ priceGroup: dependentPriceGroup }));

    expect(result.current.form).toMatchObject({
      name: 'Retail EUR',
      currencyCode: 'EUR',
      type: 'dependent',
      sourceGroupId: 'group-pln',
      priceMultiplier: 1.25,
      addToPrice: 3,
    });
  });

  it('normalizes legacy sourceGroupId values that point to group.groupId', () => {
    const priceGroup = {
      ...dependentPriceGroup,
      sourceGroupId: 'PLN_STANDARD',
    };
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
        createdAt: '2026-04-04T00:00:00.000Z',
        updatedAt: '2026-04-04T00:00:00.000Z',
      },
    ];
    const { result } = renderHook(() =>
      usePriceGroupForm({
        priceGroup,
        priceGroups,
      })
    );

    expect(result.current.form.sourceGroupId).toBe('group-pln');
  });

  it('re-normalizes a legacy sourceGroupId when price groups load after the form initializes', () => {
    const priceGroup = {
      ...dependentPriceGroup,
      sourceGroupId: 'PLN_STANDARD',
    };
    const canonicalPriceGroups = [
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
        createdAt: '2026-04-04T00:00:00.000Z',
        updatedAt: '2026-04-04T00:00:00.000Z',
      },
    ];

    const { result, rerender } = renderHook(
      ({ priceGroups }: { priceGroups: PriceGroup[] }) =>
        usePriceGroupForm({
          priceGroup,
          priceGroups,
        }),
      {
        initialProps: {
          priceGroups: [],
        },
      }
    );

    expect(result.current.form.sourceGroupId).toBe('PLN_STANDARD');

    rerender({
      priceGroups: canonicalPriceGroups,
    });

    expect(result.current.form.sourceGroupId).toBe('group-pln');
  });

  it('submits dependent-group pricing fields in the save payload', async () => {
    const { result } = renderHook(() => usePriceGroupForm({ priceGroup: dependentPriceGroup }));
    let saved = false;

    await act(async () => {
      saved = await result.current.handleSubmit();
    });

    expect(saved).toBe(true);
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      id: 'group-eur',
      data: {
        name: 'Retail EUR',
        currencyCode: 'EUR',
        isDefault: false,
        type: 'dependent',
        basePriceField: 'price',
        sourceGroupId: 'group-pln',
        priceMultiplier: 1.25,
        addToPrice: 3,
      },
    });
    expect(mocks.toast).toHaveBeenCalledWith('Price group saved.', { variant: 'success' });
  });

  it('submits sourcePrice as the dependent price source', async () => {
    const { result } = renderHook(() =>
      usePriceGroupForm({ priceGroup: sourcePriceDependentPriceGroup })
    );
    let saved = false;

    expect(result.current.form.sourceGroupId).toBe('__product_source_price__');

    await act(async () => {
      saved = await result.current.handleSubmit();
    });

    expect(saved).toBe(true);
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      id: 'group-retail',
      data: {
        name: 'Retail from Source',
        currencyCode: 'EUR',
        isDefault: false,
        type: 'dependent',
        basePriceField: 'sourcePrice',
        sourceGroupId: null,
        priceMultiplier: 1.25,
        addToPrice: 3,
      },
    });
  });

  it('blocks save when a dependent price group has no source price', async () => {
    const { result } = renderHook(() => usePriceGroupForm({ priceGroup: dependentPriceGroup }));
    let saved = true;

    act(() => {
      result.current.setForm((prev) => ({
        ...prev,
        sourceGroupId: '',
      }));
    });

    await act(async () => {
      saved = await result.current.handleSubmit();
    });

    expect(saved).toBe(false);
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('Dependent price groups require a source price.', {
      variant: 'error',
    });
  });

  it('preserves multiplier and add-to-price for standard groups', async () => {
    const { result } = renderHook(() =>
      usePriceGroupForm({ priceGroup: standardAdjustedPriceGroup })
    );
    let saved = false;

    await act(async () => {
      saved = await result.current.handleSubmit();
    });

    expect(saved).toBe(true);
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      id: 'group-eur-standard',
      data: {
        name: 'Standard EUR',
        currencyCode: 'EUR',
        isDefault: false,
        type: 'standard',
        basePriceField: 'price',
        sourceGroupId: null,
        priceMultiplier: 1.2,
        addToPrice: 5,
      },
    });
  });

  it('coerces runtime numeric input values before saving', async () => {
    const { result } = renderHook(() => usePriceGroupForm({ priceGroup: dependentPriceGroup }));
    let saved = false;

    act(() => {
      result.current.setForm((prev) => ({
        ...prev,
        priceMultiplier: '1.5' as unknown as number,
        addToPrice: '2.75' as unknown as number,
      }));
    });

    await act(async () => {
      saved = await result.current.handleSubmit();
    });

    expect(saved).toBe(true);
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      id: 'group-eur',
      data: {
        name: 'Retail EUR',
        currencyCode: 'EUR',
        isDefault: false,
        type: 'dependent',
        basePriceField: 'price',
        sourceGroupId: 'group-pln',
        priceMultiplier: 1.5,
        addToPrice: 2.75,
      },
    });
  });

  it('blocks save when a dependent price group would create a cycle', async () => {
    const priceGroup = {
      ...dependentPriceGroup,
      id: 'group-pln',
      groupId: 'PLN_STANDARD',
      name: 'Standard PLN',
      type: 'dependent' as const,
      sourceGroupId: '',
    };
    const priceGroups = [
      {
        ...dependentPriceGroup,
        id: 'group-eur',
        sourceGroupId: 'group-pln',
      },
    ];

    const { result } = renderHook(() =>
      usePriceGroupForm({
        priceGroup,
        priceGroups,
      })
    );

    act(() => {
      result.current.setForm((prev) => ({
        ...prev,
        type: 'dependent',
        sourceGroupId: 'group-eur',
      }));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Dependent price groups cannot reference themselves through a source-group cycle.',
      { variant: 'error' }
    );
  });

  it('detects cycles when legacy sourceGroupId values point to groupId', async () => {
    const priceGroup = {
      ...dependentPriceGroup,
      id: 'group-pln',
      groupId: 'PLN_STANDARD',
      name: 'Standard PLN',
      type: 'dependent' as const,
      sourceGroupId: '',
    };
    const priceGroups = [
      {
        ...dependentPriceGroup,
        id: 'group-eur',
        groupId: 'EUR_RETAIL',
        sourceGroupId: 'PLN_STANDARD',
      },
    ];

    const { result } = renderHook(() =>
      usePriceGroupForm({
        priceGroup,
        priceGroups,
      })
    );

    act(() => {
      result.current.setForm((prev) => ({
        ...prev,
        type: 'dependent',
        sourceGroupId: 'group-eur',
      }));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Dependent price groups cannot reference themselves through a source-group cycle.',
      { variant: 'error' }
    );
  });

  it('normalizes a submitted legacy sourceGroupId to the canonical group id', async () => {
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
        createdAt: '2026-04-04T00:00:00.000Z',
        updatedAt: '2026-04-04T00:00:00.000Z',
      },
    ];
    const { result } = renderHook(() =>
      usePriceGroupForm({
        priceGroup: dependentPriceGroup,
        priceGroups,
      })
    );

    act(() => {
      result.current.setForm((prev) => ({
        ...prev,
        sourceGroupId: 'PLN_STANDARD',
      }));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      id: 'group-eur',
      data: {
        name: 'Retail EUR',
        currencyCode: 'EUR',
        isDefault: false,
        type: 'dependent',
        basePriceField: 'price',
        sourceGroupId: 'group-pln',
        priceMultiplier: 1.25,
        addToPrice: 3,
      },
    });
  });
});
