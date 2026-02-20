import { describe, expect, it, vi } from 'vitest';

import { buildImageBase64Slots } from '@/features/products/services/image-base64';

vi.mock('@/features/observability/services/error-system', () => ({
  ErrorSystem: {
    logWarning: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/features/files/utils/fileUploader', () => ({
  getDiskPathFromPublicPath: vi.fn((publicPath: string) => publicPath),
}));

describe('buildImageBase64Slots', () => {
  it('skips blocked outbound URLs without making a fetch request', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    const result = await buildImageBase64Slots({
      imageLinks: ['http://169.254.169.254/latest/meta-data/'],
      imageBase64s: [],
      images: [],
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.imageBase64s[0]).toBe('');
    expect(result.imageLinks[0]).toContain('169.254.169.254');
  });

  it('converts allowed remote images to data URLs', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(Buffer.from('image-bytes'), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await buildImageBase64Slots({
      imageLinks: ['https://example.test/img.png'],
      imageBase64s: [],
      images: [],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.imageBase64s[0]).toMatch(/^data:image\/png;base64,/);
  });
});
