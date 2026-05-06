import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilemakerJobListing } from '@/features/filemaker/types';

const {
  getMongoFilemakerOrganizationNamesByIdsMock,
  listAllSettingsFilemakerJobListingsMock,
  listMongoFilemakerJobApplicationsMock,
  requireFilemakerMailAdminSessionMock,
} = vi.hoisted(() => ({
  getMongoFilemakerOrganizationNamesByIdsMock: vi.fn(),
  listAllSettingsFilemakerJobListingsMock: vi.fn(),
  listMongoFilemakerJobApplicationsMock: vi.fn(),
  requireFilemakerMailAdminSessionMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  getMongoFilemakerOrganizationNamesByIds: getMongoFilemakerOrganizationNamesByIdsMock,
  listAllSettingsFilemakerJobListings: listAllSettingsFilemakerJobListingsMock,
  listMongoFilemakerJobApplications: listMongoFilemakerJobApplicationsMock,
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

import { getHandler } from './handler';

const timestamp = '2026-05-01T10:00:00.000Z';

const createListing = (input: {
  id: string;
  organizationId: string;
  title: string;
  sourceSite?: string;
  sourceUrl?: string;
  status?: FilemakerJobListing['status'];
  updatedAt?: string;
}): FilemakerJobListing => ({
  id: input.id,
  organizationId: input.organizationId,
  title: input.title,
  description: '',
  location: '',
  salaryMin: null,
  salaryMax: null,
  salaryPeriod: 'monthly',
  status: input.status ?? 'open',
  sourceSite: input.sourceSite,
  sourceUrl: input.sourceUrl,
  targetedCampaignIds: [],
  lexiconTermIds: [],
  createdAt: timestamp,
  updatedAt: input.updatedAt ?? timestamp,
});

describe('filemaker job listings handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    listMongoFilemakerJobApplicationsMock.mockResolvedValue([]);
    listAllSettingsFilemakerJobListingsMock.mockResolvedValue([
      createListing({
        id: 'job-1',
        organizationId: 'org-1',
        title: 'Frontend Developer',
        updatedAt: '2026-05-03T10:00:00.000Z',
      }),
      createListing({
        id: 'job-2',
        organizationId: 'org-2',
        sourceSite: 'justjoin.it',
        sourceUrl: 'https://justjoin.it/job-2',
        title: 'Backend Developer',
        updatedAt: '2026-05-02T10:00:00.000Z',
      }),
    ]);
    getMongoFilemakerOrganizationNamesByIdsMock.mockResolvedValue(
      new Map([
        ['org-1', 'Acme Hiring'],
        ['org-2', 'Globex'],
      ])
    );
  });

  it('searches by organization display name', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/filemaker/job-listings?query=acme'),
      { params: {} }
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(getMongoFilemakerOrganizationNamesByIdsMock).toHaveBeenCalledWith(['org-1', 'org-2']);
    await expect(response.json()).resolves.toMatchObject({
      listings: [
        {
          id: 'job-1',
          organizationName: 'Acme Hiring',
        },
      ],
      total: 1,
    });
  });

  it('searches by source site and source url', async () => {
    const sourceSiteResponse = await getHandler(
      new NextRequest('http://localhost/api/filemaker/job-listings?query=justjoin'),
      { params: {} }
    );
    await expect(sourceSiteResponse.json()).resolves.toMatchObject({
      listings: [{ id: 'job-2' }],
      total: 1,
    });

    const sourceUrlResponse = await getHandler(
      new NextRequest('http://localhost/api/filemaker/job-listings?query=job-2'),
      { params: {} }
    );
    await expect(sourceUrlResponse.json()).resolves.toMatchObject({
      listings: [{ id: 'job-2' }],
      total: 1,
    });
  });
});
