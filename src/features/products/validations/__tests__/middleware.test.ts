/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';

import { validateProductUpdateMiddleware } from '../middleware';

describe('product validation middleware', () => {
  it('normalizes duplicate categoryId form entries before update validation', async () => {
    const formData = new FormData();
    formData.append('categoryId', 'category-initial');
    formData.append('categoryId', 'category-selected');

    const result = await validateProductUpdateMiddleware(formData);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected update validation to succeed');
    }
    expect(result.data).toEqual(
      expect.objectContaining({
        categoryId: 'category-selected',
      }),
    );
  });
});
