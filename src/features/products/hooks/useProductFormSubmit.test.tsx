// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductFormData, ProductWithImages } from '@/shared/contracts/products';

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
});
