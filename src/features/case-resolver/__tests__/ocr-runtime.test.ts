import path from 'path';

import { describe, expect, it } from 'vitest';

import {
  isCaseResolverOcrFilepath,
  isCaseResolverImageFilepath,
  normalizeCaseResolverPublicFilepath,
  resolveCaseResolverOcrDiskPath,
  resolveCaseResolverImageDiskPath,
} from '@/features/case-resolver/server/ocr-runtime';
import { caseResolverRoot } from '@/shared/lib/files/server-constants';

describe('case resolver OCR runtime path helpers', () => {
  it('normalizes public file paths from full URLs', () => {
    expect(
      normalizeCaseResolverPublicFilepath(
        'https://example.test/uploads/case-resolver/images/scan.png?token=abc'
      )
    ).toBe('/uploads/case-resolver/images/scan.png');
  });

  it('accepts only case resolver image file paths', () => {
    expect(isCaseResolverImageFilepath('/uploads/case-resolver/images/scan.png')).toBe(true);
    expect(isCaseResolverImageFilepath('/uploads/case-resolver/images/scan.pdf')).toBe(false);
    expect(isCaseResolverImageFilepath('/uploads/notes/note.png')).toBe(false);
  });

  it('accepts OCR paths for case resolver images and PDFs', () => {
    expect(isCaseResolverOcrFilepath('/uploads/case-resolver/images/scan.png')).toBe(true);
    expect(isCaseResolverOcrFilepath('/uploads/case-resolver/pdfs/scan.pdf')).toBe(true);
    expect(isCaseResolverOcrFilepath('/uploads/case-resolver/files/readme.txt')).toBe(false);
  });

  it('resolves valid OCR file paths to disk and rejects invalid paths', () => {
    const diskPath = resolveCaseResolverImageDiskPath('/uploads/case-resolver/images/scan.png');
    expect(diskPath).toBe(
      path.resolve(caseResolverRoot, 'images', 'scan.png')
    );

    const pdfPath = resolveCaseResolverOcrDiskPath('/uploads/case-resolver/pdfs/scan.pdf');
    expect(pdfPath.kind).toBe('pdf');
    expect(pdfPath.diskPath).toBe(
      path.resolve(caseResolverRoot, 'pdfs', 'scan.pdf')
    );
    expect(() => resolveCaseResolverImageDiskPath('/uploads/notes/scan.png')).toThrow(
      'Only Case Resolver uploaded files are supported.'
    );
  });
});
