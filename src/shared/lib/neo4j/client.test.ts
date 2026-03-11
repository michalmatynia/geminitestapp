import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getNeo4jConfig } from '@/shared/lib/neo4j/config';
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
});
