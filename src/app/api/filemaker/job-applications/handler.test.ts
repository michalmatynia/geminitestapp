import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listMongoFilemakerJobApplicationsMock, requireFilemakerMailAdminSessionMock } =
  vi.hoisted(() => ({
    listMongoFilemakerJobApplicationsMock: vi.fn(),
    requireFilemakerMailAdminSessionMock: vi.fn(),
  }));

vi.mock('@/features/filemaker/server', () => ({
  listMongoFilemakerJobApplications: listMongoFilemakerJobApplicationsMock,
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

import { getHandler } from './handler';

describe('filemaker job applications handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    listMongoFilemakerJobApplicationsMock.mockResolvedValue([
      {
        id: 'application-1',
        jobListingId: 'job-1',
        organizationId: 'org-1',
        personId: 'person-1',
      },
    ]);
  });

  it('lists applications for an organization filter', async () => {
    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/filemaker/job-applications?organizationId=org-1&limit=12'
      )
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(listMongoFilemakerJobApplicationsMock).toHaveBeenCalledWith({
      jobListingId: null,
      limit: 12,
      organizationId: 'org-1',
      personId: null,
    });
    await expect(response.json()).resolves.toEqual({
      applications: [
        {
          id: 'application-1',
          jobListingId: 'job-1',
          organizationId: 'org-1',
          personId: 'person-1',
        },
      ],
    });
  });
});
