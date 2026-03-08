import { describe, expect, it, vi } from 'vitest';

import { buildKangurScoreListPath, createKangurApiClient } from './index';

describe('buildKangurScoreListPath', () => {
  it('serializes learner-scoped score filters', () => {
    expect(
      buildKangurScoreListPath({
        sort: '-created_date',
        limit: 25,
        learner_id: 'learner-1',
      }),
    ).toBe('/api/kangur/scores?sort=-created_date&limit=25&learner_id=learner-1');
  });
});

describe('createKangurApiClient', () => {
  it('captures response headers before surfacing request errors', async () => {
    const onResponse = vi.fn();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid CSRF token.' }), {
        status: 403,
        statusText: 'Forbidden',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'csrf-token-1',
        },
      }),
    );

    const client = createKangurApiClient({
      fetchImpl,
      onResponse,
    });

    await expect(
      client.signInLearner({
        loginName: 'ada',
        password: 'secret',
      }),
    ).rejects.toMatchObject({
      message: 'Invalid CSRF token.',
      status: 403,
    });

    expect(onResponse).toHaveBeenCalledTimes(1);
    expect(onResponse.mock.calls[0]?.[0].headers.get('x-csrf-token')).toBe(
      'csrf-token-1',
    );
  });
});
