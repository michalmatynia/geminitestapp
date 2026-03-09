import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { REMOVED_LEGACY_AI_PATH_NODE_TYPES } from '@/shared/lib/ai-paths/core/utils/legacy-node-removal';

type SemanticNodeIndexRow = {
  nodeType?: unknown;
};

type NodeCodeObjectIndex = {
  objects?: Array<{
    nodeType?: unknown;
  }>;
};

type NodeMigrationIndex = {
  nodes?: Array<{
    nodeType?: unknown;
  }>;
};

const workspaceRoot = process.cwd();

const readJsonFile = <T>(relativePath: string): T =>
  JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8')) as T;

const normalizeNodeType = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

describe('generated AI Paths docs exclude removed legacy nodes', () => {
  it('keeps removed legacy node types out of semantic, v2, and v3 generated indexes', () => {
    const semanticIndex = readJsonFile<SemanticNodeIndexRow[]>(
      'docs/ai-paths/semantic-grammar/nodes/index.json'
    );
    const v2Index = readJsonFile<NodeCodeObjectIndex>('docs/ai-paths/node-code-objects-v2/index.json');
    const migrationIndex = readJsonFile<NodeMigrationIndex>(
      'docs/ai-paths/node-code-objects-v3/migration-index.json'
    );

    const semanticNodeTypes = new Set(
      semanticIndex.map((row) => normalizeNodeType(row.nodeType)).filter(Boolean)
    );
    const v2NodeTypes = new Set(
      (v2Index.objects ?? []).map((row) => normalizeNodeType(row.nodeType)).filter(Boolean)
    );
    const v3MigrationNodeTypes = new Set(
      (migrationIndex.nodes ?? []).map((row) => normalizeNodeType(row.nodeType)).filter(Boolean)
    );

    for (const removedNodeType of REMOVED_LEGACY_AI_PATH_NODE_TYPES) {
      expect(semanticNodeTypes.has(removedNodeType)).toBe(false);
      expect(v2NodeTypes.has(removedNodeType)).toBe(false);
      expect(v3MigrationNodeTypes.has(removedNodeType)).toBe(false);
    }
  });
});
