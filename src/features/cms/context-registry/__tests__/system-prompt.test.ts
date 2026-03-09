import { describe, expect, it } from 'vitest';

import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';

import { buildCmsContextRegistrySystemPrompt } from '../system-prompt';

describe('buildCmsContextRegistrySystemPrompt', () => {
  it('returns a structured prompt when registry data is present', () => {
    const bundle: ContextRegistryResolutionBundle = {
      refs: [{ id: 'page:cms-page-builder', kind: 'static_node' }],
      nodes: [
        {
          id: 'page:cms-page-builder',
          kind: 'page',
          name: 'CMS Page Builder',
          description: 'Builder page',
          tags: ['cms', 'builder'],
          relationships: [{ type: 'uses', targetId: 'action:cms-css-ai-stream' }],
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
          id: 'runtime:cms-page-builder:page-1',
          kind: 'runtime_document',
          entityType: 'cms_page_builder_state',
          title: 'CMS builder state for Landing',
          summary: 'Live state.',
          status: 'draft',
          tags: ['cms', 'editor'],
          relatedNodeIds: ['page:cms-page-builder'],
          facts: { pageId: 'page-1', previewMode: 'desktop' },
          sections: [
            {
              kind: 'facts',
              title: 'Page snapshot',
              items: [{ pageId: 'page-1', selectedNodeId: 'section-hero' }],
            },
          ],
          provenance: { source: 'test' },
        },
      ],
      truncated: false,
      engineVersion: 'registry:test',
    };

    const prompt = buildCmsContextRegistrySystemPrompt(bundle);

    expect(prompt).toContain('Context Registry bundle for the current CMS page-builder surface.');
    expect(prompt).toContain('"id": "page:cms-page-builder"');
    expect(prompt).toContain('"title": "CMS builder state for Landing"');
    expect(prompt).toContain('"previewMode": "desktop"');
  });

  it('returns an empty string when the bundle is empty', () => {
    expect(
      buildCmsContextRegistrySystemPrompt({
        refs: [],
        nodes: [],
        documents: [],
        truncated: false,
        engineVersion: 'registry:test',
      })
    ).toBe('');
  });
});
