// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';

const mocks = vi.hoisted(() => ({
  createMutationMock: vi.fn(),
  updateMutationMock: vi.fn(),
  toastMock: vi.fn(),
  confirmMock: vi.fn(),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: mocks.toastMock,
  }),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mocks.confirmMock,
    ConfirmationModal: () => React.createElement(React.Fragment),
  }),
}));

vi.mock('./useProductDataMutations', () => ({
  useCreateProductMutation: () => ({
    mutateAsync: mocks.createMutationMock,
  }),
  useUpdateProductMutation: () => ({
    mutateAsync: mocks.updateMutationMock,
  }),
}));

import { useProductFormSubmit } from './useProductFormSubmit';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'stale-product-id',
    sku: 'SKU-ORIGINAL',
    ...overrides,
  }) as ProductWithImages;

describe('useProductFormSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMutationMock.mockResolvedValue({ id: 'created-product-id' });
    mocks.updateMutationMock.mockResolvedValue({ id: 'resolved-product-id' });
  });

  it('passes the original persisted SKU to the update mutation for stale-id recovery', async () => {
    const product = createProduct();
    const refreshImages = vi.fn();

    const { result } = renderHook(() => {
      const methods = useForm<ProductFormData>({
        defaultValues: {
          sku: 'SKU-UPDATED',
        } as ProductFormData,
      });

      return useProductFormSubmit({
        product,
        methods,
        imageSlots: [],
        imageLinks: [],
        imageBase64s: [],
        selectedCatalogIds: [],
        selectedCategoryId: null,
        selectedTagIds: [],
        selectedProducerIds: [],
        selectedNoteIds: [],
        customFieldValues: [],
        parameterValues: [],
        studioProjectId: null,
        refreshImages,
      });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mocks.updateMutationMock).toHaveBeenCalledTimes(1);
    expect(mocks.updateMutationMock).toHaveBeenCalledWith({
      id: 'stale-product-id',
      data: expect.any(FormData),
      originalSku: 'SKU-ORIGINAL',
    });
    expect(refreshImages).toHaveBeenCalledTimes(1);
  });

  it('surfaces create mutation errors from structured title validation', async () => {
    mocks.createMutationMock.mockRejectedValue(
      new Error('Structured product name category must match the selected category.')
    );

    const { result } = renderHook(() => {
      const methods = useForm<ProductFormData>({
        defaultValues: {
          sku: 'SKU-NEW',
          name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
        } as ProductFormData,
      });

      return useProductFormSubmit({
        methods,
        imageSlots: [],
        imageLinks: [],
        imageBase64s: [],
        selectedCatalogIds: ['catalog-1'],
        selectedCategoryId: 'category-1',
        selectedTagIds: [],
        selectedProducerIds: [],
        selectedNoteIds: [],
        customFieldValues: [],
        parameterValues: [],
        studioProjectId: null,
        refreshImages: vi.fn(),
      });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mocks.createMutationMock).toHaveBeenCalledTimes(1);
    expect(result.current.uploadError).toBe(
      'Structured product name category must match the selected category.'
    );
  });

  it('serializes linked title-term parameters into the create payload FormData', async () => {
    const { result } = renderHook(() => {
      const methods = useForm<ProductFormData>({
        defaultValues: {
          sku: 'SKU-LINKED',
          name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
        } as ProductFormData,
      });

      return useProductFormSubmit({
        methods,
        imageSlots: [],
        imageLinks: [],
        imageBase64s: [],
        selectedCatalogIds: ['catalog-1'],
        selectedCategoryId: null,
        selectedTagIds: [],
        selectedProducerIds: [],
        selectedNoteIds: [],
        customFieldValues: [],
        parameterValues: [
          {
            parameterId: 'param-material',
            value: 'Metal',
            valuesByLanguage: {
              en: 'Metal',
              pl: 'Metal PL',
            },
          },
        ],
        studioProjectId: null,
        refreshImages: vi.fn(),
      });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mocks.createMutationMock).toHaveBeenCalledTimes(1);
    const submittedFormData = mocks.createMutationMock.mock.calls[0]?.[0] as FormData;
    expect(submittedFormData).toBeInstanceOf(FormData);
    expect(JSON.parse(String(submittedFormData.get('parameters')))).toEqual([
      {
        parameterId: 'param-material',
        value: 'Metal',
        valuesByLanguage: {
          en: 'Metal',
          pl: 'Metal PL',
        },
      },
    ]);
  });
});
