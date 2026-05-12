// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildQueuedProductFastCometUploadSource: vi.fn(),
  markQueuedProductSource: vi.fn(),
  removeQueuedProductSource: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/features/products/state/queued-product-ops', () => ({
  buildQueuedProductFastCometUploadSource: (...args: unknown[]) =>
    mocks.buildQueuedProductFastCometUploadSource(...args),
  markQueuedProductSource: (...args: unknown[]) => mocks.markQueuedProductSource(...args),
  removeQueuedProductSource: (...args: unknown[]) => mocks.removeQueuedProductSource(...args),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

import { useFastCometUploadRuntimeCallbacks } from './ProductImagesFastCometRuntime';

const uploadEvent = {
  filename: 'photo.webp',
  imageFileId: 'image-file-1',
  imageSlotIndex: 0,
  productId: 'product-1',
};

describe('useFastCometUploadRuntimeCallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildQueuedProductFastCometUploadSource.mockReturnValue(
      'fastcomet-upload:image-file-1:0'
    );
  });

  it('marks FastComet uploads as queued product operations while Redis work is pending', () => {
    const { result } = renderHook(() => useFastCometUploadRuntimeCallbacks());

    act(() => {
      result.current.onFastCometUploadStart?.(uploadEvent);
    });

    expect(mocks.buildQueuedProductFastCometUploadSource).toHaveBeenCalledWith(
      'image-file-1',
      0
    );
    expect(mocks.markQueuedProductSource).toHaveBeenCalledWith(
      'product-1',
      'fastcomet-upload:image-file-1:0',
      120_000
    );
    expect(mocks.toast).toHaveBeenCalledWith('FastComet upload started.', {
      duration: 3000,
      variant: 'info',
    });
  });

  it('removes queued FastComet operations when the upload succeeds', () => {
    const { result } = renderHook(() => useFastCometUploadRuntimeCallbacks());

    act(() => {
      result.current.onFastCometUploadSuccess?.({
        ...uploadEvent,
        imageFile: {
          id: 'image-file-1',
          filename: 'photo.webp',
          filepath: 'https://sparksofsindri.com/photo.webp',
          storageProvider: 'fastcomet',
        },
      });
    });

    expect(mocks.removeQueuedProductSource).toHaveBeenCalledWith(
      'product-1',
      'fastcomet-upload:image-file-1:0'
    );
    expect(mocks.toast).toHaveBeenCalledWith('Image uploaded to FastComet.', {
      variant: 'success',
    });
  });

  it('removes queued FastComet operations when the upload fails', () => {
    const { result } = renderHook(() => useFastCometUploadRuntimeCallbacks());
    const error = new Error('Product FastComet image uploads require Redis runtime.');

    act(() => {
      result.current.onFastCometUploadError?.({
        ...uploadEvent,
        error,
      });
    });

    expect(mocks.removeQueuedProductSource).toHaveBeenCalledWith(
      'product-1',
      'fastcomet-upload:image-file-1:0'
    );
    expect(mocks.toast).toHaveBeenCalledWith(
      'Product FastComet image uploads require Redis runtime.',
      { error, variant: 'error' }
    );
  });

  it('surfaces FastComet configuration errors without leaving the queued marker', () => {
    const { result } = renderHook(() => useFastCometUploadRuntimeCallbacks());
    const error = new Error('FastComet storage is not configured. Enter SERVER.');

    act(() => {
      result.current.onFastCometUploadError?.({
        ...uploadEvent,
        error,
      });
    });

    expect(mocks.removeQueuedProductSource).toHaveBeenCalledWith(
      'product-1',
      'fastcomet-upload:image-file-1:0'
    );
    expect(result.current.fastCometConfigError).toBe(
      'FastComet storage is not configured. Enter SERVER.'
    );
    expect(mocks.toast).not.toHaveBeenCalled();

    act(() => {
      result.current.clearFastCometConfigError();
    });

    expect(result.current.fastCometConfigError).toBeNull();
  });
});
