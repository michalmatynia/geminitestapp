import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateProductCreateMock = vi.fn();
const validateProductUpdateMock = vi.fn();

vi.mock('@/features/products/validations/validators', () => ({
  validateProductCreate: (...args: unknown[]) => validateProductCreateMock(...args),
  validateProductUpdate: (...args: unknown[]) => validateProductUpdateMock(...args),
}));

import {
  validateProductCreateMiddleware,
  validateProductUpdateMiddleware,
} from '@/features/products/validations/middleware';

describe('product validation middleware', () => {
  beforeEach(() => {
    validateProductCreateMock.mockReset();
    validateProductUpdateMock.mockReset();
    validateProductCreateMock.mockResolvedValue({ success: true, data: {} });
    validateProductUpdateMock.mockResolvedValue({ success: true, data: {} });
  });

  it('passes repeated keys as arrays to update validator', async () => {
    const formData = new FormData();
    formData.append('catalogIds', 'cat-1');
    formData.append('catalogIds', 'cat-2');
    formData.append('imageFileIds', 'img-1');
    formData.append('imageFileIds', 'img-2');

    const result = await validateProductUpdateMiddleware(formData);

    expect(result.success).toBe(true);
    expect(validateProductUpdateMock).toHaveBeenCalledTimes(1);
    expect(validateProductUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogIds: ['cat-1', 'cat-2'],
        imageFileIds: ['img-1', 'img-2'],
      })
    );
  });

  it('passes repeated keys as arrays to create validator', async () => {
    const formData = new FormData();
    formData.append('catalogIds', 'cat-1');
    formData.append('catalogIds', 'cat-2');

    const result = await validateProductCreateMiddleware(formData);

    expect(result.success).toBe(true);
    expect(validateProductCreateMock).toHaveBeenCalledTimes(1);
    expect(validateProductCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogIds: ['cat-1', 'cat-2'],
      })
    );
  });
});
