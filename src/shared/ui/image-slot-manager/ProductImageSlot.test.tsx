/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
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
});
