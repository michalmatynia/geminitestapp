/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductFormSubmit } from '@/features/products/hooks/useProductFormSubmit';
import type { ProductFormData, ProductWithImages } from '@/shared/contracts/products';
import type { UseFormReturn } from 'react-hook-form';

const mocks = vi.hoisted(() => {
  const queryClient = {
    setQueryData: vi.fn(),
    setQueriesData: vi.fn(),
    invalidateQueries: vi.fn(),
  };

  return {
    queryClient,
    toast: vi.fn(),
    confirm: vi.fn(),
    updateMutateAsync: vi.fn(),
    createMutateAsync: vi.fn(),
  };
});

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mocks.queryClient,
}));

vi.mock('@/features/products/hooks/useProductData', () => ({
  useCreateProductMutation: () => ({
    mutateAsync: mocks.createMutateAsync,
    isPending: false,
  }),
  useUpdateProductMutation: () => ({
    mutateAsync: mocks.updateMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mocks.confirm,
    ConfirmationModal: () => null,
  }),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

const buildMethods = (
  payload: ProductFormData
): UseFormReturn<ProductFormData> =>
  ({
    handleSubmit:
      (onValid: (data: ProductFormData) => Promise<void>) =>
        async (): Promise<void> =>
          onValid(payload),
  }) as UseFormReturn<ProductFormData>;

describe('useProductFormSubmit', () => {
  beforeEach(() => {
    mocks.queryClient.setQueryData.mockReset();
    mocks.queryClient.setQueriesData.mockReset();
    mocks.queryClient.invalidateQueries.mockReset();
    mocks.toast.mockReset();
    mocks.confirm.mockReset();
    mocks.updateMutateAsync.mockReset();
    mocks.createMutateAsync.mockReset();
  });

  it('calls edit callbacks immediately after mutation success without waiting for invalidation', async () => {
    const unresolvedInvalidation = new Promise<void>(() => {});
    mocks.queryClient.invalidateQueries.mockReturnValue(unresolvedInvalidation);

    const savedProduct = {
      id: 'product-2',
      sku: 'SKU-2',
      updatedAt: '2026-03-01T00:00:00.000Z',
    } as ProductWithImages;

    mocks.updateMutateAsync.mockResolvedValue(savedProduct);

    const onEditSave = vi.fn();
    const onSuccess = vi.fn();
    const refreshImages = vi.fn();
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const { result } = renderHook(() =>
      useProductFormSubmit({
        product: { id: 'product-2' } as ProductWithImages,
        methods: buildMethods({ sku: 'SKU-2' } as ProductFormData),
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
        onEditSave,
        onSuccess,
      })
    );

    let outcome: 'resolved' | 'timeout' = 'timeout';
    await act(async () => {
      outcome = await Promise.race([
        result.current.handleSubmit().then(() => 'resolved' as const),
        new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100)),
      ]);
    });

    expect(outcome).toBe('resolved');
    expect(onEditSave).toHaveBeenCalledWith(savedProduct);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(refreshImages).toHaveBeenCalledWith(savedProduct);

    const timerDurations = timeoutSpy.mock.calls
      .map((call: unknown[]): number | undefined => call[1] as number | undefined)
      .filter((value: number | undefined): value is number => typeof value === 'number');
    expect(timerDurations).not.toContain(500);
    timeoutSpy.mockRestore();

    expect(mocks.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['products', 'list'],
    });
    expect(mocks.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['products', 'count'],
    });
    expect(mocks.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['products', 'detail', savedProduct.id],
    });
  });

  it('blocks submit when hydrated edit product is required but product is not marked hydrated', async () => {
    const unhydratedProduct = {
      id: 'product-unhydrated',
      sku: 'SKU-U',
    } as ProductWithImages;

    const { result } = renderHook(() =>
      useProductFormSubmit({
        product: unhydratedProduct,
        methods: buildMethods({ sku: 'SKU-U' } as ProductFormData),
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
        refreshImages: vi.fn(),
        onEditSave: vi.fn(),
        onSuccess: vi.fn(),
        requireHydratedEditProduct: true,
      })
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mocks.updateMutateAsync).not.toHaveBeenCalled();
    expect(result.current.uploadError).toContain('still loading');
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.stringContaining('still loading'),
      expect.objectContaining({ variant: 'warning' })
    );
  });
});
