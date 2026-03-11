import { describe, expect, it } from 'vitest';

import {
  buildKangurKnowledgeGraphStatusOutput,
  resolveKangurKnowledgeGraphSemanticReadiness,
  resolveKangurKnowledgeGraphStatusScanStatus,
} from './lib/kangur-knowledge-graph-status-output';

describe('kangur knowledge graph status output', () => {
  const baseStatus = {
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
  } as const;

  it('builds a vector-ready status summary with coverage rates', () => {
    expect(buildKangurKnowledgeGraphStatusOutput(baseStatus)).toEqual({
      mode: 'status',
      ...baseStatus,
      semanticCoverageRatePercent: 100,
      embeddingCoverageRatePercent: 100,
      semanticReadiness: 'vector_ready',
    });
  });

  it('maps semantic readiness into a report-friendly scan status', () => {
    expect(
      resolveKangurKnowledgeGraphStatusScanStatus(
        buildKangurKnowledgeGraphStatusOutput(baseStatus)
      )
    ).toBe('ok');

    expect(
      resolveKangurKnowledgeGraphStatusScanStatus(
        buildKangurKnowledgeGraphStatusOutput({
          ...baseStatus,
          vectorIndexPresent: false,
          vectorIndexState: null,
        })
      )
    ).toBe('warning');
  });

  it('classifies metadata-only graphs when semantic text exists without embeddings', () => {
    expect(
      resolveKangurKnowledgeGraphSemanticReadiness({
        ...baseStatus,
        embeddingNodeCount: 0,
        vectorIndexPresent: false,
        vectorIndexState: null,
        vectorIndexType: null,
        vectorIndexDimensions: null,
      })
    ).toBe('metadata_only');
  });

  it('classifies graphs with embeddings but no online vector index as partial', () => {
    expect(
      resolveKangurKnowledgeGraphSemanticReadiness({
        ...baseStatus,
        vectorIndexPresent: true,
        vectorIndexState: 'POPULATING',
      })
    ).toBe('vector_index_pending');

    expect(
      resolveKangurKnowledgeGraphSemanticReadiness({
        ...baseStatus,
        vectorIndexPresent: false,
        vectorIndexState: null,
      })
    ).toBe('embeddings_without_index');
  });
});
