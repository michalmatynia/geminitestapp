import type { ValidatorPatternList } from '@/shared/contracts/admin';
import type { ValidatorListNodeMetadata as SharedValidatorListNodeMetadata } from '@/shared/contracts/validator';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

// ─── Constants ────────────────────────────────────────────────────────────────

const LIST_PREFIX = 'vlist:';
const VALIDATOR_LIST_SORT_ORDER_GAP = 1000;

// ─── ID helpers ───────────────────────────────────────────────────────────────

export const toValidatorListNodeId = (listId: string): string => `${LIST_PREFIX}${listId}`;

export const fromValidatorListNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(LIST_PREFIX)) return null;
  const value = nodeId.slice(LIST_PREFIX.length).trim();
  return value || null;
};

// ─── Metadata type ────────────────────────────────────────────────────────────

type ValidatorListNodeMetadata = SharedValidatorListNodeMetadata;

export type { ValidatorListNodeMetadata };

// ─── Build: domain → MasterTreeNode[] ────────────────────────────────────────

/**
 * Converts an ordered ValidatorPatternList array into a flat MasterTreeNode list.
 * Each list becomes a `file` node (kind: 'validator-list') at root level.
 */
export function buildValidatorListMasterNodes(lists: ValidatorPatternList[]): MasterTreeNode[] {
  return lists.map((list, index) => ({
    id: toValidatorListNodeId(list.id),
    type: 'file' as const,
    kind: 'validator-list',
    parentId: null,
    name: list.name.trim() || 'Unnamed List',
    path: list.id,
    sortOrder: (index + 1) * VALIDATOR_LIST_SORT_ORDER_GAP,
    metadata: {
      validatorList: {
        listId: list.id,
        scope: list.scope,
        deletionLocked: list.deletionLocked,
        description: list.description,
        updatedAt: list.updatedAt ?? null,
      } satisfies ValidatorListNodeMetadata,
    },
  }));
}

// ─── Reverse: MasterTreeNode[] → ValidatorPatternList[] ──────────────────────

/**
 * Reconstructs an ordered ValidatorPatternList[] from sorted tree nodes.
 * Used after a drag-drop reorder to update local state.
 */
export function resolveValidatorListOrderFromNodes(
  nextNodes: MasterTreeNode[],
  listById: Map<string, ValidatorPatternList>
): ValidatorPatternList[] {
  return [...nextNodes]
    .filter((node) => node.type === 'file' && node.kind === 'validator-list')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((node) => {
      const listId = fromValidatorListNodeId(node.id);
      if (!listId) return [];
      const list = listById.get(listId);
      return list ? [list] : [];
    });
}
