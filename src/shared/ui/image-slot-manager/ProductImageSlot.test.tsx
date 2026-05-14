/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import { ProductImageSlot } from '@/shared/ui/image-slot-manager/ProductImageSlot';
import { ProductImageManagerUIProvider } from '@/shared/ui/image-slot-manager/ProductImageManagerUIContext';

describe('ProductImageSlot', () => {
  const buildController = (): ProductImageManagerController => ({
    imageSlots: [null],
    imageLinks: [''],
    imageBase64s: [''],
    setImageLinkAt: vi.fn(),
    setImageBase64At: vi.fn(),
    handleSlotImageChange: vi.fn(),
    handleSlotDisconnectImage: vi.fn(),
    setShowFileManager: vi.fn(),
    swapImageSlots: vi.fn(),
    setImagesReordering: vi.fn(),
  });

  it('shows the file manager control with new label and text-only hover styles', () => {
    const controller = buildController();

    render(
      <ProductImageManagerUIProvider externalBaseUrl='http://localhost' explicitController={controller}>
        <ProductImageSlot index={0} />
      </ProductImageManagerUIProvider>
    );

    const fileManagerButton = screen.getByRole('button', { name: 'File Manager' });

    expect(fileManagerButton).toBeInTheDocument();
    expect(fileManagerButton).toHaveClass('hover:text-emerald-300');
    expect(fileManagerButton).toHaveClass('hover:bg-transparent');
    expect(fileManagerButton).not.toHaveClass('group-hover/upload-hover:text-emerald-300');
  });

  it('highlights upload icon and text together on hover via local upload hover group', () => {
    render(
      <ProductImageManagerUIProvider externalBaseUrl='http://localhost' explicitController={buildController()}>
        <ProductImageSlot index={0} />
      </ProductImageManagerUIProvider>
    );

    const uploadLabel = screen.getByText('Upload');
    const uploadHoverGroup = uploadLabel.parentElement;
    expect(uploadHoverGroup).not.toBeNull();
    expect(uploadHoverGroup).toHaveClass('group/upload-hover');
    expect(uploadHoverGroup).toHaveClass('hover:cursor-pointer');
    expect(uploadLabel).toHaveClass('group-hover/upload-hover:text-emerald-300');

    const uploadIcon = uploadHoverGroup?.querySelector('svg');
    expect(uploadIcon).not.toBeNull();
    expect(uploadIcon).toHaveClass('group-hover/upload-hover:text-emerald-300');
  });

  it('keeps view controls above the thumbnail while source indicators stay below it', () => {
    render(
      <ProductImageManagerUIProvider externalBaseUrl='http://localhost' explicitController={buildController()}>
        <ProductImageSlot index={0} />
      </ProductImageManagerUIProvider>
    );

    const viewControl = screen.getByText('View: Upload');
    const actionsMenu = screen.getByRole('button', { name: 'Open image slot 1 actions menu' });
    const uploadLabel = screen.getByText('Upload');
    const uploadIndicator = screen.getByText('U');

    expect(
      viewControl.compareDocumentPosition(uploadLabel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      actionsMenu.compareDocumentPosition(uploadLabel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      uploadLabel.compareDocumentPosition(uploadIndicator) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('clears the slot in one click even when link fallback data also exists', async () => {
    const user = userEvent.setup();

    const StatefulSlot = (): React.JSX.Element => {
      const [imageSlots, setImageSlots] = React.useState<
        ProductImageManagerController['imageSlots']
      >([
        {
          type: 'file',
          data: new File(['image'], 'slot-1.jpg', { type: 'image/jpeg' }),
          previewUrl: 'blob:slot-1',
          slotId: 'slot-1',
        },
      ]);
      const [imageLinks, setImageLinks] = React.useState(['https://example.com/fallback.jpg']);
      const [imageBase64s, setImageBase64s] = React.useState(['']);

      const controller: ProductImageManagerController = {
        imageSlots,
        imageLinks,
        imageBase64s,
        setImageLinkAt: (index: number, value: string) =>
          setImageLinks((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
          }),
        setImageBase64At: (index: number, value: string) =>
          setImageBase64s((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
          }),
        handleSlotImageChange: vi.fn(),
        handleSlotDisconnectImage: async (index: number) => {
          setImageSlots((prev) => {
            const next = [...prev];
            next[index] = null;
            return next;
          });
        },
        setShowFileManager: vi.fn(),
        swapImageSlots: vi.fn(),
        setImagesReordering: vi.fn(),
      };

      return (
        <ProductImageManagerUIProvider externalBaseUrl='http://localhost' explicitController={controller}>
          <ProductImageSlot index={0} />
        </ProductImageManagerUIProvider>
      );
    };

    render(<StatefulSlot />);

    await user.click(screen.getByRole('button', { name: 'Clear image from slot 1' }));

    expect(screen.queryByRole('button', { name: 'Clear image from slot 1' })).not.toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('offers a FastComet view for uploaded FastComet image slots', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const controller = buildController();
    controller.imageSlots = [
      {
        type: 'existing',
        data: {
          id: 'image-file-1',
          filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
          filename: 'photo.webp',
          metadata: { storageSource: 'fastcomet' },
          storageProvider: 'fastcomet',
        },
        previewUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
        slotId: 'image-file-1',
      },
    ];

    render(
      <ProductImageManagerUIProvider externalBaseUrl='http://localhost:3000' explicitController={controller}>
        <ProductImageSlot index={0} />
      </ProductImageManagerUIProvider>
    );

    expect(screen.getByText('F')).toHaveClass('border-emerald-400/70');
    expect(screen.getByText('F')).toHaveClass('bg-emerald-500/15');
    expect(screen.getByText('F')).toHaveClass('text-emerald-100');
    expect(screen.getByText('F')).not.toHaveClass('border-amber-400/70');

    await user.click(screen.getByText('View: Upload'));
    await user.click(screen.getByRole('menuitem', { name: 'FastComet' }));
    await user.click(
      screen.getByRole('button', { name: 'Open full preview for image slot 1 in new tab' })
    );

    expect(screen.getByText('View: FastComet')).toBeInTheDocument();
    expect(openSpy).toHaveBeenCalledWith(
      'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
  });

  it('treats Spark upload links as FastComet instead of external links', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const controller = buildController();
    controller.imageLinks = [
      'https://sparksofsindri.com/uploads/products/KEYCHA1479/e431e2d8-d67c-454b-ba68-2eb2313f51ee.png',
    ];

    render(
      <ProductImageManagerUIProvider externalBaseUrl='http://localhost:3000' explicitController={controller}>
        <ProductImageSlot index={0} />
      </ProductImageManagerUIProvider>
    );

    expect(await screen.findByText('View: FastComet')).toBeInTheDocument();
    expect(screen.getByText('F')).toHaveClass('border-emerald-400/70');
    expect(screen.getByText('L')).toHaveClass('border-gray-600');

    await user.click(
      screen.getByRole('button', { name: 'Open full preview for image slot 1 in new tab' })
    );

    expect(openSpy).toHaveBeenCalledWith(
      'https://sparksofsindri.com/uploads/products/KEYCHA1479/e431e2d8-d67c-454b-ba68-2eb2313f51ee.png',
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
  });

  it('uses pending and failure tones for unresolved FastComet upload status', () => {
    const renderFastCometStatus = (fastCometUploadStatus: string): HTMLElement => {
      const controller = buildController();
      controller.imageSlots = [
        {
          type: 'existing',
          data: {
            id: `image-file-${fastCometUploadStatus}`,
            filepath: '/uploads/products/SKU/photo.webp',
            filename: 'photo.webp',
            metadata: { fastCometUploadStatus, storageSource: 'local' },
            storageProvider: 'local',
          },
          previewUrl: '/uploads/products/SKU/photo.webp',
          slotId: `image-file-${fastCometUploadStatus}`,
        },
      ];

      const { unmount } = render(
        <ProductImageManagerUIProvider externalBaseUrl='http://localhost:3000' explicitController={controller}>
          <ProductImageSlot index={0} />
        </ProductImageManagerUIProvider>
      );
      const indicator = screen.getByText('F');
      const clone = indicator.cloneNode() as HTMLElement;
      unmount();
      return clone;
    };

    expect(renderFastCometStatus('queued')).toHaveClass('border-amber-400/70');
    expect(renderFastCometStatus('queued')).toHaveClass('bg-amber-500/15');
    expect(renderFastCometStatus('failed')).toHaveClass('border-rose-400/70');
    expect(renderFastCometStatus('failed')).toHaveClass('bg-rose-500/15');
  });
});
