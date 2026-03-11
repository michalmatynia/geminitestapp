import { describe, expect, it } from 'vitest';

import { buildKangurKnowledgeGraph } from '@/features/kangur/server/knowledge-graph/build-kangur-knowledge-graph';

describe('buildKangurKnowledgeGraph', () => {
  it('builds a Kangur website-help graph from context roots and tutor content', () => {
    const snapshot = buildKangurKnowledgeGraph();

    expect(snapshot.graphKey).toBe('kangur-website-help-v1');
    expect(snapshot.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'app:kangur',
          kind: 'app',
        }),
        expect.objectContaining({
          id: 'flow:kangur:sign-in',
          kind: 'flow',
        }),
        expect.objectContaining({
          id: 'anchor:kangur:login',
          anchorId: 'kangur-primary-nav-login',
        }),
        expect.objectContaining({
          id: 'root:kangur:lessonContext',
          kind: 'context_root',
        }),
        expect.objectContaining({
          id: 'page:kangur-lessons',
          kind: 'page',
        }),
      ])
    );
    expect(snapshot.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'HAS_FLOW',
          from: 'app:kangur',
          to: 'flow:kangur:sign-in',
        }),
        expect.objectContaining({
          kind: 'USES_ANCHOR',
          from: 'flow:kangur:sign-in',
          to: 'anchor:kangur:login',
        }),
        expect.objectContaining({
          kind: 'HAS_REFERENCE',
          from: 'root:kangur:lessonContext',
          to: 'page:kangur-lessons',
        }),
      ])
    );
  });

  it('respects the requested locale on generated nodes', () => {
    const snapshot = buildKangurKnowledgeGraph({ locale: 'en' });
    const loginAnchor = snapshot.nodes.find((node) => node.id === 'anchor:kangur:login');

    expect(snapshot.locale).toBe('en');
    expect(loginAnchor?.locale).toBe('en');
  });
});
