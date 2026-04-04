import { describe, expect, it } from 'vitest';

import {
  CASE_RESOLVER_UPLOAD_DISK_PREFIX,
  assertCaseResolverPdfFilepath,
  assertCaseResolverUploadDiskPath,
  buildCaseResolverPdfExtractResponse,
  normalizePublicFilepath,
  resolveCaseResolverPdfExtractFilepath,
  resolvePdfParseFn,
} from './handler.helpers';

describe('case resolver extract-pdf helpers', () => {
  it('normalizes public filepaths from absolute urls and query strings', () => {
    expect(normalizePublicFilepath(' https://example.com/uploads/case-resolver/file.pdf?x=1 ')).toBe(
      '/uploads/case-resolver/file.pdf'
    );
    expect(normalizePublicFilepath('uploads/case-resolver/file.pdf')).toBe(
      '/uploads/case-resolver/file.pdf'
    );
    expect(normalizePublicFilepath('')).toBeNull();
  });

  it('validates filepath scope and disk-path boundaries', () => {
    expect(resolveCaseResolverPdfExtractFilepath({ filepath: ' /uploads/case-resolver/test.pdf ' })).toBe(
      '/uploads/case-resolver/test.pdf'
    );
    expect(() => assertCaseResolverPdfFilepath('/uploads/other/file.pdf')).toThrow(
      'Only case resolver uploaded PDFs can be extracted'
    );
    expect(() => assertCaseResolverPdfFilepath('/uploads/case-resolver/file.txt')).toThrow(
      'Only PDF files are supported'
    );
    expect(() =>
      assertCaseResolverUploadDiskPath(`${CASE_RESOLVER_UPLOAD_DISK_PREFIX}/nested/file.pdf`)
    ).not.toThrow();
    expect(() => assertCaseResolverUploadDiskPath('/tmp/file.pdf')).toThrow(
      'Resolved path is outside case resolver uploads'
    );
  });

  it('resolves parser functions and shapes trimmed extract responses', async () => {
    const parser = resolvePdfParseFn({
      default: async () => ({ text: '  extracted text  ', numpages: 3 }),
    });

    await expect(parser(Buffer.from('pdf'))).resolves.toEqual({
      text: '  extracted text  ',
      numpages: 3,
    });
    expect(
      buildCaseResolverPdfExtractResponse('/uploads/case-resolver/file.pdf', {
        text: '  extracted text  ',
        numpages: 3,
      })
    ).toEqual({
      filepath: '/uploads/case-resolver/file.pdf',
      text: 'extracted text',
      pageCount: 3,
    });
    expect(() => resolvePdfParseFn({})).toThrow('PDF parser is unavailable');
  });
});
