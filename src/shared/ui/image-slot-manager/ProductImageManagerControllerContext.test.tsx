// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ProductImageManagerControllerProvider,
  useOptionalProductImageManagerController,
} from './ProductImageManagerControllerContext';

import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';

const controller: ProductImageManagerController = {
  imageSlots: [null],
  imageLinks: [''],
  imageBase64s: [''],
  setImageLinkAt: vi.fn(),
  setImageBase64At: vi.fn(),
  handleSlotImageChange: vi.fn(),
  handleSlotDisconnectImage: vi.fn(async () => {}),
  setShowFileManager: vi.fn(),
  swapImageSlots: vi.fn(),
  setImagesReordering: vi.fn(),
};

describe('ProductImageManagerControllerContext', () => {
  it('returns null outside the provider', () => {
    const { result } = renderHook(() => useOptionalProductImageManagerController());
    expect(result.current).toBeNull();
  });

  it('returns the provided controller inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProductImageManagerControllerProvider value={controller}>
        {children}
      </ProductImageManagerControllerProvider>
    );

    const { result } = renderHook(() => useOptionalProductImageManagerController(), { wrapper });
    expect(result.current).toBe(controller);
  });
});
