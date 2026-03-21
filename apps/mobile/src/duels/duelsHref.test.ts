import { describe, expect, it } from 'vitest';

import { createKangurDuelsHref } from './duelsHref';

describe('createKangurDuelsHref', () => {
  it('returns the lobby route by default', () => {
    expect(createKangurDuelsHref()).toBe('/duels');
  });

  it('returns a session route for participant mode', () => {
    expect(createKangurDuelsHref({ sessionId: 'duel-1' })).toEqual({
      pathname: '/duels',
      params: {
        sessionId: 'duel-1',
      },
    });
  });

  it('returns a session route for spectator mode', () => {
    expect(createKangurDuelsHref({ sessionId: 'duel-1', spectate: true })).toEqual({
      pathname: '/duels',
      params: {
        sessionId: 'duel-1',
        spectate: '1',
      },
    });
  });
});
