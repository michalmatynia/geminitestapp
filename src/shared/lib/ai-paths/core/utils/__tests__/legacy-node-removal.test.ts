import { describe, expect, it } from 'vitest';

import {
  REMOVED_LEGACY_AI_PATH_NODE_TYPES,
  findRemovedLegacyAiPathNodes,
  findRemovedLegacyAiPathNodesInDocument,
  findRemovedLegacyAiPathNodesInPathConfig,
  formatRemovedLegacyAiPathNodesMessage,
} from '@/shared/lib/ai-paths/core/utils/legacy-node-removal';

describe('legacy node removal utilities', () => {
  it('keeps only description_updater in the removed legacy node type list', () => {
    expect(REMOVED_LEGACY_AI_PATH_NODE_TYPES).toEqual(['description_updater']);
  });

  it('detects only the currently removed legacy node types in flat node arrays', () => {
    const removedNodes = findRemovedLegacyAiPathNodes([
      {
        id: 'legacy-updater',
        type: 'description_updater',
        title: 'Description Updater',
      },
      {
        id: 'old-ai-description',
        type: 'ai_description',
        title: 'AI Description Generator',
      },
      {
        id: 'context-node',
        type: 'context',
        title: 'Context',
      },
    ]);

    expect(removedNodes).toEqual([
      {
        index: 0,
        nodeId: 'legacy-updater',
        nodeTitle: 'Description Updater',
        nodeType: 'description_updater',
      },
    ]);
  });

  it('finds removed legacy nodes in direct, semantic, and portable document envelopes', () => {
    expect(
      findRemovedLegacyAiPathNodesInDocument({
        nodes: [{ id: 'direct-updater', type: 'description_updater', title: 'Updater' }],
      })
    ).toHaveLength(1);

    expect(
      findRemovedLegacyAiPathNodesInDocument({
        document: {
          nodes: [{ id: 'semantic-updater', type: 'description_updater', title: 'Updater' }],
        },
      })
    ).toHaveLength(1);

    expect(
      findRemovedLegacyAiPathNodesInDocument({
        package: {
          document: {
            nodes: [{ id: 'portable-updater', type: 'description_updater', title: 'Updater' }],
          },
        },
      })
    ).toHaveLength(1);
  });

  it('finds removed legacy nodes in path configs and formats targeted guidance', () => {
    const removedNodes = findRemovedLegacyAiPathNodesInPathConfig({
      nodes: [{ id: 'legacy-updater', type: 'description_updater', title: 'Description Updater' }],
    });

    expect(removedNodes).toHaveLength(1);
    expect(formatRemovedLegacyAiPathNodesMessage(removedNodes)).toMatch(
      /Database node write operation/i
    );
    expect(formatRemovedLegacyAiPathNodesMessage(removedNodes)).toMatch(
      /`description_updater`/i
    );
  });
});
