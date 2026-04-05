import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductWithImages } from '@/shared/contracts/products/product';

const { useParametersMock } = vi.hoisted(() => ({
  useParametersMock: vi.fn(),
}));

vi.mock('../hooks/useProductMetadataQueries', () => ({
  useParameters: useParametersMock,
}));

import {
  ProductFormParameterProvider,
  resolvePrimaryParameterValue,
  useProductFormParameters,
} from './ProductFormParameterContext';

describe('resolvePrimaryParameterValue', () => {
  it('prefers the explicit default locale when it exists', () => {
    expect(
      resolvePrimaryParameterValue({
        en: 'English',
        default: 'Default',
        pl: 'Polski',
      })
    ).toBe('Default');
  });

  it('keeps a direct value only when it still matches a localized entry', () => {
    expect(
      resolvePrimaryParameterValue({
        en: 'English',
        pl: 'Polski',
      }, 'English')
    ).toBe('English');

    expect(
      resolvePrimaryParameterValue({
        en: 'English',
        pl: 'Polski',
      })
    ).toBe('');
  });

  it('falls back to the explicit direct value only when there are no localized values', () => {
    expect(resolvePrimaryParameterValue({}, 'Fallback')).toBe('Fallback');
  });
});

describe('ProductFormParameterProvider', () => {
  it('removes a parameter row from local state and tracks interaction', () => {
    useParametersMock.mockReturnValue({
      data: [
        { id: 'param-1', name_en: 'Condition' },
        { id: 'param-2', name_en: 'Material' },
      ] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    const onInteraction = vi.fn();
    const product = {
      parameters: [
        { parameterId: 'param-1', value: 'Used' },
        { parameterId: 'param-2', value: 'Steel' },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ProductFormParameterProvider,
        {
          product,
          selectedCatalogIds: ['catalog-1'],
          onInteraction,
        },
        children
      );

    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    act(() => {
      result.current.removeParameterValue(0);
    });

    expect(result.current.parameterValues).toEqual([{ parameterId: 'param-2', value: 'Steel' }]);
    expect(onInteraction).toHaveBeenCalledTimes(1);
  });

  it('keeps the parameter row when its localized value is cleared', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    const product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: 'Used',
          valuesByLanguage: { en: 'Used', pl: 'Uzywany' },
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ProductFormParameterProvider,
        {
          product,
          selectedCatalogIds: ['catalog-1'],
        },
        children
      );

    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    act(() => {
      result.current.updateParameterValueByLanguage(0, 'en', '');
    });

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: '',
        valuesByLanguage: { pl: 'Uzywany' },
      },
    ]);
  });

  it('updates English without removing the sibling Polish value', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    const product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: 'Used',
          valuesByLanguage: { en: 'Used', pl: 'Uzywany' },
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ProductFormParameterProvider,
        {
          product,
          selectedCatalogIds: ['catalog-1'],
        },
        children
      );

    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    act(() => {
      result.current.updateParameterValueByLanguage(0, 'en', 'Refurbished');
    });

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: 'Refurbished',
        valuesByLanguage: {
          en: 'Refurbished',
          pl: 'Uzywany',
        },
      },
    ]);
  });

  it('hydrates an explicitly blank saved parameter as a preserved row', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    const product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: '',
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ProductFormParameterProvider,
        {
          product,
          selectedCatalogIds: ['catalog-1'],
        },
        children
      );

    const { result } = renderHook(() => useProductFormParameters(), { wrapper });

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: '',
      },
    ]);
  });

  it('adopts refreshed product parameters when the modal receives updated product detail', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    let product = {
      parameters: [],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ProductFormParameterProvider,
        {
          product,
          selectedCatalogIds: ['catalog-1'],
        },
        children
      );

    const { result, rerender } = renderHook(() => useProductFormParameters(), { wrapper });

    expect(result.current.parameterValues).toEqual([]);

    product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: 'Used',
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    rerender();

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: 'Used',
      },
    ]);
  });

  it('preserves local parameter edits when refreshed product detail arrives later', () => {
    useParametersMock.mockReturnValue({
      data: [{ id: 'param-1', name_en: 'Condition' }] satisfies Partial<ProductParameter>[],
      isLoading: false,
    });

    let product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: '',
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        ProductFormParameterProvider,
        {
          product,
          selectedCatalogIds: ['catalog-1'],
        },
        children
      );

    const { result, rerender } = renderHook(() => useProductFormParameters(), { wrapper });

    act(() => {
      result.current.updateParameterValue(0, 'Local draft');
    });

    product = {
      parameters: [
        {
          parameterId: 'param-1',
          value: 'Inferred',
        },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    rerender();

    expect(result.current.parameterValues).toEqual([
      {
        parameterId: 'param-1',
        value: 'Local draft',
      },
    ]);
  });
});
