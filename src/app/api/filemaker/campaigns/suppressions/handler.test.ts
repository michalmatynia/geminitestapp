import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assertSettingsManageAccessMock,
  loadFilemakerMailSuppressionEntriesMock,
  removeFilemakerMailSuppressionEntryMock,
} = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  loadFilemakerMailSuppressionEntriesMock: vi.fn(),
  removeFilemakerMailSuppressionEntryMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/features/filemaker/server', () => ({
  loadFilemakerMailSuppressionEntries: loadFilemakerMailSuppressionEntriesMock,
  removeFilemakerMailSuppressionEntry: removeFilemakerMailSuppressionEntryMock,
}));

import { deleteHandler, getHandler } from './handler';

describe('filemaker campaign suppressions handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
  });

  it('GET lists suppression entries', async () => {
    loadFilemakerMailSuppressionEntriesMock.mockResolvedValue([
      { id: 's-1', emailAddress: 'bob@example.com', reason: 'bounced' },
    ]);

    const response = await getHandler(
      new NextRequest('http://localhost/api/filemaker/campaigns/suppressions'),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(assertSettingsManageAccessMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      entries: [
        { id: 's-1', emailAddress: 'bob@example.com', reason: 'bounced' },
      ],
    });
  });

  it('DELETE removes an entry when it exists', async () => {
    removeFilemakerMailSuppressionEntryMock.mockResolvedValue({
      removed: true,
      entry: { id: 's-1', emailAddress: 'bob@example.com', reason: 'bounced' },
    });

    const response = await deleteHandler(
      new NextRequest('http://localhost/api/filemaker/campaigns/suppressions', {
        method: 'DELETE',
        body: JSON.stringify({ emailAddress: 'bob@example.com' }),
      }),
      {} as Parameters<typeof deleteHandler>[1]
    );

    expect(removeFilemakerMailSuppressionEntryMock).toHaveBeenCalledWith(
      'bob@example.com'
    );
    await expect(response.json()).resolves.toEqual({
      removed: true,
      entry: { id: 's-1', emailAddress: 'bob@example.com', reason: 'bounced' },
    });
  });

  it('DELETE returns 404 when no entry exists for the address', async () => {
    removeFilemakerMailSuppressionEntryMock.mockResolvedValue({
      removed: false,
      entry: null,
    });

    await expect(
      deleteHandler(
        new NextRequest('http://localhost/api/filemaker/campaigns/suppressions', {
          method: 'DELETE',
          body: JSON.stringify({ emailAddress: 'nope@example.com' }),
        }),
        {} as Parameters<typeof deleteHandler>[1]
      )
    ).rejects.toThrow(/No suppression entry found/);
  });
});
