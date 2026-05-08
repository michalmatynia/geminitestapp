// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: mocks.apiPost,
  },
}));

import {
  ProductImageManagerUIProvider,
  useProductImageManagerUIActions,
  useProductImageManagerUIState,
} from './ProductImageManagerUIContext';

const buildController = (
  overrides: Partial<ProductImageManagerController> = {}
): ProductImageManagerController => ({
  imageSlots: overrides.imageSlots ?? [null],
  imageLinks: overrides.imageLinks ?? [''],
  imageBase64s: [''],
  setImageLinkAt: overrides.setImageLinkAt ?? vi.fn(),
  setImageBase64At: vi.fn(),
  handleSlotImageChange: vi.fn(),
  handleSlotFileSelect: overrides.handleSlotFileSelect,
  handleSlotDisconnectImage: vi.fn(),
  setShowFileManager: vi.fn(),
  swapImageSlots: vi.fn(),
  setImagesReordering: vi.fn(),
});

describe('ProductImageManagerUIContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useProductImageManagerUIState())).toThrow(
      'useProductImageManagerUIState must be used within ProductImageManagerUIProvider'
    );
    expect(() => renderHook(() => useProductImageManagerUIActions())).toThrow(
      'useProductImageManagerUIActions must be used within ProductImageManagerUIProvider'
    );
  });

  it('returns UI state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProductImageManagerUIProvider
        externalBaseUrl='http://localhost'
        explicitController={buildController()}
      >
        {children}
      </ProductImageManagerUIProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useProductImageManagerUIActions(),
        state: useProductImageManagerUIState(),
      }),
      { wrapper }
    );

    expect(result.current.state.externalBaseUrl).toBe('http://localhost');
    expect(result.current.state.controller.imageSlots).toHaveLength(1);
    expect(result.current.actions.handleSlotFileUpload).toBeTypeOf('function');
    expect(result.current.actions.clearVisibleImage).toBeTypeOf('function');
  });

  it('converts remote link slots through the product link-to-file route', async () => {
    const imageFile = {
      id: 'image-file-1',
      filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      filename: 'photo.webp',
    };
    const handleSlotFileSelect = vi.fn();
    const setImageLinkAt = vi.fn();
    mocks.apiPost.mockResolvedValueOnce({ imageFile, status: 'ok' });
    const controller = buildController({
      handleSlotFileSelect,
      imageLinks: ['https://cdn.fastcomet.example/photo.webp'],
      setImageLinkAt,
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProductImageManagerUIProvider
        externalBaseUrl='http://localhost'
        explicitController={controller}
        productId='product-1'
      >
        {children}
      </ProductImageManagerUIProvider>
    );

    const { result } = renderHook(() => useProductImageManagerUIActions(), { wrapper });

    await act(async () => {
      await result.current.convertLinkToFile(0);
    });

    expect(mocks.apiPost).toHaveBeenCalledWith(
      '/api/v2/products/product-1/images/link-to-file',
      {
        imageSlotIndex: 0,
        url: 'https://cdn.fastcomet.example/photo.webp',
      }
    );
    expect(handleSlotFileSelect).toHaveBeenCalledWith(imageFile, 0);
    expect(setImageLinkAt).not.toHaveBeenCalled();
  });
});
