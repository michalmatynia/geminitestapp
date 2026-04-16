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
    name_en: 'Original product',
    ...overrides,
  }) as ProductWithImages;

const createDeferred = <T,>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error?: unknown) => void;
} => {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('useProductFormSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMutationMock.mockResolvedValue({ id: 'created-product-id' });
    mocks.updateMutationMock.mockResolvedValue({ id: 'resolved-product-id' });
  });

  it('passes the original persisted product identity to the update mutation for stale-id recovery', async () => {
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
      originalNameEn: 'Original product',
    });
    expect(refreshImages).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate managed category and payload fields in update FormData', async () => {
    const product = createProduct();

    const { result } = renderHook(() => {
      const methods = useForm<ProductFormData>({
        defaultValues: {
          sku: 'SKU-UPDATED',
          categoryId: 'category-from-form',
          catalogIds: ['catalog-from-form'],
          tagIds: ['tag-from-form'],
          producerIds: ['producer-from-form'],
          imageLinks: ['https://example.com/old-image.jpg'],
          imageBase64s: ['data:image/png;base64,AAAA'],
          customFields: [
            {
              definitionId: 'field-1',
              value: 'from-form',
            },
          ],
          parameters: [
            {
              parameterId: 'param-from-form',
              value: 'from-form',
              valuesByLanguage: {},
            },
          ],
        } as ProductFormData,
      });

      return useProductFormSubmit({
        product,
        methods,
        imageSlots: [],
        imageLinks: ['https://example.com/normalized-image.jpg'],
        imageBase64s: ['data:image/png;base64,BBBB'],
        selectedCatalogIds: ['catalog-selected'],
        selectedCategoryId: 'category-selected',
        selectedTagIds: ['tag-selected'],
        selectedProducerIds: ['producer-selected'],
        selectedNoteIds: ['note-selected'],
        customFieldValues: [
          {
            definitionId: 'field-2',
            value: 'normalized',
          },
        ],
        parameterValues: [
          {
            parameterId: 'param-selected',
            value: 'selected',
            valuesByLanguage: {
              en: 'selected',
            },
          },
        ],
        studioProjectId: 'studio-1',
        refreshImages: vi.fn(),
      });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mocks.updateMutationMock).toHaveBeenCalledTimes(1);
    const submittedFormData = mocks.updateMutationMock.mock.calls[0]?.[0]?.data as FormData;
    expect(submittedFormData).toBeInstanceOf(FormData);
    expect(submittedFormData.getAll('categoryId')).toEqual(['category-selected']);
    expect(submittedFormData.getAll('catalogIds')).toEqual(['catalog-selected']);
    expect(submittedFormData.getAll('tagIds')).toEqual(['tag-selected']);
    expect(submittedFormData.getAll('producerIds')).toEqual(['producer-selected']);
    expect(submittedFormData.getAll('noteIds')).toEqual(['note-selected']);
    expect(submittedFormData.getAll('imageLinks')).toEqual([
      JSON.stringify(['https://example.com/normalized-image.jpg']),
    ]);
    expect(submittedFormData.getAll('imageBase64s')).toEqual([
      JSON.stringify(['data:image/png;base64,BBBB']),
    ]);
    expect(submittedFormData.getAll('customFields')).toHaveLength(1);
    expect(submittedFormData.getAll('parameters')).toHaveLength(1);
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

  it('submits product creation only once while a previous create request is still in flight', async () => {
    const deferredCreate = createDeferred<{ id: string }>();
    mocks.createMutationMock.mockImplementation(() => deferredCreate.promise);

    const { result } = renderHook(() => {
      const methods = useForm<ProductFormData>({
        defaultValues: {
          sku: 'SKU-NEW',
          name_en: 'Single submit product',
        } as ProductFormData,
      });

      return useProductFormSubmit({
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
        refreshImages: vi.fn(),
      });
    });

    let firstSubmitPromise: Promise<void> | undefined;
    let secondSubmitPromise: Promise<void> | undefined;

    await act(async () => {
      firstSubmitPromise = result.current.handleSubmit();
      secondSubmitPromise = result.current.handleSubmit();
      await Promise.resolve();
    });

    expect(mocks.createMutationMock).toHaveBeenCalledTimes(1);

    deferredCreate.resolve({ id: 'created-product-id' });

    await act(async () => {
      await Promise.all([firstSubmitPromise, secondSubmitPromise]);
    });

    expect(mocks.createMutationMock).toHaveBeenCalledTimes(1);
  });
});
