/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { isRemoteProductImageLikeResponse } from './product-remote-image-sniff';

const createImageResponseWithHangingCloneCancel = (): Response => {
  const reader = {
    cancel: vi.fn(() => new Promise<void>(() => undefined)),
    read: vi.fn().mockResolvedValue({
      value: new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
    }),
  };

  return {
    clone: () => ({
      body: {
        getReader: () => reader,
      },
    }),
    headers: {
      get: (name: string): string | null =>
        name.toLowerCase() === 'content-type' ? 'image/jpeg' : null,
    },
  } as unknown as Response;
};

describe('isRemoteProductImageLikeResponse', () => {
  it('does not wait for cloned body cancellation after reading image bytes', async () => {
    await expect(
      isRemoteProductImageLikeResponse({
        extension: '.jpg',
        response: createImageResponseWithHangingCloneCancel(),
        supportedExtensions: new Set(['.jpg']),
      })
    ).resolves.toBe(true);
  });
});
