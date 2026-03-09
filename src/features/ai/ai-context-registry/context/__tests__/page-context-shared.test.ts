import { describe, expect, it } from 'vitest';

import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';
import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryRefs,
  mergeContextRegistryResolutionBundles,
} from '../page-context-shared';

describe('page-context-shared', () => {
  it('dedupes refs while preserving richer runtime metadata', () => {
    const refs = mergeContextRegistryRefs(
      [{ id: 'page:products', kind: 'static_node' }],
      [
        {
          id: 'runtime:ai-path-run:run-1',
          kind: 'runtime_document',
        },
      ],
      [
        {
          id: 'runtime:ai-path-run:run-1',
          kind: 'runtime_document',
          providerId: 'ai-path-run',
          entityType: 'ai_path_run',
        },
      ]
    );

    expect(refs).toEqual([
      { id: 'page:products', kind: 'static_node' },
      {
        id: 'runtime:ai-path-run:run-1',
        kind: 'runtime_document',
        providerId: 'ai-path-run',
        entityType: 'ai_path_run',
      },
    ]);
  });

  it('merges bundles and builds a consumer envelope from roots and runtime refs', () => {
    const bundle: ContextRegistryResolutionBundle = {
      refs: [
        { id: 'runtime:kangur:learner:abc', kind: 'runtime_document', providerId: 'kangur' },
      ],
      nodes: [
        {
          id: 'page:kangur-game',
          kind: 'page',
          name: 'Kangur Game',
          description: 'Game surface.',
          tags: ['kangur'],
          permissions: {
            readScopes: ['ctx:read'],
            riskTier: 'none',
            classification: 'internal',
          },
          version: '1.0.0',
          updatedAtISO: '2026-03-09T00:00:00.000Z',
          source: { type: 'code', ref: 'test' },
        },
      ],
      documents: [
        {
          id: 'runtime:kangur:learner:abc',
          kind: 'runtime_document',
          entityType: 'kangur_learner_snapshot',
          title: 'Learner Snapshot',
          summary: 'Current learner state.',
          tags: ['kangur'],
          relatedNodeIds: ['page:kangur-game'],
        },
      ],
      truncated: false,
      engineVersion: 'registry:test|providers:kangur@1',
    };

    const mergedBundle = mergeContextRegistryResolutionBundles(bundle);
    const envelope = buildContextRegistryConsumerEnvelope({
      rootNodeIds: ['page:kangur-game'],
      refs: [{ id: 'runtime:kangur:learner:abc', kind: 'runtime_document' }],
      resolved: mergedBundle,
    });

    expect(envelope).toEqual({
      refs: [
        { id: 'page:kangur-game', kind: 'static_node' },
        {
          id: 'runtime:kangur:learner:abc',
          kind: 'runtime_document',
          providerId: 'kangur',
        },
      ],
      engineVersion: 'registry:test|providers:kangur@1',
      resolved: {
        ...bundle,
        refs: [
          { id: 'page:kangur-game', kind: 'static_node' },
          {
            id: 'runtime:kangur:learner:abc',
            kind: 'runtime_document',
            providerId: 'kangur',
          },
        ],
      },
    });
  });
});
