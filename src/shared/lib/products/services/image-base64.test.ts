/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class MockOutboundUrlPolicyError extends Error {
    decision: { hostname?: string | null; reason?: string | null };

    constructor(
      message: string,
      decision: { hostname?: string | null; reason?: string | null } = {}
    ) {
      super(message);
      this.name = 'OutboundUrlPolicyError';
      this.decision = decision;
    }
  }

  return {
    ErrorSystem: {
      logWarning: vi.fn(),
    },
    OutboundUrlPolicyError: MockOutboundUrlPolicyError,
    fetchWithOutboundUrlPolicy: vi.fn(),
    getDiskPathFromPublicPath: vi.fn((publicPath: string) => `/disk${publicPath}`),
    logClientError: vi.fn(),
    readFile: vi.fn(),
  };
});

vi.mock('fs/promises', () => ({
  default: {
    readFile: mocks.readFile,
  },
}));

vi.mock('@/shared/lib/files/file-uploader', () => ({
  getDiskPathFromPublicPath: mocks.getDiskPathFromPublicPath,
}));

vi.mock('@/shared/lib/security/outbound-url-policy', () => ({
  fetchWithOutboundUrlPolicy: mocks.fetchWithOutboundUrlPolicy,
  OutboundUrlPolicyError: mocks.OutboundUrlPolicyError,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: mocks.ErrorSystem,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: mocks.logClientError,
}));

import { buildImageBase64Slots } from './image-base64';

describe('image-base64', () => {
  beforeEach(() => {
    mocks.ErrorSystem.logWarning.mockReset().mockResolvedValue(undefined);
    mocks.fetchWithOutboundUrlPolicy.mockReset();
    mocks.getDiskPathFromPublicPath.mockClear();
    mocks.logClientError.mockReset();
    mocks.readFile.mockReset();
  });

  it('logs and skips blocked outbound image fetches', async () => {
    const blockedError = new mocks.OutboundUrlPolicyError('blocked outbound url', {
      hostname: '169.254.169.254',
      reason: 'private_ip',
    });
    mocks.fetchWithOutboundUrlPolicy.mockRejectedValueOnce(blockedError);

    const result = await buildImageBase64Slots({
      imageBase64s: [],
      imageLinks: ['http://169.254.169.254/latest/meta-data/'],
      images: [],
    });

    expect(mocks.fetchWithOutboundUrlPolicy).toHaveBeenCalledWith(
      'http://169.254.169.254/latest/meta-data/',
      { method: 'GET', maxRedirects: 3 }
    );
    expect(mocks.logClientError).toHaveBeenCalledWith(blockedError);
    expect(mocks.ErrorSystem.logWarning).toHaveBeenCalledWith(
      'Blocked outbound image fetch by URL policy.',
      {
        service: 'product-image-base64',
        url: 'http://169.254.169.254/latest/meta-data/',
        reason: 'private_ip',
        hostname: '169.254.169.254',
      }
    );
    expect(result.imageBase64s[0]).toBe('');
    expect(result.imageLinks[0]).toBe('http://169.254.169.254/latest/meta-data/');
  });

  it('builds base64 slots from data urls, remote files, local files, and image links', async () => {
    mocks.fetchWithOutboundUrlPolicy
      .mockResolvedValueOnce(
        new Response(Buffer.from('remote-slot'), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        })
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from('remote-link'), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        })
      );
    mocks.readFile
      .mockResolvedValueOnce(Buffer.from('local-slot'))
      .mockResolvedValueOnce(Buffer.from('local-link'));

    const result = await buildImageBase64Slots({
      imageBase64s: ['  data:image/webp;base64,EXISTING  '],
      imageLinks: [
        '',
        '',
        '',
        '',
        ' data:image/gif;base64,FROM_LINK ',
        'https://example.test/remote-link.jpg',
        '/uploads/local-link.png',
      ],
      images: [
        null,
        { imageFile: { filepath: 'data:image/jpeg;base64,SLOT_DATA_URL', mimetype: 'image/jpeg' } },
        { imageFile: { filepath: 'https://example.test/remote-slot.png', mimetype: 'image/png' } },
        { imageFile: { filepath: '/uploads/local-slot.webp', mimetype: 'image/webp' } },
      ],
    });

    expect(result.imageBase64s).toHaveLength(15);
    expect(result.imageLinks).toHaveLength(15);
    expect(result.imageBase64s[0]).toBe('data:image/webp;base64,EXISTING');
    expect(result.imageBase64s[1]).toBe('data:image/jpeg;base64,SLOT_DATA_URL');
    expect(result.imageBase64s[2]).toBe(
      `data:image/png;base64,${Buffer.from('remote-slot').toString('base64')}`
    );
    expect(result.imageBase64s[3]).toBe(
      `data:image/webp;base64,${Buffer.from('local-slot').toString('base64')}`
    );
    expect(result.imageBase64s[4]).toBe('data:image/gif;base64,FROM_LINK');
    expect(result.imageBase64s[5]).toBe(
      `data:image/jpeg;base64,${Buffer.from('remote-link').toString('base64')}`
    );
    expect(result.imageBase64s[6]).toBe(
      `data:image/png;base64,${Buffer.from('local-link').toString('base64')}`
    );
    expect(result.imageLinks.slice(0, 8)).toEqual([
      '',
      '',
      '',
      '',
      '',
      'https://example.test/remote-link.jpg',
      '/uploads/local-link.png',
      '',
    ]);
    expect(result.imageLinks[8]).toBe('');
    expect(mocks.fetchWithOutboundUrlPolicy).toHaveBeenNthCalledWith(
      1,
      'https://example.test/remote-slot.png',
      { method: 'GET', maxRedirects: 3 }
    );
    expect(mocks.fetchWithOutboundUrlPolicy).toHaveBeenNthCalledWith(
      2,
      'https://example.test/remote-link.jpg',
      { method: 'GET', maxRedirects: 3 }
    );
    expect(mocks.getDiskPathFromPublicPath).toHaveBeenNthCalledWith(1, '/uploads/local-slot.webp');
    expect(mocks.getDiskPathFromPublicPath).toHaveBeenNthCalledWith(2, '/uploads/local-link.png');
    expect(mocks.readFile).toHaveBeenNthCalledWith(1, '/disk/uploads/local-slot.webp');
    expect(mocks.readFile).toHaveBeenNthCalledWith(2, '/disk/uploads/local-link.png');
  });
});
