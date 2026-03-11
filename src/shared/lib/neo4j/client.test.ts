import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getNeo4jConfig, isNeo4jEnabled } from '@/shared/lib/neo4j/config';
import { pingNeo4j, runNeo4jStatements } from '@/shared/lib/neo4j/client';

const ORIGINAL_ENV = { ...process.env };

describe('neo4j config and client', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('derives the transactional HTTP endpoint from a bolt URI', () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_URI'] = 'bolt://neo4j.local:7687';
    delete process.env['NEO4J_HTTP_URL'];
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    expect(getNeo4jConfig()).toMatchObject({
      enabled: true,
      httpUrl: 'http://neo4j.local:7474',
      database: 'neo4j',
    });
  });

  it('prefers an explicit HTTP URL override when provided', () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_URI'] = 'bolt://neo4j.local:7687';
    process.env['NEO4J_HTTP_URL'] = 'https://neo4j.example.com:8443';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    expect(getNeo4jConfig().httpUrl).toBe('https://neo4j.example.com:8443');
  });

  it('lets an explicit false flag disable Neo4j even when connection vars are present', () => {
    process.env['NEO4J_ENABLED'] = 'false';
    process.env['NEO4J_URI'] = 'bolt://neo4j.local:7687';
    process.env['NEO4J_HTTP_URL'] = 'http://neo4j.local:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    expect(isNeo4jEnabled()).toBe(false);
    expect(getNeo4jConfig()).toMatchObject({
      enabled: false,
      uri: 'bolt://neo4j.local:7687',
      httpUrl: 'http://neo4j.local:7474',
    });
  });

  it('maps rows returned by the transactional endpoint into record objects', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            columns: ['id', 'title'],
            data: [{ row: ['flow:kangur:sign-in', 'Sign in'] }],
            stats: { nodesCreated: 1 },
          },
        ],
        errors: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const [result] = await runNeo4jStatements([{ statement: 'RETURN 1 AS id' }]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:7474/db/neo4j/tx/commit',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      })
    );
    expect(result.records).toEqual([{ id: 'flow:kangur:sign-in', title: 'Sign in' }]);
    expect(result.stats).toEqual({ nodesCreated: 1 });
  });

  it('returns false from pingNeo4j when the query fails', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(pingNeo4j()).resolves.toBe(false);
  });

  it('retries transient fetch failures before succeeding', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              columns: ['ok'],
              data: [{ row: [1] }],
              stats: {},
            },
          ],
          errors: [],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const promise = runNeo4jStatements([{ statement: 'RETURN 1 AS ok' }]);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toEqual([
      expect.objectContaining({
        records: [{ ok: 1 }],
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
