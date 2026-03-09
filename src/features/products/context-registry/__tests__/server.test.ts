import { beforeEach, describe, expect, it, vi } from 'vitest';

const { contextRegistryResolveRefsMock } = vi.hoisted(() => ({
  contextRegistryResolveRefsMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  contextRegistryEngine: {
    resolveRefs: contextRegistryResolveRefsMock,
  },
}));

import { resolveProductEditorContextRegistryEnvelope } from '../server';

describe('resolveProductEditorContextRegistryEnvelope', () => {
  beforeEach(() => {
    contextRegistryResolveRefsMock.mockReset().mockResolvedValue({
      refs: [{ kind: 'static_node', id: 'page:product-editor' }],
      nodes: [
        {
          id: 'page:product-editor',
          kind: 'page',
          name: 'Product Editor',
          description: 'Product editing workspace.',
          tags: ['products'],
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
    await expect(resolveProductEditorContextRegistryEnvelope(null)).resolves.toBeNull();
    expect(contextRegistryResolveRefsMock).not.toHaveBeenCalled();
  });

  it('resolves static refs and merges any client-provided bundle', async () => {
    const result = await resolveProductEditorContextRegistryEnvelope({
      refs: [{ kind: 'static_node', id: 'page:product-editor' }],
      resolved: {
        refs: [{ kind: 'runtime_document', id: 'runtime:product-editor:workspace:product-1' }],
        nodes: [],
        documents: [
          {
            id: 'runtime:product-editor:workspace:product-1',
            kind: 'runtime_document',
            entityType: 'product_editor_workspace_state',
            title: 'Product Editor workspace',
            summary: 'Current workspace state.',
            tags: ['products'],
            relatedNodeIds: ['page:product-editor'],
            sections: [],
          },
        ],
      },
    });

    expect(contextRegistryResolveRefsMock).toHaveBeenCalledWith({
      refs: [{ kind: 'static_node', id: 'page:product-editor' }],
      maxNodes: 24,
      depth: 1,
    });
    expect(result).toEqual(
      expect.objectContaining({
        refs: expect.arrayContaining([
          expect.objectContaining({ kind: 'static_node', id: 'page:product-editor' }),
          expect.objectContaining({
            kind: 'runtime_document',
            id: 'runtime:product-editor:workspace:product-1',
          }),
        ]),
        resolved: expect.objectContaining({
          refs: expect.arrayContaining([
            expect.objectContaining({ kind: 'static_node', id: 'page:product-editor' }),
            expect.objectContaining({
              kind: 'runtime_document',
              id: 'runtime:product-editor:workspace:product-1',
            }),
          ]),
          nodes: [
            expect.objectContaining({
              id: 'page:product-editor',
            }),
          ],
          documents: [
            expect.objectContaining({
              id: 'runtime:product-editor:workspace:product-1',
            }),
          ],
        }),
      })
    );
  });
});
