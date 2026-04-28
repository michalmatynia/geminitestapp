import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listMongoFilemakerOrganizationIdsMock,
  listMongoFilemakerOrganizationsMock,
  requireFilemakerMailAdminSessionMock,
} = vi.hoisted(() => ({
  listMongoFilemakerOrganizationIdsMock: vi.fn(),
  listMongoFilemakerOrganizationsMock: vi.fn(),
  requireFilemakerMailAdminSessionMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  listMongoFilemakerOrganizationIds: listMongoFilemakerOrganizationIdsMock,
  listMongoFilemakerOrganizations: listMongoFilemakerOrganizationsMock,
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

import { getHandler } from './handler';

describe('filemaker organizations handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    listMongoFilemakerOrganizationIdsMock.mockResolvedValue(['org-1', 'org-2']);
    listMongoFilemakerOrganizationsMock.mockResolvedValue({
      collectionCount: 2,
      filters: {
        address: 'all',
        bank: 'all',
        parent: 'all',
        updatedBy: '',
      },
      limit: 48,
      linkedEventsByOrganizationId: {},
      organizations: [],
      page: 1,
      pageSize: 48,
      query: '',
      totalCount: 2,
      totalCountIsExact: true,
      totalPages: 1,
    });
  });

  it('returns matching organization ids for resultset selection', async () => {
    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/filemaker/organizations?idsOnly=true&query=acme&address=with_address'
      ),
      { params: {} }
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(listMongoFilemakerOrganizationIdsMock).toHaveBeenCalledWith({
      address: 'with_address',
      bank: null,
      limit: null,
      page: null,
      pageSize: null,
      parent: null,
      query: 'acme',
      updatedBy: null,
    });
    expect(listMongoFilemakerOrganizationsMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ ids: ['org-1', 'org-2'] });
  });

  it('returns paged organizations by default', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/filemaker/organizations?page=2&pageSize=24'),
      { params: {} }
    );

    expect(listMongoFilemakerOrganizationsMock).toHaveBeenCalledWith({
      address: null,
      bank: null,
      limit: null,
      page: '2',
      pageSize: '24',
      parent: null,
      query: null,
      updatedBy: null,
    });
    await expect(response.json()).resolves.toMatchObject({
      totalCount: 2,
      totalPages: 1,
    });
  });
});
