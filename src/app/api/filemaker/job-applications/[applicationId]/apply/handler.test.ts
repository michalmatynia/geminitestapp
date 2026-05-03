import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getLatestMongoFilemakerJobApplicationApplyRunMock,
  requireFilemakerMailAdminSessionMock,
  startFilemakerJobApplicationApplyRunMock,
} = vi.hoisted(() => ({
  getLatestMongoFilemakerJobApplicationApplyRunMock: vi.fn(),
  requireFilemakerMailAdminSessionMock: vi.fn(),
  startFilemakerJobApplicationApplyRunMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  getLatestMongoFilemakerJobApplicationApplyRun:
    getLatestMongoFilemakerJobApplicationApplyRunMock,
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-job-application-apply', () => ({
  startFilemakerJobApplicationApplyRun: startFilemakerJobApplicationApplyRunMock,
}));

import { getHandler, postHandler } from './handler';

const requestContext = {
  requestId: 'request-job-application-apply-1',
  traceId: 'trace-job-application-apply-1',
  correlationId: 'corr-job-application-apply-1',
  startTime: Date.now(),
  getElapsedMs: () => 1,
} as ApiHandlerContext;

const applyRun = {
  id: 'apply-run-1',
  applicationId: 'application-1',
  organizationId: 'org-1',
  personId: 'person-1',
  jobListingId: 'job-1',
  integrationId: 'integration-pracuj',
  integrationSlug: 'pracuj-pl',
  connectionId: 'connection-pracuj',
  sourceUrl: 'https://www.pracuj.pl/praca/filemaker-consultant,oferta,1001',
  mode: 'submit',
  status: 'queued',
  artifactVersionIds: {
    applicationEmailVersionId: 'email-version-1',
    coverLetterVersionId: 'cover-letter-version-1',
    tailoredCvVersionId: 'cv-version-1',
  },
  confirmationUrl: null,
  error: null,
  steps: [],
  createdAt: '2026-04-29T10:00:00.000Z',
  startedAt: null,
  completedAt: null,
  updatedAt: '2026-04-29T10:00:00.000Z',
};

describe('filemaker job application apply handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    getLatestMongoFilemakerJobApplicationApplyRunMock.mockResolvedValue(applyRun);
    startFilemakerJobApplicationApplyRunMock.mockResolvedValue(applyRun);
  });

  it('returns the latest apply run for the application', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/filemaker/job-applications/application-1/apply'),
      requestContext,
      { applicationId: 'application-1' }
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(getLatestMongoFilemakerJobApplicationApplyRunMock).toHaveBeenCalledWith(
      'application-1'
    );
    await expect(response.json()).resolves.toEqual({ run: applyRun });
  });

  it('starts an apply run with the selected artifact versions', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/job-applications/application-1/apply', {
        body: JSON.stringify({
          activeArtifacts: {
            applicationEmailVersionId: 'email-version-1',
            coverLetterVersionId: 'cover-letter-version-1',
            tailoredCvVersionId: 'cv-version-1',
          },
          mode: 'submit',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      requestContext,
      { applicationId: 'application-1' }
    );

    expect(startFilemakerJobApplicationApplyRunMock).toHaveBeenCalledWith({
      activeArtifacts: {
        applicationEmailVersionId: 'email-version-1',
        coverLetterVersionId: 'cover-letter-version-1',
        tailoredCvVersionId: 'cv-version-1',
      },
      applicationId: 'application-1',
      force: undefined,
      mode: 'submit',
    });
    await expect(response.json()).resolves.toEqual({ run: applyRun });
  });
});
