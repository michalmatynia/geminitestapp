import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveBrainExecutionConfigForCapabilityMock = vi.fn();
const generateBrainEmbeddingMock = vi.fn();

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: resolveBrainExecutionConfigForCapabilityMock,
}));

vi.mock('@/shared/lib/ai-brain/server-embeddings-client', () => ({
  generateBrainEmbedding: generateBrainEmbeddingMock,
}));

describe('kangur knowledge graph semantic helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveBrainExecutionConfigForCapabilityMock.mockResolvedValue({
      modelId: 'text-embedding-3-small',
    });
    generateBrainEmbeddingMock.mockImplementation(async ({ text }: { text: string }) => [
      text.length,
      1,
    ]);
  });

  it('builds semantic text from Kangur graph node metadata', async () => {
    const { buildKangurKnowledgeNodeSemanticText } = await import(
      '@/features/kangur/server/knowledge-graph/semantic'
    );

    expect(
      buildKangurKnowledgeNodeSemanticText({
        title: 'Ranking wyników',
        summary: 'Porownanie wyników ucznia.',
        kind: 'guide',
        surface: 'game',
        focusKind: 'leaderboard',
        route: '/game',
        anchorId: 'kangur-game-result-leaderboard',
        refId: undefined,
        focusIdPrefixes: ['kangur-game-result-leaderboard'],
        contentIdPrefixes: ['game:practice:'],
        triggerPhrases: ['ranking', 'tablica wyników'],
        sourcePath: 'entry:game-leaderboard',
        tags: ['game', 'leaderboard'],
        semanticText: undefined,
      })
    ).toContain('Focus ids: kangur-game-result-leaderboard');
  });

  it('enriches graph snapshots with embedding metadata', async () => {
    const { enrichKangurKnowledgeGraphWithEmbeddings } = await import(
      '@/features/kangur/server/knowledge-graph/semantic'
    );

    const snapshot = await enrichKangurKnowledgeGraphWithEmbeddings({
      graphKey: 'kangur-website-help-v1',
      locale: 'pl',
      generatedAt: '2026-03-11T20:00:00.000Z',
      nodes: [
        {
          id: 'guide:native:game-leaderboard',
          kind: 'guide',
          title: 'Ranking wyników',
          summary: 'Porownanie wyników ucznia.',
          source: 'kangur_ai_tutor_native_guides',
          sourceCollection: 'kangur_ai_tutor_native_guides',
          sourceRecordId: 'game-leaderboard',
          sourcePath: 'entry:game-leaderboard',
          tags: ['game', 'leaderboard'],
        },
      ],
      edges: [],
    });

    expect(resolveBrainExecutionConfigForCapabilityMock).toHaveBeenCalledWith(
      'agent_teaching.embeddings',
      expect.objectContaining({ runtimeKind: 'embedding' })
    );
    expect(generateBrainEmbeddingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'text-embedding-3-small',
        text: expect.stringContaining('Ranking wyników'),
      })
    );
    expect(snapshot.nodes[0]).toEqual(
      expect.objectContaining({
        semanticText: expect.stringContaining('Ranking wyników'),
        embedding: expect.any(Array),
        embeddingModel: 'text-embedding-3-small',
        embeddingDimensions: 2,
      })
    );
  });
});
