import { describe, expect, it, vi } from 'vitest';

import { invalidateKangurMobileAuthQueries } from './invalidateKangurMobileAuthQueries';

describe('invalidateKangurMobileAuthQueries', () => {
  it('invalidates leaderboard and shared score-history query families', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);

    await invalidateKangurMobileAuthQueries({
      invalidateQueries,
    });

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['kangur-mobile', 'leaderboard'],
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['kangur-mobile', 'scores'],
    });
  });
});
