/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useProductImageSlotPreviews } from './ProductStudioContext.previews';

describe('useProductImageSlotPreviews', () => {
  it('shows link-only imported product images in Product Studio', () => {
    const { result } = renderHook(() =>
      useProductImageSlotPreviews(
        [null, null],
        ['https://www.battle-stock.pl/images/product-1.jpg', ''],
        ['', ''],
        ''
      )
    );

    expect(result.current).toEqual([
      {
        index: 0,
        label: 'Slot 1',
        sourceType: 'link',
        src: 'https://www.battle-stock.pl/images/product-1.jpg',
      },
    ]);
  });

  it('prefers uploaded image slots over fallback links for the same index', () => {
    const { result } = renderHook(() =>
      useProductImageSlotPreviews(
        [
          {
            type: 'existing',
            data: { id: 'file-1', filepath: '/uploads/product-1.jpg' },
            previewUrl: '/uploads/product-1.jpg',
            slotId: 'file-1',
          },
        ] as never,
        ['https://www.battle-stock.pl/images/fallback.jpg'],
        [''],
        ''
      )
    );

    expect(result.current).toEqual([
      {
        index: 0,
        label: 'Slot 1',
        sourceType: 'file',
        src: '/uploads/product-1.jpg',
      },
    ]);
  });
});
