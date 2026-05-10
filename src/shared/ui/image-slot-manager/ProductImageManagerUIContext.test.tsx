// @vitest-environment jsdom

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
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
  imageBase64s: overrides.imageBase64s ?? [''],
  setImageLinkAt: overrides.setImageLinkAt ?? vi.fn(),
  setImageBase64At: overrides.setImageBase64At ?? vi.fn(),
  handleSlotImageChange: overrides.handleSlotImageChange ?? vi.fn(),
  handleSlotFileSelect: overrides.handleSlotFileSelect,
  handleSlotDisconnectImage: vi.fn(),
  setShowFileManager: vi.fn(),
  swapImageSlots: vi.fn(),
  setImagesReordering: vi.fn(),
  onFastCometUploadStart: overrides.onFastCometUploadStart,
  onFastCometUploadSuccess: overrides.onFastCometUploadSuccess,
  onFastCometUploadError: overrides.onFastCometUploadError,
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

  it('uploads selected slot files immediately through the product FastComet route', async () => {
    const file = new File(['image'], 'fresh.png', { type: 'image/png' });
    const imageFile = {
      id: 'image-file-2',
      filepath: 'https://sparksofsindri.com/uploads/products/SKU/fresh.png',
      filename: 'fresh.png',
      metadata: {
        mirroredLocally: true,
        publicPath: '/uploads/products/SKU/fresh.png',
        storageSource: 'fastcomet',
      },
      storageProvider: 'fastcomet' as const,
    };
    const handleSlotFileSelect = vi.fn();
    const handleSlotImageChange = vi.fn();
    const onFastCometUploadStart = vi.fn();
    const onFastCometUploadSuccess = vi.fn();
    mocks.apiPost.mockResolvedValueOnce({
      imageFile,
      publicPath: '/uploads/products/SKU/fresh.png',
      remoteUrl: imageFile.filepath,
      status: 'ok',
    });
    const controller = buildController({
      handleSlotFileSelect,
      handleSlotImageChange,
      onFastCometUploadStart,
      onFastCometUploadSuccess,
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

    act(() => {
      result.current.handleSlotFileUpload(0, [file]);
    });

    expect(handleSlotImageChange).toHaveBeenCalledWith(file, 0);
    await waitFor(() => expect(handleSlotFileSelect).toHaveBeenCalledWith(imageFile, 0));

    const requestBody = mocks.apiPost.mock.calls[0]?.[1];
    expect(mocks.apiPost.mock.calls[0]?.[0]).toBe(
      '/api/v2/products/product-1/images/upload-to-fastcomet'
    );
    expect(requestBody).toBeInstanceOf(FormData);
    expect((requestBody as FormData).get('file')).toBe(file);
    expect((requestBody as FormData).get('filename')).toBe('fresh.png');
    expect((requestBody as FormData).get('imageSlotIndex')).toBe('0');
    expect(mocks.apiPost.mock.calls[0]?.[2]).toEqual({ timeout: 120_000 });
    expect(onFastCometUploadStart).toHaveBeenCalledWith({
      filename: 'fresh.png',
      imageFileId: 'pending-file',
      imageSlotIndex: 0,
      productId: 'product-1',
    });
    expect(onFastCometUploadSuccess).toHaveBeenCalledWith({
      alreadyUploaded: undefined,
      filename: 'fresh.png',
      imageFile,
      imageFileId: 'pending-file',
      imageSlotIndex: 0,
      productId: 'product-1',
      publicPath: '/uploads/products/SKU/fresh.png',
      remoteUrl: imageFile.filepath,
    });
  });

  it('uploads selected draft slot files immediately through configured product storage', async () => {
    const file = new File(['image'], 'draft.png', { type: 'image/png' });
    const imageFile = {
      id: 'image-file-draft',
      filepath: 'https://sparksofsindri.com/uploads/products/SKU_123/draft.png',
      filename: 'draft.png',
      metadata: {
        mirroredLocally: true,
        publicPath: '/uploads/products/SKU_123/draft.png',
        storageSource: 'fastcomet',
      },
      storageProvider: 'fastcomet' as const,
    };
    const handleSlotFileSelect = vi.fn();
    const handleSlotImageChange = vi.fn();
    const onFastCometUploadStart = vi.fn();
    mocks.apiPost.mockResolvedValueOnce({
      success: true,
      files: [{ imageFile }],
    });
    const controller = buildController({
      handleSlotFileSelect,
      handleSlotImageChange,
      onFastCometUploadStart,
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ProductImageManagerUIProvider
        externalBaseUrl='http://localhost'
        explicitController={controller}
        productSku='SKU 123'
      >
        {children}
      </ProductImageManagerUIProvider>
    );

    const { result } = renderHook(() => useProductImageManagerUIActions(), { wrapper });

    act(() => {
      result.current.handleSlotFileUpload(0, [file]);
    });

    expect(handleSlotImageChange).toHaveBeenCalledWith(file, 0);
    await waitFor(() => expect(handleSlotFileSelect).toHaveBeenCalledWith(imageFile, 0));

    const requestBody = mocks.apiPost.mock.calls[0]?.[1];
    expect(mocks.apiPost.mock.calls[0]?.[0]).toBe(
      '/api/v2/products/images/upload?sku=SKU+123'
    );
    expect(requestBody).toBeInstanceOf(FormData);
    expect((requestBody as FormData).get('file')).toBe(file);
    expect(mocks.apiPost.mock.calls[0]?.[2]).toEqual({ timeout: 120_000 });
    expect(onFastCometUploadStart).not.toHaveBeenCalled();
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

  it('uploads existing image slots to FastComet through the product route', async () => {
    const imageFile = {
      id: 'image-file-1',
      filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      filename: 'photo.webp',
      metadata: { storageSource: 'fastcomet' },
      storageProvider: 'fastcomet' as const,
    };
  const handleSlotFileSelect = vi.fn();
  const setImageBase64At = vi.fn();
  const onFastCometUploadStart = vi.fn();
  const onFastCometUploadSuccess = vi.fn();
  const onFastCometUploadError = vi.fn();
    mocks.apiPost.mockResolvedValueOnce({
      alreadyUploaded: false,
      imageFile,
      publicPath: '/uploads/products/SKU/photo.webp',
      remoteUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      status: 'ok',
    });
    const controller = buildController({
      handleSlotFileSelect,
      imageBase64s: ['data:image/webp;base64,old'],
      imageLinks: ['https://example.com/old.webp'],
      imageSlots: [
        {
          type: 'existing',
          data: {
            id: 'image-file-1',
            filepath: '/uploads/products/SKU/photo.webp',
            filename: 'photo.webp',
            storageProvider: 'local',
          },
          previewUrl: '/uploads/products/SKU/photo.webp',
          slotId: 'slot-1',
        },
      ],
      onFastCometUploadStart,
      onFastCometUploadSuccess,
      onFastCometUploadError,
      setImageBase64At,
      setImageLinkAt: vi.fn(),
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

    const { result } = renderHook(
      () => ({
        actions: useProductImageManagerUIActions(),
        state: useProductImageManagerUIState(),
      }),
      { wrapper }
    );

    await act(async () => {
      await result.current.actions.uploadSlotToFastComet(0);
    });

    expect(mocks.apiPost).toHaveBeenCalledWith(
      '/api/v2/products/product-1/images/upload-to-fastcomet',
      {
        imageFileId: 'image-file-1',
        imageSlotIndex: 0,
      }
    );
    expect(handleSlotFileSelect).toHaveBeenCalledWith(imageFile, 0);
    expect(controller.setImageLinkAt).toHaveBeenCalledWith(0, '');
    expect(setImageBase64At).toHaveBeenCalledWith(0, '');
    expect(onFastCometUploadStart).toHaveBeenCalledWith({
      filename: 'photo.webp',
      imageFileId: 'image-file-1',
      imageSlotIndex: 0,
      productId: 'product-1',
    });
    expect(onFastCometUploadSuccess).toHaveBeenCalledWith({
      alreadyUploaded: false,
      filename: 'photo.webp',
      imageFile,
      imageFileId: 'image-file-1',
      imageSlotIndex: 0,
      productId: 'product-1',
      publicPath: '/uploads/products/SKU/photo.webp',
      remoteUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
    });
    expect(onFastCometUploadError).not.toHaveBeenCalled();
    expect(result.current.state.slotViewModes[0]).toBe('fastcomet');
  });

  it('uploads local file image slots to FastComet through multipart product route', async () => {
    const file = new File(['image'], 'fresh.png', { type: 'image/png' });
    const imageFile = {
      id: 'image-file-2',
      filepath: 'https://sparksofsindri.com/uploads/products/SKU/fresh.png',
      filename: 'fresh.png',
      metadata: { storageSource: 'fastcomet' },
      storageProvider: 'fastcomet' as const,
    };
    const handleSlotFileSelect = vi.fn();
    const onFastCometUploadStart = vi.fn();
    const onFastCometUploadSuccess = vi.fn();
    const onFastCometUploadError = vi.fn();
    mocks.apiPost.mockResolvedValueOnce({
      imageFile,
      publicPath: '/uploads/products/SKU/fresh.png',
      remoteUrl: 'https://sparksofsindri.com/uploads/products/SKU/fresh.png',
      status: 'ok',
    });
    const controller = buildController({
      handleSlotFileSelect,
      imageSlots: [
        {
          type: 'file',
          data: file,
          previewUrl: 'blob:fresh',
          slotId: 'slot-file-1',
        },
      ],
      onFastCometUploadStart,
      onFastCometUploadSuccess,
      onFastCometUploadError,
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

    const { result } = renderHook(
      () => ({
        actions: useProductImageManagerUIActions(),
        state: useProductImageManagerUIState(),
      }),
      { wrapper }
    );

    await act(async () => {
      await result.current.actions.uploadSlotToFastComet(0);
    });

    const requestBody = mocks.apiPost.mock.calls[0]?.[1];
    expect(mocks.apiPost.mock.calls[0]?.[0]).toBe(
      '/api/v2/products/product-1/images/upload-to-fastcomet'
    );
    expect(requestBody).toBeInstanceOf(FormData);
    expect((requestBody as FormData).get('file')).toBe(file);
    expect((requestBody as FormData).get('filename')).toBe('fresh.png');
    expect((requestBody as FormData).get('imageSlotIndex')).toBe('0');
    expect(mocks.apiPost.mock.calls[0]?.[2]).toEqual({ timeout: 120_000 });
    expect(handleSlotFileSelect).toHaveBeenCalledWith(imageFile, 0);
    expect(onFastCometUploadStart).toHaveBeenCalledWith({
      filename: 'fresh.png',
      imageFileId: 'slot-file-1',
      imageSlotIndex: 0,
      productId: 'product-1',
    });
    expect(onFastCometUploadSuccess).toHaveBeenCalledWith({
      alreadyUploaded: undefined,
      filename: 'fresh.png',
      imageFile,
      imageFileId: 'slot-file-1',
      imageSlotIndex: 0,
      productId: 'product-1',
      publicPath: '/uploads/products/SKU/fresh.png',
      remoteUrl: 'https://sparksofsindri.com/uploads/products/SKU/fresh.png',
    });
    expect(onFastCometUploadError).not.toHaveBeenCalled();
    expect(result.current.state.slotViewModes[0]).toBe('fastcomet');
  });

  it('notifies FastComet upload errors from existing image slots', async () => {
    const uploadError = new Error('FastComet upload failed');
    const handleSlotFileSelect = vi.fn();
    const onFastCometUploadStart = vi.fn();
    const onFastCometUploadSuccess = vi.fn();
    const onFastCometUploadError = vi.fn();
    mocks.apiPost.mockRejectedValueOnce(uploadError);
    const controller = buildController({
      handleSlotFileSelect,
      imageSlots: [
        {
          type: 'existing',
          data: {
            id: 'image-file-1',
            filepath: '/uploads/products/SKU/photo.webp',
            filename: 'photo.webp',
            storageProvider: 'local',
          },
          previewUrl: '/uploads/products/SKU/photo.webp',
          slotId: 'slot-1',
        },
      ],
      onFastCometUploadStart,
      onFastCometUploadSuccess,
      onFastCometUploadError,
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
      await result.current.uploadSlotToFastComet(0);
    });

    expect(onFastCometUploadStart).toHaveBeenCalledWith({
      filename: 'photo.webp',
      imageFileId: 'image-file-1',
      imageSlotIndex: 0,
      productId: 'product-1',
    });
    expect(onFastCometUploadSuccess).not.toHaveBeenCalled();
    expect(onFastCometUploadError).toHaveBeenCalledWith({
      error: uploadError,
      filename: 'photo.webp',
      imageFileId: 'image-file-1',
      imageSlotIndex: 0,
      productId: 'product-1',
    });
    expect(handleSlotFileSelect).not.toHaveBeenCalled();
  });
});
