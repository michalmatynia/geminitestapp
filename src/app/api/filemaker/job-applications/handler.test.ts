import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  collapseLegacyMongoFilemakerJobApplicationsForListingMock,
  listMongoFilemakerJobApplicationsMock,
  requireFilemakerMailAdminSessionMock,
  upsertManualAppliedMongoFilemakerJobApplicationMock,
} =
  vi.hoisted(() => ({
    collapseLegacyMongoFilemakerJobApplicationsForListingMock: vi.fn(),
    listMongoFilemakerJobApplicationsMock: vi.fn(),
    requireFilemakerMailAdminSessionMock: vi.fn(),
    upsertManualAppliedMongoFilemakerJobApplicationMock: vi.fn(),
  }));

vi.mock('@/features/filemaker/server', () => ({
  collapseLegacyMongoFilemakerJobApplicationsForListing:
    collapseLegacyMongoFilemakerJobApplicationsForListingMock,
  listMongoFilemakerJobApplications: listMongoFilemakerJobApplicationsMock,
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
  upsertManualAppliedMongoFilemakerJobApplication:
    upsertManualAppliedMongoFilemakerJobApplicationMock,
}));

import { getHandler, postHandler } from './handler';

describe('filemaker job applications handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collapseLegacyMongoFilemakerJobApplicationsForListingMock.mockResolvedValue({
      canonicalApplicationsCreated: 0,
      canonicalApplicationsUpdated: 0,
      legacyApplicationsDeleted: 0,
      legacyGroupsSkipped: 0,
    });
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    listMongoFilemakerJobApplicationsMock.mockResolvedValue([
      {
        id: 'application-1',
        jobListingId: 'job-1',
        organizationId: 'org-1',
        personId: 'person-1',
      },
    ]);
    upsertManualAppliedMongoFilemakerJobApplicationMock.mockResolvedValue({
      id: 'manual-application-1',
      jobListingId: 'job-1',
      organizationId: 'org-1',
      personId: 'person-1',
      status: 'applied',
    });
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

  it('creates or updates a manual applied application marker', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/job-applications', {
        body: JSON.stringify({
          action: 'mark_applied_manual',
          jobListingId: 'job-1',
          jobTitle: 'FileMaker Consultant',
          organizationId: 'org-1',
          organizationName: 'Acme Hiring',
          personId: 'person-1',
          personName: 'Ada Lovelace',
          sourceSite: 'pracuj.pl',
          sourceUrl: 'https://example.com/job',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(upsertManualAppliedMongoFilemakerJobApplicationMock).toHaveBeenCalledWith({
      jobListingId: 'job-1',
      jobTitle: 'FileMaker Consultant',
      organizationId: 'org-1',
      organizationName: 'Acme Hiring',
      personId: 'person-1',
      personName: 'Ada Lovelace',
      sourceSite: 'pracuj.pl',
      sourceUrl: 'https://example.com/job',
    });
    await expect(response.json()).resolves.toEqual({
      application: {
        id: 'manual-application-1',
        jobListingId: 'job-1',
        organizationId: 'org-1',
        personId: 'person-1',
        status: 'applied',
      },
    });
  });
});
