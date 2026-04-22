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
});
