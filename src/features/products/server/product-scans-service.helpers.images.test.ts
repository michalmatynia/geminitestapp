import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  mkdirMock: vi.fn(),
  statMock: vi.fn(),
  writeFileMock: vi.fn(),
}));

vi.mock('@/shared/lib/files/runtime-fs', () => ({
  getFsPromises: () => ({
    mkdir: (...args: unknown[]) => mocks.mkdirMock(...args),
    stat: (...args: unknown[]) => mocks.statMock(...args),
    writeFile: (...args: unknown[]) => mocks.writeFileMock(...args),
  }),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

import { hydrateProductScanImageCandidates } from './product-scans-service.helpers.images';

describe('product scan image helper hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mkdirMock.mockResolvedValue(undefined);
    mocks.statMock.mockRejectedValue(new Error('ENOENT'));
    mocks.writeFileMock.mockResolvedValue(undefined);
  });

  it('hydrates product imageBase64s into local scan candidates', async () => {
    const candidates = await hydrateProductScanImageCandidates({
      product: {
        id: 'product-1',
        images: [],
        imageBase64s: ['data:image/png;base64,AQID'],
      } as never,
      imageCandidates: [],
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        id: 'base64-slot-1',
        filepath: expect.stringContaining('geminitestapp-product-scan-images'),
        url: null,
        filename: 'product-1-scan-slot-1.png',
      }),
    ]);
    expect(mocks.mkdirMock).toHaveBeenCalledWith(
      expect.stringContaining('geminitestapp-product-scan-images'),
      { recursive: true }
    );
    expect(mocks.writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining('geminitestapp-product-scan-images'),
      Buffer.from([1, 2, 3])
    );
  });

  it('skips invalid or non-image base64 slots', async () => {
    const candidates = await hydrateProductScanImageCandidates({
      product: {
        id: 'product-1',
        images: [],
        imageBase64s: ['not base64', 'data:text/plain;base64,AQID'],
      } as never,
      imageCandidates: [],
    });

    expect(candidates).toEqual([]);
    expect(mocks.writeFileMock).not.toHaveBeenCalled();
  });
});
