import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  readFileMock,
  getDiskPathFromPublicPathMock,
  pdfParseMock,
  pdfParseModuleDefault,
} = vi.hoisted(() => ({
  readFileMock: vi.fn(),
  getDiskPathFromPublicPathMock: vi.fn(),
  pdfParseMock: vi.fn(),
  pdfParseModuleDefault: { current: null as unknown },
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: readFileMock,
  },
  readFile: readFileMock,
}));

vi.mock('@/features/files/server', () => ({
  getDiskPathFromPublicPath: getDiskPathFromPublicPathMock,
}));

vi.mock('pdf-parse', () => ({
  get default() {
    return pdfParseModuleDefault.current;
  },
}));

import { postHandler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-extract-pdf-1',
    traceId: 'trace-extract-pdf-1',
    correlationId: 'corr-extract-pdf-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('case resolver extract-pdf handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pdfParseModuleDefault.current = pdfParseMock;
    getDiskPathFromPublicPathMock.mockReturnValue(
      `${process.cwd()}/public/uploads/case-resolver/case/file.pdf`
    );
    readFileMock.mockResolvedValue(Buffer.from('pdf-bytes'));
    pdfParseMock.mockResolvedValue({
      text: '  extracted text  ',
      numpages: 3,
    });
  });

  it('extracts text from a case-resolver pdf and returns trimmed response payload', async () => {
    const request = new NextRequest('http://localhost/api/case-resolver/assets/extract-pdf', {
      method: 'POST',
      body: JSON.stringify({
        filepath: 'https://example.com/uploads/case-resolver/case/file.pdf?token=abc',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await postHandler(request, createContext());

    expect(response.status).toBe(200);
    expect(getDiskPathFromPublicPathMock).toHaveBeenCalledWith(
      '/uploads/case-resolver/case/file.pdf'
    );
    expect(readFileMock).toHaveBeenCalledWith(
      `${process.cwd()}/public/uploads/case-resolver/case/file.pdf`
    );
    await expect(response.json()).resolves.toEqual({
      filepath: '/uploads/case-resolver/case/file.pdf',
      text: 'extracted text',
      pageCount: 3,
    });
  });

  it('rejects invalid json payloads with a typed bad request error', async () => {
    const request = new NextRequest('http://localhost/api/case-resolver/assets/extract-pdf', {
      method: 'POST',
      body: '{not-json',
      headers: {
        'content-type': 'application/json',
      },
    });

    await expect(postHandler(request, createContext())).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      httpStatus: 400,
    });

    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('rejects requests when the pdf parser module is unavailable', async () => {
    pdfParseModuleDefault.current = null;

    const request = new NextRequest('http://localhost/api/case-resolver/assets/extract-pdf', {
      method: 'POST',
      body: JSON.stringify({
        filepath: '/uploads/case-resolver/case/file.pdf',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    await expect(postHandler(request, createContext())).rejects.toThrow(
      'PDF parser is unavailable'
    );
  });
});
