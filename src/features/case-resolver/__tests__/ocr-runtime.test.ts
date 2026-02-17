import path from 'path';

import { describe, expect, it } from 'vitest';

import {
  isCaseResolverImageFilepath,
  normalizeCaseResolverPublicFilepath,
  resolveCaseResolverImageDiskPath,
} from '@/features/case-resolver/server/ocr-runtime';

describe('case resolver OCR runtime path helpers', () => {
  it('normalizes public file paths from full URLs', () => {
    expect(
      normalizeCaseResolverPublicFilepath(
        'https://example.test/uploads/case-resolver/images/scan.png?token=abc'
      )
    ).toBe('/uploads/case-resolver/images/scan.png');
  });

  it('accepts only case resolver image file paths', () => {
    expect(
      isCaseResolverImageFilepath('/uploads/case-resolver/images/scan.png')
    ).toBe(true);
    expect(
      isCaseResolverImageFilepath('/uploads/case-resolver/images/scan.pdf')
    ).toBe(false);
    expect(isCaseResolverImageFilepath('/uploads/notes/note.png')).toBe(false);
  });

  it('resolves valid OCR file paths to disk and rejects invalid paths', () => {
    const diskPath = resolveCaseResolverImageDiskPath(
      '/uploads/case-resolver/images/scan.png'
    );
    expect(diskPath).toBe(
      path.resolve(
        process.cwd(),
        'public',
        'uploads',
        'case-resolver',
        'images',
        'scan.png'
      )
    );

    expect(() =>
      resolveCaseResolverImageDiskPath('/uploads/case-resolver/images/scan.pdf')
    ).toThrow('Only image files are supported for OCR runtime.');
    expect(() =>
      resolveCaseResolverImageDiskPath('/uploads/notes/scan.png')
    ).toThrow('Only Case Resolver uploaded images are supported.');
  });
});

