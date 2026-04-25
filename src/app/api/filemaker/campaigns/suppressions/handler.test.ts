import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assertSettingsManageAccessMock,
  loadFilemakerMailSuppressionEntriesMock,
  pruneFilemakerCampaignColdRecipientsMock,
  removeFilemakerMailSuppressionEntryMock,
} = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  loadFilemakerMailSuppressionEntriesMock: vi.fn(),
  pruneFilemakerCampaignColdRecipientsMock: vi.fn(),
  removeFilemakerMailSuppressionEntryMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/features/filemaker/server', () => ({
  loadFilemakerMailSuppressionEntries: loadFilemakerMailSuppressionEntriesMock,
  pruneFilemakerCampaignColdRecipients: pruneFilemakerCampaignColdRecipientsMock,
  removeFilemakerMailSuppressionEntry: removeFilemakerMailSuppressionEntryMock,
}));

import { deleteHandler, getHandler, postHandler } from './handler';

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

  it('POST runs cold-recipient pruning', async () => {
    pruneFilemakerCampaignColdRecipientsMock.mockResolvedValue({
      candidates: [{ emailAddress: 'cold@example.com', sentCount: 7, lastSentAt: null }],
      addedCount: 1,
      skippedCount: 0,
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/campaigns/suppressions', {
        method: 'POST',
        body: JSON.stringify({ minSendsWithoutEngagement: 7 }),
      }),
      {} as Parameters<typeof postHandler>[1]
    );

    expect(pruneFilemakerCampaignColdRecipientsMock).toHaveBeenCalledWith({
      actor: 'admin-manual-cold-prune',
      minSendsWithoutEngagement: 7,
    });
    await expect(response.json()).resolves.toEqual({
      candidates: [{ emailAddress: 'cold@example.com', sentCount: 7, lastSentAt: null }],
      addedCount: 1,
      skippedCount: 0,
    });
  });
});
