import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runNeo4jStatementsMock = vi.fn();

vi.mock('@/shared/lib/neo4j/client', () => ({
  runNeo4jStatements: runNeo4jStatementsMock,
}));

const ORIGINAL_ENV = { ...process.env };

describe('resolveKangurWebsiteHelpGraphContext', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns graph instructions and sources for website-help queries when Neo4j is enabled', async () => {
    process.env['NEO4J_ENABLED'] = 'true';
    process.env['NEO4J_HTTP_URL'] = 'http://localhost:7474';
    process.env['NEO4J_USERNAME'] = 'neo4j';
    process.env['NEO4J_PASSWORD'] = 'secret';

    runNeo4jStatementsMock.mockResolvedValue([
      {
        records: [
          {
            id: 'flow:kangur:sign-in',
            kind: 'flow',
            title: 'Sign in flow',
            summary: 'How anonymous learners sign in from the Kangur website shell.',
            route: '/',
            anchorId: 'kangur-primary-nav-login',
            tags: ['auth', 'login'],
            tokenHits: 3,
            relations: [
              {
                kind: 'USES_ANCHOR',
                targetId: 'anchor:kangur:login',
                targetTitle: 'Zaloguj się',
                targetKind: 'anchor',
                targetAnchorId: 'kangur-primary-nav-login',
                targetRoute: '/',
              },
            ],
          },
        ],
      },
    ]);

    const { resolveKangurWebsiteHelpGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await resolveKangurWebsiteHelpGraphContext({
      latestUserMessage: 'Jak się zalogować do Kangura?',
      context: undefined,
    });

    expect(runNeo4jStatementsMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      status: 'hit',
      nodeIds: ['flow:kangur:sign-in'],
    });
    if (result.status !== 'hit') {
      throw new Error('Expected graph context hit.');
    }
    expect(result.instructions).toContain('Kangur website-help graph context:');
    expect(result.instructions).toContain('kangur-primary-nav-login');
    expect(result.sources[0]).toEqual(
      expect.objectContaining({
        documentId: 'flow:kangur:sign-in',
        collectionId: 'kangur-knowledge-graph',
      })
    );
  });

  it('skips graph retrieval when Neo4j is disabled', async () => {
    delete process.env['NEO4J_ENABLED'];
    delete process.env['NEO4J_URI'];
    delete process.env['NEO4J_HTTP_URL'];

    const { resolveKangurWebsiteHelpGraphContext } = await import(
      '@/features/kangur/server/knowledge-graph/retrieval'
    );

    const result = await resolveKangurWebsiteHelpGraphContext({
      latestUserMessage: 'Jak się zalogować do Kangura?',
      context: undefined,
    });

    expect(result).toEqual({
      status: 'disabled',
      instructions: null,
      sources: [],
      nodeIds: [],
    });
    expect(runNeo4jStatementsMock).not.toHaveBeenCalled();
  });
});
