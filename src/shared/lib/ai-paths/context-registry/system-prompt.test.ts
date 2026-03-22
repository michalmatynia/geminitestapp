import { describe, expect, it } from 'vitest';

import { buildAiPathsContextRegistrySystemPrompt } from '@/shared/lib/ai-paths/context-registry/system-prompt';

describe('buildAiPathsContextRegistrySystemPrompt', () => {
  it('returns an empty prompt when no registry bundle is available', () => {
    expect(buildAiPathsContextRegistrySystemPrompt(null)).toBe('');
    expect(
      buildAiPathsContextRegistrySystemPrompt({
        refs: [],
        nodes: [],
        documents: [],
        truncated: false,
        engineVersion: 'engine',
      })
    ).toBe('');
  });

  it('summarizes nodes and documents with truncation limits into a stable prompt', () => {
    const prompt = buildAiPathsContextRegistrySystemPrompt({
      refs: [],
      nodes: Array.from({ length: 11 }, (_value, index) => ({
        id: `node-${index}`,
        kind: 'path_node',
        name: `Node ${index}`,
        description: `Description ${index}`,
        tags: ['tag-a', 'tag-b', 'tag-c', 'tag-d', 'tag-e', 'tag-f', 'tag-g'],
        relationships: Array.from({ length: 9 }, (_rel, relIndex) => ({
          type: 'depends_on',
          targetId: `node-${index}-${relIndex}`,
        })),
      })),
      documents: Array.from({ length: 4 }, (_value, index) => ({
        id: `doc-${index}`,
        entityType: 'ai_path',
        title: `Document ${index}`,
        summary: `Summary ${index}`,
        status: 'draft',
        tags: ['doc-a', 'doc-b', 'doc-c', 'doc-d', 'doc-e', 'doc-f', 'doc-g'],
        relatedNodeIds: Array.from({ length: 11 }, (_rel, relIndex) => `node-${relIndex}`),
        facts: { owner: 'team-ai' },
        sections: Array.from({ length: 6 }, (_section, sectionIndex) => ({
          kind: 'summary',
          title: `Section ${sectionIndex}`,
          summary: `Section summary ${sectionIndex}`,
          text: `Section text ${sectionIndex}`,
          items: Array.from({ length: 9 }, (_item, itemIndex) => `Item ${itemIndex}`),
        })),
      })),
      truncated: false,
      engineVersion: 'engine',
    });

    expect(prompt).toContain('Context Registry bundle for the current AI Paths workspace.');
    expect(prompt).toContain(
      'Treat this registry bundle as live UI state, not as external retrieved knowledge.'
    );
    expect(prompt).toContain('"id": "node-0"');
    expect(prompt).toContain('"id": "node-9"');
    expect(prompt).not.toContain('"id": "node-10"');
    expect(prompt).toContain('"title": "Document 0"');
    expect(prompt).toContain('"title": "Document 2"');
    expect(prompt).not.toContain('"title": "Document 3"');
    expect(prompt).toContain('"targetId": "node-0-7"');
    expect(prompt).not.toContain('"targetId": "node-0-8"');
    expect(prompt).toContain('"Item 7"');
    expect(prompt).not.toContain('"Item 8"');
  });
});
