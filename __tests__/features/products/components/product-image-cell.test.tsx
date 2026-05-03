/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const imagePropsSpy = vi.hoisted(() => vi.fn());

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    imagePropsSpy(props);

    return (
      <img
        src={typeof props['src'] === 'string' ? props['src'] : ''}
        alt={typeof props['alt'] === 'string' ? props['alt'] : ''}
        data-sizes={typeof props['sizes'] === 'string' ? props['sizes'] : ''}
      />
    );
  },
}));

import { ProductImageCell } from '@/features/products/components/cells/ProductImageCell';
import { ProductImagePreviewProvider } from '@/features/products/context/ProductImagePreviewContext';

describe('ProductImageCell', () => {
  beforeEach(() => {
    imagePropsSpy.mockClear();
  });

  it('keeps local product thumbnails and hover previews on the optimized image path', async () => {
    const { container } = render(
      <ProductImagePreviewProvider>
        <ProductImageCell imageUrl='/uploads/products/example.png' productName='Test product' />
      </ProductImagePreviewProvider>
    );

    await waitFor(() => {
      const thumbnailCalls = imagePropsSpy.mock.calls
        .map(([props]) => props as Record<string, unknown>)
        .filter((props) => props['sizes'] === '64px');

      expect(thumbnailCalls.length).toBeGreaterThan(0);
      thumbnailCalls.forEach((props) => {
        expect(props['unoptimized']).toBe(false);
      });
    });

    fireEvent.mouseEnter(container.firstElementChild as HTMLElement);

    await waitFor(() => {
      const previewCalls = imagePropsSpy.mock.calls
        .map(([props]) => props as Record<string, unknown>)
        .filter((props) => props['sizes'] === '136px');

      expect(previewCalls.length).toBeGreaterThan(0);
      previewCalls.forEach((props) => {
        expect(props['unoptimized']).toBe(false);
        expect(props).not.toHaveProperty('priority');
      });
    });
  });
});
