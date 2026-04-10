/**
 * @vitest-environment jsdom
 */

import React, { useMemo, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import type { ManagedImageSlot } from '@/shared/contracts/image-slots';

vi.mock('./ProductImageManagerHeader', () => ({
  ProductImageManagerHeader: () => null,
}));

vi.mock('./ProductImageSlot', async () => {
  const ReactModule = await import('react');
  const { useProductImageManagerUIState } = await import('./ProductImageManagerUIContext');

  return {
    ProductImageSlot: ({ index }: { index: number }) => {
      const { controller } = useProductImageManagerUIState();
      const currentSlotId = controller.imageSlots[index]?.slotId ?? `empty-${index}`;
      const [mountedSlotId] = ReactModule.useState(currentSlotId);

      return <div data-testid={`slot-${index}`}>{`${mountedSlotId}|${currentSlotId}`}</div>;
    },
  };
});

import ProductImageManager from './ProductImageManager';

const createExistingSlot = (slotId: string): ManagedImageSlot =>
  ({
    type: 'existing',
    slotId,
    previewUrl: `/${slotId}.jpg`,
    data: {
      id: slotId,
      filename: `${slotId}.jpg`,
      filepath: `/${slotId}.jpg`,
      mimetype: 'image/jpeg',
      size: 1234,
      url: `https://example.com/${slotId}.jpg`,
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
    },
  }) as ManagedImageSlot;

function buildController(imageSlots: ManagedImageSlot[]): ProductImageManagerController {
  return {
    imageSlots,
    imageLinks: imageSlots.map(() => ''),
    imageBase64s: imageSlots.map(() => ''),
    setImageLinkAt: vi.fn(),
    setImageBase64At: vi.fn(),
    handleSlotImageChange: vi.fn(),
    handleSlotDisconnectImage: vi.fn(),
    setShowFileManager: vi.fn(),
    swapImageSlots: vi.fn(),
    setImagesReordering: vi.fn(),
  };
}

describe('ProductImageManager', () => {
  it('remounts slot content when a different image takes over the same slot index', () => {
    function Harness(): React.JSX.Element {
      const [imageSlots, setImageSlots] = useState<ManagedImageSlot[]>([
        createExistingSlot('image-a'),
        createExistingSlot('image-b'),
      ]);
      const controller = useMemo(() => buildController(imageSlots), [imageSlots]);

      return (
        <div>
          <button
            type='button'
            onClick={() => setImageSlots([imageSlots[1], null])}
          >
            compact
          </button>
          <ProductImageManager controller={controller} externalBaseUrl='http://localhost' />
        </div>
      );
    }

    render(<Harness />);

    expect(screen.getByTestId('slot-0')).toHaveTextContent('image-a|image-a');

    fireEvent.click(screen.getByRole('button', { name: 'compact' }));

    expect(screen.getByTestId('slot-0')).toHaveTextContent('image-b|image-b');
  });
});
