import { describe, expect, it } from 'vitest';

import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';
import { REMOVED_LEGACY_AI_PATH_NODE_TYPES } from '@/shared/lib/ai-paths/core/utils/legacy-node-removal';

describe('AI_PATHS_NODE_DOCS', () => {
  it('does not expose removed legacy node types as supported node docs', () => {
    const documentedNodeTypes = new Set<string>(AI_PATHS_NODE_DOCS.map((doc) => doc.type));

    for (const removedNodeType of REMOVED_LEGACY_AI_PATH_NODE_TYPES) {
      expect(documentedNodeTypes.has(removedNodeType)).toBe(false);
    }
  });

  it('contains each supported node type only once', () => {
    const documentedNodeTypes = AI_PATHS_NODE_DOCS.map((doc) => doc.type);
    expect(new Set(documentedNodeTypes).size).toBe(documentedNodeTypes.length);
  });
});
