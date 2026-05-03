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

import {
  resolveLocalScanImageCandidatePath,
  resolvePersistedProductScanSteps,
} from './product-scans-service.helpers';

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

  it('keeps persisted candidate steps distinct when only the candidate id changes', () => {
    const firstCandidateStep = {
      key: 'google_upload',
      label: 'Upload product image to Google',
      group: 'google_lens' as const,
      attempt: 1,
      candidateId: 'image-candidate-1',
      candidateRank: 1,
      inputSource: 'file' as const,
      retryOf: null,
      resultCode: 'upload_started',
      status: 'running' as const,
      message: 'Uploading the first image candidate.',
      warning: null,
      details: [],
      url: 'https://lens.google.com',
      startedAt: '2026-04-15T00:00:00.000Z',
      completedAt: null,
      durationMs: null,
    };

    const secondCandidateStep = {
      ...firstCandidateStep,
      candidateId: 'image-candidate-2',
      candidateRank: 2,
      message: 'Uploading the second image candidate.',
    };

    const mergedSteps = resolvePersistedProductScanSteps(
      { steps: [firstCandidateStep] },
      [secondCandidateStep]
    );

    expect(mergedSteps).toHaveLength(2);
    expect(mergedSteps.map((step) => step.candidateId)).toEqual([
      'image-candidate-1',
      'image-candidate-2',
    ]);
  });
});
