/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

import {
  isEditingProductHydrated,
  markEditingProductHydrated,
  warnNonHydratedEditProduct,
} from '@/features/products/hooks/editingProductHydration';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { ProductWithImages } from '@/shared/contracts/products';

const buildProduct = (id = 'p1'): ProductWithImages =>
  ({ id, catalogs: [], catalogId: `${id}-cat` } as unknown as ProductWithImages);

describe('editingProductHydration', () => {
  beforeEach(() => {
    vi.mocked(logClientError).mockReset();
  });

  it('isEditingProductHydrated returns false for a plain product', () => {
    expect(isEditingProductHydrated(buildProduct())).toBe(false);
  });

  it('isEditingProductHydrated returns false for null and undefined', () => {
    expect(isEditingProductHydrated(null)).toBe(false);
    expect(isEditingProductHydrated(undefined)).toBe(false);
  });

  it('markEditingProductHydrated makes isEditingProductHydrated return true', () => {
    expect(isEditingProductHydrated(markEditingProductHydrated(buildProduct('p2')))).toBe(true);
  });

  it('markEditingProductHydrated does not add an enumerable __editProductHydrated property', () => {
    const hydrated = markEditingProductHydrated(buildProduct('p3'));
    expect(Object.keys(hydrated)).not.toContain('__editProductHydrated');
  });

  it('warnNonHydratedEditProduct calls logClientError with structured context', () => {
    warnNonHydratedEditProduct(buildProduct('p4'));

    expect(logClientError).toHaveBeenCalledTimes(1);
    const [err, extra] = vi.mocked(logClientError).mock.calls[0] as [
      Error,
      { context: Record<string, unknown> },
    ];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('Non-hydrated');
    expect(extra.context['productId']).toBe('p4');
    expect(extra.context['service']).toBe('products');
    expect(extra.context['category']).toBe('hydration-guard');
    expect(extra.context['catalogId']).toBe('p4-cat');
    expect(extra.context['catalogsLength']).toBe(0);
  });

  it('regression: product without hydration flag fails isEditingProductHydrated; after markEditingProductHydrated it passes', () => {
    // Encodes the exact bug sequence:
    //   setEditingProduct(product)                   → isHydrated = false → guard fires
    //   setEditingProduct(markEditingProductHydrated) → isHydrated = true  → guard silent
    const raw = buildProduct('p5');
    expect(isEditingProductHydrated(raw)).toBe(false);
    expect(isEditingProductHydrated(markEditingProductHydrated(raw))).toBe(true);
  });
});
