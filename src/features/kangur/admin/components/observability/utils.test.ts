import { describe, expect, it } from 'vitest';

import {
  resolveKnowledgeGraphBadgeStatus,
  resolveKnowledgeGraphPreviewCoveragePresetId,
} from './utils';
import type { KangurKnowledgeGraphStatusSnapshot } from '@/shared/contracts';

const makeStatus = (
  overrides: Partial<Extract<KangurKnowledgeGraphStatusSnapshot, { mode: 'status' }>> = {}
): Extract<KangurKnowledgeGraphStatusSnapshot, { mode: 'status' }> => ({
  mode: 'status',
  graphKey: 'kangur-graph',
  present: true,
  locale: 'pl',
  syncedAt: '2026-04-03T10:00:00.000Z',
  syncedNodeCount: 10,
  syncedEdgeCount: 20,
  liveNodeCount: 10,
  liveEdgeCount: 20,
  canonicalNodeCount: 10,
  validCanonicalNodeCount: 10,
  invalidCanonicalNodeCount: 0,
  semanticNodeCount: 10,
  embeddingNodeCount: 10,
  embeddingDimensions: 1536,
  embeddingModels: ['text-embedding-3-small'],
  vectorIndexPresent: true,
  vectorIndexState: 'ONLINE',
  vectorIndexType: 'vector-2.0',
  vectorIndexDimensions: 1536,
  semanticCoverageRatePercent: 100,
  embeddingCoverageRatePercent: 100,
  semanticReadiness: 'vector_ready',
  ...overrides,
});

describe('knowledge graph observability utils', () => {
  it('maps graph status snapshots to badge statuses', () => {
    expect(resolveKnowledgeGraphBadgeStatus(makeStatus())).toBe('ok');
    expect(
      resolveKnowledgeGraphBadgeStatus(makeStatus({ semanticReadiness: 'metadata_only' }))
    ).toBe('warning');
    expect(
      resolveKnowledgeGraphBadgeStatus(makeStatus({ semanticReadiness: 'no_graph' }))
    ).toBe('critical');
    expect(
      resolveKnowledgeGraphBadgeStatus({
        mode: 'disabled',
        graphKey: 'kangur-graph',
        message: 'disabled',
      })
    ).toBe('insufficient_data');
  });

  it('resolves preview coverage preset ids from surface, focus kind, and anchor prefix', () => {
    expect(
      resolveKnowledgeGraphPreviewCoveragePresetId({
        surface: 'lesson',
        focusKind: 'document',
        focusId: 'kangur-lesson-document-page-1',
      })
    ).toBe('lessons-active-document');

    expect(
      resolveKnowledgeGraphPreviewCoveragePresetId({
        surface: 'lesson',
        focusKind: 'document',
        focusId: 'unknown-anchor',
      })
    ).toBe('');

    expect(
      resolveKnowledgeGraphPreviewCoveragePresetId({
        surface: '',
        focusKind: 'document',
        focusId: 'kangur-lesson-document-page-1',
      })
    ).toBe('');
  });
});
