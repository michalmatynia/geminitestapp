/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, waitFor } from '@/__tests__/test-utils';
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

describe('ProductImageCell', () => {
  beforeEach(() => {
    imagePropsSpy.mockClear();
  });

  it('renders both the thumbnail and hover preview as unoptimized images', async () => {
    const { container } = render(
      <ProductImageCell imageUrl='/uploads/products/example.png' productName='Test product' />
    );

    await waitFor(() => {
      const thumbnailCalls = imagePropsSpy.mock.calls
        .map(([props]) => props as Record<string, unknown>)
        .filter((props) => props['sizes'] === '64px');

      expect(thumbnailCalls.length).toBeGreaterThan(0);
      thumbnailCalls.forEach((props) => {
        expect(props['unoptimized']).toBe(true);
      });
    });

    fireEvent.mouseEnter(container.firstElementChild as HTMLElement);

    await waitFor(() => {
      const previewCalls = imagePropsSpy.mock.calls
        .map(([props]) => props as Record<string, unknown>)
        .filter((props) => props['sizes'] === '136px');

      expect(previewCalls.length).toBeGreaterThan(0);
      previewCalls.forEach((props) => {
        expect(props['unoptimized']).toBe(true);
        expect(props).not.toHaveProperty('priority');
      });
    });
  });
});
