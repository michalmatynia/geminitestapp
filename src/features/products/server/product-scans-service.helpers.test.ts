import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getDiskPathFromPublicPathMock: vi.fn(),
  statMock: vi.fn(),
}));

vi.mock('@/shared/lib/files/file-uploader', () => ({
  getDiskPathFromPublicPath: (...args: unknown[]) =>
    mocks.getDiskPathFromPublicPathMock(...args),
}));

vi.mock('@/shared/lib/files/runtime-fs', () => ({
  getFsPromises: () => ({
    stat: (...args: unknown[]) => mocks.statMock(...args),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  }),
}));

import { resolveLocalScanImageCandidatePath } from './product-scans-service.helpers';

describe('product-scans-service helpers', () => {
  it('resolves public upload image paths when the configured uploads root is stale', async () => {
    const publicUploadPath = '/uploads/products/WALACC078/product.png';
    const staleUploadsPath = '/var/tmp/libapp-uploads/products/WALACC078/product.png';
    const devPublicPath = resolve(process.cwd(), 'public/uploads/products/WALACC078/product.png');

    mocks.getDiskPathFromPublicPathMock.mockReturnValue(staleUploadsPath);
    mocks.statMock.mockImplementation(async (filepath: string) => {
      if (filepath === devPublicPath) {
        return {
          isFile: () => true,
          size: 1024,
        };
      }
      throw new Error('missing');
    });

    await expect(
      resolveLocalScanImageCandidatePath({
        filepath: publicUploadPath,
        filename: 'product.png',
      })
    ).resolves.toBe(devPublicPath);

    expect(mocks.statMock).toHaveBeenCalledWith(staleUploadsPath);
    expect(mocks.statMock).toHaveBeenCalledWith(devPublicPath);
  });
});
