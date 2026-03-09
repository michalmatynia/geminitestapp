import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { REMOVED_LEGACY_AI_PATH_NODE_TYPES } from '@/shared/lib/ai-paths/core/utils/legacy-node-removal';

type TooltipCatalogEntry = {
  id?: unknown;
  aliases?: unknown;
  uiTargets?: unknown;
};

const workspaceRoot = process.cwd();

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((entry: unknown): string => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean)
    : [];

describe('AI Paths tooltip catalog', () => {
  it('does not include removed legacy node identifiers or UI targets', () => {
    const catalog = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, 'docs/ai-paths/tooltip-catalog.json'), 'utf8')
    ) as TooltipCatalogEntry[];

    for (const removedNodeType of REMOVED_LEGACY_AI_PATH_NODE_TYPES) {
      const matchingEntries = catalog.filter((entry) => {
        const id = typeof entry.id === 'string' ? entry.id.trim() : '';
        const aliases = normalizeStringArray(entry.aliases);
        const uiTargets = normalizeStringArray(entry.uiTargets);
        return (
          id.includes(removedNodeType) ||
          aliases.some((alias) => alias.includes(removedNodeType)) ||
          uiTargets.some((target) => target.includes(removedNodeType))
        );
      });

      expect(matchingEntries).toEqual([]);
    }
  });
});
