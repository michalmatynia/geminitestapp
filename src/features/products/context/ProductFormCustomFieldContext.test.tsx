import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductWithImages } from '@/shared/contracts/products/product';

const { useCustomFieldsMock } = vi.hoisted(() => ({
  useCustomFieldsMock: vi.fn(),
}));

vi.mock('../hooks/useProductMetadataQueries', () => ({
  useCustomFields: useCustomFieldsMock,
}));

import {
  ProductFormCustomFieldProvider,
  useProductFormCustomFields,
} from './ProductFormCustomFieldContext';

describe('ProductFormCustomFieldProvider', () => {
  const definitions = [
    { id: 'notes', name: 'Notes', type: 'text', options: [] },
    {
      id: 'flags',
      name: 'Flags',
      type: 'checkbox_set',
      options: [
        { id: 'gift-ready', label: 'Gift Ready' },
        { id: 'fragile', label: 'Fragile' },
      ],
    },
  ] satisfies Partial<ProductCustomFieldDefinition>[];

  it('keeps an explicit empty text entry when clearing an existing value', () => {
    useCustomFieldsMock.mockReturnValue({
      data: definitions,
      isLoading: false,
    });

    const product = {
      customFields: [{ fieldId: 'notes', textValue: 'Handle with care' }],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(ProductFormCustomFieldProvider, { product }, children);

    const { result } = renderHook(() => useProductFormCustomFields(), { wrapper });

    act(() => {
      result.current.setTextValue('notes', '');
    });

    expect(result.current.customFieldValues).toEqual([{ fieldId: 'notes', textValue: '' }]);
  });

  it('keeps an explicit empty checkbox entry when clearing all selected options', () => {
    useCustomFieldsMock.mockReturnValue({
      data: definitions,
      isLoading: false,
    });

    const product = {
      customFields: [{ fieldId: 'flags', selectedOptionIds: ['gift-ready'] }],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(ProductFormCustomFieldProvider, { product }, children);

    const { result } = renderHook(() => useProductFormCustomFields(), { wrapper });

    act(() => {
      result.current.toggleSelectedOption('flags', 'gift-ready', false);
    });

    expect(result.current.customFieldValues).toEqual([
      { fieldId: 'flags', selectedOptionIds: [] },
    ]);
  });

  it('adopts refreshed product custom fields when the source value changes', () => {
    useCustomFieldsMock.mockReturnValue({
      data: definitions,
      isLoading: false,
    });

    let product = {
      customFields: [],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(ProductFormCustomFieldProvider, { product }, children);

    const { result, rerender } = renderHook(() => useProductFormCustomFields(), { wrapper });

    expect(result.current.customFieldValues).toEqual([]);

    product = {
      customFields: [{ fieldId: 'notes', textValue: 'Updated from server' }],
    } as Partial<ProductWithImages> as ProductWithImages;

    rerender();

    expect(result.current.customFieldValues).toEqual([
      { fieldId: 'notes', textValue: 'Updated from server' },
    ]);
  });

  it('filters stale field ids and removed option ids against current definitions', () => {
    useCustomFieldsMock.mockReturnValue({
      data: definitions,
      isLoading: false,
    });

    const product = {
      customFields: [
        { fieldId: 'notes', textValue: 'Keep me' },
        { fieldId: 'flags', selectedOptionIds: ['gift-ready', 'missing-option'] },
        { fieldId: 'deleted-field', textValue: 'Drop me' },
      ],
    } as Partial<ProductWithImages> as ProductWithImages;

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(ProductFormCustomFieldProvider, { product }, children);

    const { result } = renderHook(() => useProductFormCustomFields(), { wrapper });

    expect(result.current.customFieldValues).toEqual([
      { fieldId: 'notes', textValue: 'Keep me' },
      { fieldId: 'flags', selectedOptionIds: ['gift-ready'] },
    ]);
  });
});
