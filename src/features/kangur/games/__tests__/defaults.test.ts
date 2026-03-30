import { describe, expect, it } from 'vitest';

import { createDefaultKangurGames } from '@/features/kangur/games';

describe('kangur game defaults', () => {
  it('keeps game ids unique across modular game catalogs', () => {
    const games = createDefaultKangurGames();
    const ids = games.map((game) => game.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
