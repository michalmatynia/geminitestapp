import { describe, expect, it } from 'vitest';

import {
  buildKangurAiTutorBridgeSnapshotLines,
  buildKangurKnowledgeGraphStatusLines,
} from './lib/weekly-report-markdown.mjs';

describe('weekly report markdown helpers', () => {
  it('renders Neo4j bridge metrics in the Kangur section', () => {
    expect(
      buildKangurAiTutorBridgeSnapshotLines({
        range: '7d',
        overallStatus: 'warning',
        messageSucceededCount: 9,
        knowledgeGraphAppliedCount: 6,
        knowledgeGraphSemanticCount: 4,
        knowledgeGraphWebsiteHelpCount: 2,
        knowledgeGraphMetadataOnlyRecallCount: 1,
        knowledgeGraphHybridRecallCount: 2,
        knowledgeGraphVectorOnlyRecallCount: 1,
        knowledgeGraphVectorRecallAttemptedCount: 3,
        bridgeSuggestionCount: 4,
        lessonToGameBridgeSuggestionCount: 2,
        gameToLessonBridgeSuggestionCount: 2,
        bridgeQuickActionClickCount: 2,
        bridgeFollowUpClickCount: 2,
        bridgeFollowUpCompletionCount: 2,
        bridgeCompletionRatePercent: 33.3,
        alertStatus: 'warning',
      })
    ).toEqual([
      '- Range: 7d',
      '- Overall status: warning',
      '- Tutor replies: 9',
      '- Neo4j-backed replies: 6',
      '- Graph coverage rate: 66.7%',
      '- Graph mode split: semantic=4 | website-help=2',
      '- Recall mix: metadata=1 | hybrid=2 | vector-only=1',
      '- Vector assist rate: 75% | attempts=3',
      '- Bridge suggestions: 4',
      '- Direction split: lesson->game=2 | game->lesson=2',
      '- Bridge CTA clicks: 2',
      '- Bridge follow-up opens: 2',
      '- Bridge completions: 2',
      '- Bridge completion rate: 33.3% | alert=warning',
    ]);
  });

  it('renders an unavailable message when the bridge snapshot is missing', () => {
    expect(buildKangurAiTutorBridgeSnapshotLines(null)).toEqual([
      '- Kangur AI Tutor bridge snapshot unavailable; inspect JSON payload for error details.',
    ]);
  });

  it('renders semantic graph status details', () => {
    expect(
      buildKangurKnowledgeGraphStatusLines({
        mode: 'status',
        graphKey: 'kangur-website-help-v1',
        present: true,
        locale: 'pl',
        syncedAt: '2026-03-11T20:00:00.000Z',
        syncedNodeCount: 87,
        syncedEdgeCount: 108,
        liveNodeCount: 87,
        liveEdgeCount: 108,
        canonicalNodeCount: 80,
        validCanonicalNodeCount: 80,
        invalidCanonicalNodeCount: 0,
        semanticNodeCount: 87,
        embeddingNodeCount: 87,
        embeddingDimensions: 1536,
        embeddingModels: ['text-embedding-3-small'],
        vectorIndexPresent: true,
        vectorIndexState: 'ONLINE',
        vectorIndexType: 'VECTOR',
        vectorIndexDimensions: 1536,
        semanticCoverageRatePercent: 100,
        embeddingCoverageRatePercent: 100,
        semanticReadiness: 'vector_ready',
      })
    ).toEqual([
      '- Semantic readiness: vector_ready',
      '- Graph present: yes | locale=pl | graphKey=kangur-website-help-v1',
      '- Synced at: 2026-03-11T20:00:00.000Z',
      '- Live graph: nodes=87 | edges=108',
      '- Synced graph: nodes=87 | edges=108',
      '- Canonical integrity: valid=80 | invalid=0',
      '- Semantic coverage: 100% | semantic nodes=87',
      '- Embedding coverage: 100% | embedding nodes=87',
      '- Embedding details: dimensions=1536 | models=text-embedding-3-small',
      '- Vector index: VECTOR / ONLINE / dims=1536',
    ]);
  });

  it('renders disabled knowledge graph status cleanly', () => {
    expect(
      buildKangurKnowledgeGraphStatusLines({
        mode: 'disabled',
        graphKey: 'kangur-website-help-v1',
        message: 'Neo4j is not enabled.',
      })
    ).toEqual([
      '- Mode: disabled',
      '- Message: Neo4j is not enabled.',
    ]);
  });
});
