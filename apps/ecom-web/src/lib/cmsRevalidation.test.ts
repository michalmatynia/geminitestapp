/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidateLocalizedPath } from './cmsRevalidation';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

describe('CMS revalidation helpers', () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
  });

  it('revalidates default and localized concrete paths', () => {
    revalidateLocalizedPath('/checkout');

    expect(mocks.revalidatePath).toHaveBeenCalledWith('/checkout');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/pl/checkout');
  });

  it('passes the path type through for localized dynamic routes', () => {
    revalidateLocalizedPath('/products/[slug]', 'page');

    expect(mocks.revalidatePath).toHaveBeenCalledWith('/products/[slug]', 'page');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/pl/products/[slug]', 'page');
  });
});
