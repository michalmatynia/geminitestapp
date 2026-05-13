/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';

import { ProductImageManagerHeader } from './ProductImageManagerHeader';
import { ProductImageManagerUIProvider } from './ProductImageManagerUIContext';

const buildController = (): ProductImageManagerController => ({
  imageSlots: [null, null],
  imageLinks: ['', ''],
  imageBase64s: ['', ''],
  setImageLinkAt: vi.fn(),
  setImageBase64At: vi.fn(),
  handleSlotImageChange: vi.fn(),
  handleSlotDisconnectImage: vi.fn(),
  setShowFileManager: vi.fn(),
  swapImageSlots: vi.fn(),
  setImagesReordering: vi.fn(),
});

describe('ProductImageManagerHeader', () => {
  it('places the file manager action left of convert all and opens the file manager', async () => {
    const user = userEvent.setup();
    const controller = buildController();

    render(
      <ProductImageManagerUIProvider externalBaseUrl='http://localhost' explicitController={controller}>
        <ProductImageManagerHeader
          onChooseFromFileManager={(): void => controller.setShowFileManager(true)}
          showChooseFromFileManagerButton
        />
      </ProductImageManagerUIProvider>
    );

    const chooseButton = screen.getByRole('button', {
      name: 'Choose multiple existing images for the product',
    });
    const chooseButtonText = screen.getByText('Choose from File Manager');
    const convertButton = screen.getByRole('button', { name: 'Convert All to Base64' });

    expect(
      chooseButtonText.compareDocumentPosition(convertButton) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    await user.click(chooseButton);

    expect(controller.setShowFileManager).toHaveBeenCalledWith(true);
  });
});
