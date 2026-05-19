// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useRouterMock, useDuplicateProductMock, useToastMock, useQueryClientMock } = vi.hoisted(
  () => ({
    useRouterMock: vi.fn(),
    useDuplicateProductMock: vi.fn(),
    useToastMock: vi.fn(),
    useQueryClientMock: vi.fn(),
  })
);

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => useQueryClientMock(),
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => useRouterMock(),
}));

vi.mock('@/features/products/hooks/useProductsMutations', () => ({
  useDuplicateProduct: () => useDuplicateProductMock(),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => useToastMock(),
}));

import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER } from '@/shared/lib/products/constants';

import { useProductOperations } from './useProductOperations';

describe('useProductOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueryClientMock.mockReturnValue({});
    useRouterMock.mockReturnValue({
      push: vi.fn(),
    });
    useDuplicateProductMock.mockReturnValue({
      mutateAsync: vi.fn(),
    });
    useToastMock.mockReturnValue({
      toast: vi.fn(),
    });
  });

  it('seeds create-from-draft with the SKU auto-increment placeholder instead of the draft SKU', () => {
    const setRefreshTrigger = vi.fn();
    const draft = {
      id: 'draft-1',
      name: 'Template',
      sku: 'OLD-DRAFT-SKU',
    } as ProductDraft;

    const { result } = renderHook(() => useProductOperations(setRefreshTrigger));

    act(() => {
      result.current.handleOpenCreateFromDraft(draft);
    });

    expect(result.current.initialSku).toBe(PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER);
    expect(result.current.isCreateOpen).toBe(true);
  });

  it('keeps create modal open without refreshing immediately for queued creation', () => {
    const setRefreshTrigger = vi.fn();
    const toast = vi.fn();
    useToastMock.mockReturnValue({ toast });

    const { result } = renderHook(() => useProductOperations(setRefreshTrigger));

    act(() => {
      result.current.setIsCreateOpen(true);
      result.current.setInitialSku('SKU-RUNTIME');
    });

    act(() => {
      result.current.handleCreateSuccess({ queued: true });
    });

    expect(result.current.isCreateOpen).toBe(true);
    expect(result.current.initialSku).toBe('SKU-RUNTIME');
    expect(setRefreshTrigger).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('keeps the create modal open while refreshing after product creation completes', () => {
    const setRefreshTrigger = vi.fn();
    const toast = vi.fn();
    useToastMock.mockReturnValue({ toast });

    const { result } = renderHook(() => useProductOperations(setRefreshTrigger));

    act(() => {
      result.current.setIsCreateOpen(true);
    });

    act(() => {
      result.current.handleCreateSuccess({ product: { id: 'created-product-id' } as never });
    });

    expect(result.current.isCreateOpen).toBe(true);
    expect(result.current.lastEditedId).toBe('created-product-id');
    expect(setRefreshTrigger).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith('Product created successfully.', { variant: 'success' });
  });
});
