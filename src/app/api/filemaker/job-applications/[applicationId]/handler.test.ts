import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  deleteMongoFilemakerJobApplicationMock,
  removeMongoFilemakerJobApplicationLogEntryMock,
  requireFilemakerMailAdminSessionMock,
  requireMongoFilemakerJobApplicationByIdMock,
  updateMongoFilemakerJobApplicationStatusMock,
} = vi.hoisted(() => ({
  deleteMongoFilemakerJobApplicationMock: vi.fn(),
  removeMongoFilemakerJobApplicationLogEntryMock: vi.fn(),
  requireFilemakerMailAdminSessionMock: vi.fn(),
  requireMongoFilemakerJobApplicationByIdMock: vi.fn(),
  updateMongoFilemakerJobApplicationStatusMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  deleteMongoFilemakerJobApplication: deleteMongoFilemakerJobApplicationMock,
  removeMongoFilemakerJobApplicationLogEntry: removeMongoFilemakerJobApplicationLogEntryMock,
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
  requireMongoFilemakerJobApplicationById: requireMongoFilemakerJobApplicationByIdMock,
  updateMongoFilemakerJobApplicationStatus: updateMongoFilemakerJobApplicationStatusMock,
}));

import { deleteHandler, getHandler, patchHandler } from './handler';

const requestContext = {
  requestId: 'request-job-application-1',
  traceId: 'trace-job-application-1',
  correlationId: 'corr-job-application-1',
  startTime: Date.now(),
  getElapsedMs: () => 1,
} as ApiHandlerContext;

const baseApplication = {
  id: 'application-1',
  status: 'draft',
  jobListingId: 'job-1',
  organizationId: 'org-1',
  personId: 'person-1',
};

const appliedApplication = { ...baseApplication, status: 'applied' };

describe('filemaker job application by-id handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    requireMongoFilemakerJobApplicationByIdMock.mockResolvedValue(baseApplication);
    updateMongoFilemakerJobApplicationStatusMock.mockResolvedValue(appliedApplication);
    deleteMongoFilemakerJobApplicationMock.mockResolvedValue(undefined);
    removeMongoFilemakerJobApplicationLogEntryMock.mockResolvedValue({
      ...baseApplication,
      applicationLog: [],
    });
  });

  it('returns the requested application package', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/filemaker/job-applications/application-1'),
      requestContext,
      { applicationId: 'application-1' }
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(requireMongoFilemakerJobApplicationByIdMock).toHaveBeenCalledWith('application-1');
    await expect(response.json()).resolves.toEqual({ application: baseApplication });
  });

  it('updates the application status', async () => {
    const response = await patchHandler(
      new NextRequest('http://localhost/api/filemaker/job-applications/application-1', {
        body: JSON.stringify({ status: 'applied' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
      requestContext,
      { applicationId: 'application-1' }
    );

    expect(updateMongoFilemakerJobApplicationStatusMock).toHaveBeenCalledWith(
      'application-1',
      'applied'
    );
    await expect(response.json()).resolves.toEqual({ application: appliedApplication });
  });

  it('removes a log entry by id', async () => {
    const response = await patchHandler(
      new NextRequest('http://localhost/api/filemaker/job-applications/application-1', {
        body: JSON.stringify({ removeLogEntryId: 'log-entry-uuid-1' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
      requestContext,
      { applicationId: 'application-1' }
    );

    expect(removeMongoFilemakerJobApplicationLogEntryMock).toHaveBeenCalledWith(
      'application-1',
      'log-entry-uuid-1'
    );
    expect(updateMongoFilemakerJobApplicationStatusMock).not.toHaveBeenCalled();
    const body = (await response.json()) as { application: unknown };
    expect(body.application).toMatchObject({ id: 'application-1', applicationLog: [] });
  });

  it('rejects removeLogEntryId that is empty', async () => {
    const response = await patchHandler(
      new NextRequest('http://localhost/api/filemaker/job-applications/application-1', {
        body: JSON.stringify({ removeLogEntryId: '' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      }),
      requestContext,
      { applicationId: 'application-1' }
    );

    expect(response.status).toBe(400);
    expect(removeMongoFilemakerJobApplicationLogEntryMock).not.toHaveBeenCalled();
  });

  it('deletes the requested application package', async () => {
    const response = await deleteHandler(
      new NextRequest('http://localhost/api/filemaker/job-applications/application-1', {
        method: 'DELETE',
      }),
      requestContext,
      { applicationId: 'application-1' }
    );

    expect(deleteMongoFilemakerJobApplicationMock).toHaveBeenCalledWith('application-1');
    expect(response.status).toBe(204);
  });
});
