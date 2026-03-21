import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createURLMock, shareMock } = vi.hoisted(() => ({
  createURLMock: vi.fn(),
  shareMock: vi.fn(),
}));

vi.mock('expo-linking', () => ({
  createURL: createURLMock,
}));

vi.mock('react-native', () => ({
  Share: {
    share: shareMock,
  },
}));

import {
  createKangurDuelInviteShareMessage,
  createKangurDuelInviteUrl,
  shareKangurDuelInvite,
} from './duelInviteShare';

describe('duelInviteShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createURLMock.mockReturnValue('kangur://duels?join=invite-1');
    shareMock.mockResolvedValue({
      action: 'sharedAction',
    });
  });

  it('builds a join deep link for duel invites', () => {
    expect(createKangurDuelInviteUrl(' invite-1 ')).toBe(
      'kangur://duels?join=invite-1',
    );
    expect(createURLMock).toHaveBeenCalledWith('/duels', {
      queryParams: {
        join: 'invite-1',
      },
    });
  });

  it('shares a localized invite message with the generated url', async () => {
    await shareKangurDuelInvite({
      sessionId: 'invite-1',
      sharerDisplayName: 'Ada',
    });

    expect(shareMock).toHaveBeenCalledWith({
      message:
        'Dołącz do prywatnego pojedynku Kangura od Ada.\nkangur://duels?join=invite-1',
      title: 'Zaproszenie do pojedynku Kangur',
      url: 'kangur://duels?join=invite-1',
    });
    expect(
      createKangurDuelInviteShareMessage({
        sessionId: 'invite-1',
        sharerDisplayName: 'Ada',
      }),
    ).toContain('Dołącz do prywatnego pojedynku Kangura od Ada.');
  });
});
