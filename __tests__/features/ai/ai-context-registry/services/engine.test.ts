import { describe, expect, it } from 'vitest';

import type {
  ContextNode,
  ContextRegistryRef,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import { ContextRegistryEngine } from '@/features/ai/ai-context-registry/services/engine';
import { ContextRetrievalService } from '@/features/ai/ai-context-registry/services/retrieval';
import type { ContextRegistryBackend } from '@/features/ai/ai-context-registry/registry/backend';
import type { RuntimeContextProvider } from '@/features/ai/ai-context-registry/services/runtime-provider';

const buildNode = (id: string): ContextNode => ({
  id,
  kind: 'page',
  name: id,
  description: `${id} description`,
  tags: ['ai'],
  permissions: {
    readScopes: [],
    riskTier: 'low',
    classification: 'internal',
  },
  version: 'codefirst:1',
  updatedAtISO: '2026-03-02T10:00:00.000Z',
  source: {
    type: 'code',
    ref: 'test',
  },
  relationships: [],
});

const createBackend = (): ContextRegistryBackend => ({
  search: () => [buildNode('page:ai-paths')],
  getByIds: (ids: string[]) => ids.map((id) => buildNode(id)),
  listAll: () => [buildNode('page:ai-paths'), buildNode('action:run-ai-path')],
  getVersion: () => 'codefirst:9',
});

const createProvider = (): RuntimeContextProvider => ({
  id: 'ai-path-run',
  canInferRefs(input: Record<string, unknown> | null): boolean {
    return typeof input?.['runId'] === 'string';
  },
  inferRefs(input: Record<string, unknown>): ContextRegistryRef[] {
    return [
      {
        id: `runtime:ai-path-run:${String(input['runId'])}`,
        kind: 'runtime_document',
        providerId: 'ai-path-run',
        entityType: 'ai_path_run',
      },
    ];
  },
  canResolveRef(ref: ContextRegistryRef): boolean {
    return ref.id.startsWith('runtime:ai-path-run:');
  },
  async resolveRefs(refs: ContextRegistryRef[]): Promise<ContextRuntimeDocument[]> {
    return refs.map((ref) => ({
      id: ref.id,
      kind: 'runtime_document',
      entityType: 'ai_path_run',
      title: 'Primary Path',
      summary: 'failed run',
      status: 'failed',
      tags: ['ai-paths', 'runtime'],
      relatedNodeIds: ['page:ai-paths', 'action:run-ai-path'],
      timestamps: { createdAt: '2026-03-02T10:00:00.000Z' },
      facts: { runId: ref.id.replace('runtime:ai-path-run:', '') },
      sections: [],
      provenance: { providerId: 'ai-path-run' },
    }));
  },
  getVersion(): string {
    return '7';
  },
});

describe('ContextRegistryEngine', () => {
  it('infers AI-path runtime refs from runId', () => {
    const engine = new ContextRegistryEngine(
      createBackend(),
      new ContextRetrievalService(createBackend()),
      [createProvider()]
    );

    expect(engine.inferRefs({ runId: 'run-1' })).toEqual([
      {
        id: 'runtime:ai-path-run:run-1',
        kind: 'runtime_document',
        providerId: 'ai-path-run',
        entityType: 'ai_path_run',
      },
    ]);
  });

  it('resolves runtime refs into documents plus related static nodes and composes provider version', async () => {
    const engine = new ContextRegistryEngine(
      createBackend(),
      new ContextRetrievalService(createBackend()),
      [createProvider()]
    );

    const result = await engine.resolveRefs({
      refs: [
        {
          id: 'runtime:ai-path-run:run-1',
          kind: 'runtime_document',
          providerId: 'ai-path-run',
          entityType: 'ai_path_run',
        },
      ],
      maxNodes: 12,
      depth: 1,
    });

    expect(result.documents).toEqual([
      expect.objectContaining({
        id: 'runtime:ai-path-run:run-1',
        entityType: 'ai_path_run',
      }),
    ]);
    expect(result.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'page:ai-paths' }),
        expect.objectContaining({ id: 'action:run-ai-path' }),
      ])
    );
    expect(result.engineVersion).toBe('registry:codefirst:9|providers:ai-path-run@7');
  });
});
