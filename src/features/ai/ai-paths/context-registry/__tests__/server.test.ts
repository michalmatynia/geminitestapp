import { beforeEach, describe, expect, it, vi } from 'vitest';

const { contextRegistryResolveRefsMock } = vi.hoisted(() => ({
  contextRegistryResolveRefsMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  contextRegistryEngine: {
    resolveRefs: contextRegistryResolveRefsMock,
  },
}));

import { resolveAiPathsContextRegistryEnvelope } from '../server';

describe('resolveAiPathsContextRegistryEnvelope', () => {
  beforeEach(() => {
    contextRegistryResolveRefsMock.mockReset().mockResolvedValue({
      refs: [{ kind: 'static_node', id: 'page:ai-paths' }],
      nodes: [
        {
          id: 'page:ai-paths',
          kind: 'page',
          name: 'AI Paths Canvas',
          description: 'AI Paths workspace.',
          tags: ['ai-paths'],
          relationships: [],
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
      documents: [],
    });
  });

  it('returns null when no envelope is provided', async () => {
    await expect(resolveAiPathsContextRegistryEnvelope(null)).resolves.toBeNull();
    expect(contextRegistryResolveRefsMock).not.toHaveBeenCalled();
  });

  it('resolves static refs and merges any client-provided bundle', async () => {
    const result = await resolveAiPathsContextRegistryEnvelope({
      refs: [{ kind: 'static_node', id: 'page:ai-paths' }],
      resolved: {
        refs: [{ kind: 'runtime_document', id: 'runtime:ai-paths:workspace' }],
        nodes: [],
        documents: [
          {
            id: 'runtime:ai-paths:workspace',
            kind: 'runtime_document',
            entityType: 'ai_paths_workspace_state',
            title: 'AI Paths workspace',
            summary: 'Current workspace state.',
            tags: ['ai-paths'],
            relatedNodeIds: ['page:ai-paths'],
            sections: [],
          },
        ],
      },
    });

    expect(contextRegistryResolveRefsMock).toHaveBeenCalledWith({
      refs: [{ kind: 'static_node', id: 'page:ai-paths' }],
      maxNodes: 24,
      depth: 1,
    });
    expect(result).toEqual(
      expect.objectContaining({
        refs: expect.arrayContaining([
          expect.objectContaining({ kind: 'static_node', id: 'page:ai-paths' }),
          expect.objectContaining({
            kind: 'runtime_document',
            id: 'runtime:ai-paths:workspace',
          }),
        ]),
        resolved: expect.objectContaining({
          refs: expect.arrayContaining([
            expect.objectContaining({ kind: 'static_node', id: 'page:ai-paths' }),
            expect.objectContaining({
              kind: 'runtime_document',
              id: 'runtime:ai-paths:workspace',
            }),
          ]),
          nodes: [
            expect.objectContaining({
              id: 'page:ai-paths',
            }),
          ],
          documents: [
            expect.objectContaining({
              id: 'runtime:ai-paths:workspace',
            }),
          ],
        }),
      })
    );
  });
});
