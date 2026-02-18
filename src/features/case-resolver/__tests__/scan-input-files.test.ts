import { describe, expect, it } from 'vitest';

import {
  isLikelyImageFile,
  isLikelyPdfFile,
  isLikelyScanInputFile,
} from '@/features/case-resolver/hooks/useCaseResolverState.helpers';

const createMockFile = (name: string, type: string): File =>
  ({ name, type } as unknown as File);

describe('case-resolver scan input guards', () => {
  it('accepts image and pdf files for scan uploads', () => {
    expect(isLikelyImageFile(createMockFile('photo.png', 'image/png'))).toBe(true);
    expect(isLikelyPdfFile(createMockFile('file.pdf', 'application/pdf'))).toBe(true);
    expect(isLikelyScanInputFile(createMockFile('doc.pdf', 'application/pdf'))).toBe(true);
    expect(isLikelyScanInputFile(createMockFile('scan.jpg', 'image/jpeg'))).toBe(true);
  });

  it('rejects unsupported files for scan uploads', () => {
    expect(isLikelyPdfFile(createMockFile('readme.txt', 'text/plain'))).toBe(false);
    expect(isLikelyScanInputFile(createMockFile('readme.txt', 'text/plain'))).toBe(false);
  });
});

