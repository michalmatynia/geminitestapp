import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  createFilemakerJobApplicationCoverLetterPdfResponseMock,
  requireFilemakerMailAdminSessionMock,
} = vi.hoisted(() => ({
  createFilemakerJobApplicationCoverLetterPdfResponseMock: vi.fn(),
  requireFilemakerMailAdminSessionMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  createFilemakerJobApplicationCoverLetterPdfResponse:
    createFilemakerJobApplicationCoverLetterPdfResponseMock,
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

import { postHandler } from './handler';

const requestContext = {
  requestId: 'request-job-application-cover-letter-pdf-1',
  traceId: 'trace-job-application-cover-letter-pdf-1',
  correlationId: 'corr-job-application-cover-letter-pdf-1',
  startTime: Date.now(),
  getElapsedMs: () => 1,
} as ApiHandlerContext;

describe('filemaker job application cover letter PDF handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    createFilemakerJobApplicationCoverLetterPdfResponseMock.mockResolvedValue(
      new Response('pdf-bytes', {
        headers: { 'Content-Type': 'application/pdf' },
      })
    );
  });

  it('exports the requested cover letter PDF', async () => {
    const response = await postHandler(
      new NextRequest(
        'http://localhost/api/filemaker/job-applications/application-1/cover-letter-pdf',
        { method: 'POST' }
      ),
      requestContext,
      { applicationId: 'application-1' }
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(createFilemakerJobApplicationCoverLetterPdfResponseMock).toHaveBeenCalledWith({
      applicationId: 'application-1',
      coverLetterVersionId: null,
    });
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
  });
});
