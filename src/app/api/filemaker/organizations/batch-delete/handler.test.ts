import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  deleteMongoFilemakerOrganizationsMock,
  requireFilemakerMailAdminSessionMock,
} = vi.hoisted(() => ({
  deleteMongoFilemakerOrganizationsMock: vi.fn(),
  requireFilemakerMailAdminSessionMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  deleteMongoFilemakerOrganizations: deleteMongoFilemakerOrganizationsMock,
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

import { postHandler } from './handler';

describe('filemaker organizations batch delete handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    deleteMongoFilemakerOrganizationsMock.mockResolvedValue({
      deletedJobListingCount: 1,
      deletedJobListingIds: ['job-1'],
      deletedOrganizationCount: 1,
      deletedOrganizationIds: ['org-1'],
      deletedOrganizations: [{ id: 'org-1', name: 'Acme Inc' }],
      missingOrganizationIds: [],
      requestedOrganizationIds: ['org-1'],
    });
  });

  it('deletes selected organizations and their job listings', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/organizations/batch-delete', {
        body: JSON.stringify({ organizationIds: ['org-1'] }),
        method: 'POST',
      })
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(deleteMongoFilemakerOrganizationsMock).toHaveBeenCalledWith(['org-1']);
    await expect(response.json()).resolves.toMatchObject({
      deletedJobListingCount: 1,
      deletedOrganizationCount: 1,
      deletedOrganizationIds: ['org-1'],
    });
  });
});
