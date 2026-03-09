import { describe, expect, it } from 'vitest';

import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';

import { buildProductEditorContextRegistrySystemPrompt } from '../system-prompt';

describe('buildProductEditorContextRegistrySystemPrompt', () => {
  it('returns a structured prompt when registry context is present', () => {
    const bundle: ContextRegistryResolutionBundle = {
      refs: [{ id: 'page:product-editor', kind: 'static_node' }],
      nodes: [
        {
          id: 'page:product-editor',
          kind: 'page',
          name: 'Product Editor',
          description: 'Product editor workspace',
          tags: ['products', 'editor'],
          relationships: [{ type: 'uses', targetId: 'action:product-validator-runtime-evaluate' }],
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
          id: 'runtime:product-editor:workspace:product-1',
          kind: 'runtime_document',
          entityType: 'product_editor_workspace_state',
          title: 'Product Editor workspace for Vintage Lamp',
          summary: 'Live state',
          status: null,
          tags: ['products', 'validation'],
          relatedNodeIds: ['page:product-editor'],
          facts: { activeTab: 'validation', visibleIssueCount: 3 },
          sections: [
            {
              kind: 'facts',
              title: 'Validation state',
              items: [{ validatorEnabled: true }],
            },
          ],
          provenance: { source: 'test' },
        },
      ],
      truncated: false,
      engineVersion: 'registry:test',
    };

    const prompt = buildProductEditorContextRegistrySystemPrompt(bundle);

    expect(prompt).toContain('Context Registry bundle for the current Product Editor workspace.');
    expect(prompt).toContain('Treat this registry bundle as operator UI state');
    expect(prompt).toContain('"visibleIssueCount": 3');
    expect(prompt).toContain('"name": "Product Editor"');
  });

  it('returns an empty string when the bundle is empty', () => {
    expect(
      buildProductEditorContextRegistrySystemPrompt({
        refs: [],
        nodes: [],
        documents: [],
        truncated: false,
        engineVersion: 'registry:test',
      })
    ).toBe('');
  });
});
