import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listMongoFilemakerEmailsMock,
  requireFilemakerMailAdminSessionMock,
} = vi.hoisted(() => ({
  listMongoFilemakerEmailsMock: vi.fn(),
  requireFilemakerMailAdminSessionMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  listMongoFilemakerEmails: listMongoFilemakerEmailsMock,
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

import { getHandler } from './handler';

describe('filemaker emails handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    listMongoFilemakerEmailsMock.mockResolvedValue({
      collectionCount: 2,
      emails: [],
      filters: {
        status: 'all',
        updatedBy: '',
      },
      limit: 100,
      linkCount: 3,
      linkCountsByEmailId: {},
      page: 1,
      pageSize: 100,
      query: '',
      sort: 'email_asc',
      totalCount: 2,
      totalCountIsExact: true,
      totalPages: 1,
    });
  });

  it('returns paged Mongo-backed emails', async () => {
    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/filemaker/emails?page=2&pageSize=50&query=bounce&status=bounced&sort=updatedAt_desc'
      ),
      { params: {} }
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(listMongoFilemakerEmailsMock).toHaveBeenCalledWith({
      limit: null,
      page: '2',
      pageSize: '50',
      query: 'bounce',
      sort: 'updatedAt_desc',
      status: 'bounced',
      updatedBy: null,
    });
    await expect(response.json()).resolves.toMatchObject({
      linkCount: 3,
      totalCount: 2,
      totalPages: 1,
    });
  });
});
