import type { AiBrainCatalogEntry } from '@/shared/lib/ai-brain/settings';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const BRAIN_CATALOG_NODE_PREFIX = 'brain-catalog-entry:';
const BRAIN_CATALOG_NODE_KIND = 'brain-catalog-entry';
const BRAIN_CATALOG_SORT_GAP = 1000;

const encodeNodeSegment = (value: string): string => encodeURIComponent(value);
const decodeNodeSegment = (value: string): string => decodeURIComponent(value);

export const toBrainCatalogNodeId = (entry: Pick<AiBrainCatalogEntry, 'pool' | 'value'>): string =>
  `${BRAIN_CATALOG_NODE_PREFIX}${encodeNodeSegment(entry.pool)}::${encodeNodeSegment(entry.value)}`;

export const fromBrainCatalogNodeId = (
  nodeId: string
): Pick<AiBrainCatalogEntry, 'pool' | 'value'> | null => {
  if (!nodeId.startsWith(BRAIN_CATALOG_NODE_PREFIX)) return null;
  const payload = nodeId.slice(BRAIN_CATALOG_NODE_PREFIX.length);
  const separatorIndex = payload.indexOf('::');
  if (separatorIndex <= 0) return null;

  const rawPool = payload.slice(0, separatorIndex).trim();
  const rawValue = payload.slice(separatorIndex + 2).trim();
  if (!rawPool || !rawValue) return null;

  const pool = decodeNodeSegment(rawPool);
  const value = decodeNodeSegment(rawValue);
  if (!pool || !value) return null;

  return {
    pool: pool as AiBrainCatalogEntry['pool'],
    value,
  };
};

export function buildBrainCatalogMasterNodes(entries: AiBrainCatalogEntry[]): MasterTreeNode[] {
  return entries.map((entry, index) => ({
    id: toBrainCatalogNodeId(entry),
    type: 'file' as const,
    kind: BRAIN_CATALOG_NODE_KIND,
    parentId: null,
    name: entry.value,
    path: `${entry.pool}/${entry.value}`,
    sortOrder: (index + 1) * BRAIN_CATALOG_SORT_GAP,
    metadata: {
      catalogEntry: {
        pool: entry.pool,
        value: entry.value,
      },
    },
  }));
}

export const createBrainCatalogNodeEntryMap = (
  entries: AiBrainCatalogEntry[]
): Map<string, AiBrainCatalogEntry> =>
  new Map(entries.map((entry) => [toBrainCatalogNodeId(entry), entry]));

export const resolveBrainCatalogOrderFromNodes = (
  nodes: MasterTreeNode[],
  entryByNodeId: Map<string, AiBrainCatalogEntry>
): AiBrainCatalogEntry[] =>
  [...nodes]
    .filter((node) => node.type === 'file' && node.kind === BRAIN_CATALOG_NODE_KIND)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((node) => {
      const entry = entryByNodeId.get(node.id);
      return entry ? [entry] : [];
    });
