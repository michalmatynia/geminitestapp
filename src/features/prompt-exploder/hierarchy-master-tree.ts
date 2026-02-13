import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type {
  PromptExploderListItem,
  PromptExploderLogicalComparator,
  PromptExploderLogicalCondition,
  PromptExploderLogicalOperator,
} from './types';

const PROMPT_EXPLODER_MASTER_NODE_PREFIX = 'prompt_item:';

const LOGICAL_OPERATOR_VALUES = new Set<string>([
  'if',
  'only_if',
  'unless',
  'when',
]);

const LOGICAL_COMPARATOR_VALUES = new Set<string>([
  'truthy',
  'falsy',
  'equals',
  'not_equals',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
]);

const LOGICAL_JOIN_VALUES = new Set<string>(['and', 'or']);

type PromptExploderNodeMetadata = {
  itemId: string;
  logicalOperator: PromptExploderLogicalOperator | null;
  logicalConditions: PromptExploderLogicalCondition[];
  referencedParamPath: string | null;
  referencedComparator: PromptExploderLogicalComparator | null;
  referencedValue: unknown;
};

const cloneLogicalConditions = (
  conditions: PromptExploderLogicalCondition[] | null | undefined
): PromptExploderLogicalCondition[] => {
  if (!Array.isArray(conditions)) return [];
  return conditions.map((condition) => ({
    id: condition.id,
    paramPath: condition.paramPath,
    comparator: condition.comparator,
    value: condition.value,
    joinWithPrevious: condition.joinWithPrevious ?? null,
  }));
};

const createListItemId = (): string =>
  `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const slugifyPathSegment = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  return normalized || 'item';
};

const collectListItemsById = (
  items: PromptExploderListItem[]
): Map<string, PromptExploderListItem> => {
  const byId = new Map<string, PromptExploderListItem>();
  const walk = (nodes: PromptExploderListItem[]): void => {
    nodes.forEach((node) => {
      byId.set(node.id, node);
      if (node.children.length > 0) walk(node.children);
    });
  };
  walk(items);
  return byId;
};

const readNodeMetadata = (node: MasterTreeNode): PromptExploderNodeMetadata | null => {
  const rawMetadata =
    node.metadata && typeof node.metadata === 'object' && !Array.isArray(node.metadata)
      ? (node.metadata as { promptExploder?: unknown }).promptExploder
      : null;
  if (!rawMetadata || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) return null;
  const candidate = rawMetadata as Partial<PromptExploderNodeMetadata>;
  if (typeof candidate.itemId !== 'string' || !candidate.itemId.trim()) return null;
  const logicalOperator =
    typeof candidate.logicalOperator === 'string' &&
      LOGICAL_OPERATOR_VALUES.has(candidate.logicalOperator)
      ? candidate.logicalOperator
      : null;
  const logicalConditions = cloneLogicalConditions(candidate.logicalConditions ?? []);
  const referencedComparator =
    typeof candidate.referencedComparator === 'string' &&
      LOGICAL_COMPARATOR_VALUES.has(candidate.referencedComparator)
      ? candidate.referencedComparator
      : null;
  return {
    itemId: candidate.itemId.trim(),
    logicalOperator,
    logicalConditions,
    referencedParamPath:
      typeof candidate.referencedParamPath === 'string'
        ? candidate.referencedParamPath
        : null,
    referencedComparator,
    referencedValue: candidate.referencedValue ?? null,
  };
};

const coerceLogicalConditions = (
  conditions: PromptExploderLogicalCondition[] | null | undefined
): PromptExploderLogicalCondition[] => {
  if (!Array.isArray(conditions)) return [];
  return conditions
    .map((condition, index) => {
      if (!condition || typeof condition !== 'object') return null;
      const paramPath = typeof condition.paramPath === 'string' ? condition.paramPath.trim() : '';
      const comparator =
        typeof condition.comparator === 'string' &&
          LOGICAL_COMPARATOR_VALUES.has(condition.comparator)
          ? condition.comparator
          : null;
      if (!paramPath || !comparator) return null;
      const joinWithPrevious =
        typeof condition.joinWithPrevious === 'string' &&
          LOGICAL_JOIN_VALUES.has(condition.joinWithPrevious)
          ? condition.joinWithPrevious
          : index === 0
            ? null
            : 'and';
      return {
        id:
          typeof condition.id === 'string' && condition.id.trim()
            ? condition.id
            : `${Date.now().toString(36)}_${index + 1}`,
        paramPath,
        comparator,
        value: condition.value ?? null,
        joinWithPrevious,
      } satisfies PromptExploderLogicalCondition;
    })
    .filter((condition): condition is PromptExploderLogicalCondition => Boolean(condition));
};

export const toPromptExploderMasterNodeId = (itemId: string): string =>
  `${PROMPT_EXPLODER_MASTER_NODE_PREFIX}${itemId}`;

export const fromPromptExploderMasterNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(PROMPT_EXPLODER_MASTER_NODE_PREFIX)) return null;
  const itemId = nodeId.slice(PROMPT_EXPLODER_MASTER_NODE_PREFIX.length).trim();
  return itemId || null;
};

export const buildPromptExploderMasterNodes = (
  items: PromptExploderListItem[]
): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];

  const walk = (
    list: PromptExploderListItem[],
    parentId: string | null,
    parentPath: string
  ): void => {
    list.forEach((item, index) => {
      const nodeId = toPromptExploderMasterNodeId(item.id);
      const segment = slugifyPathSegment(item.text || item.id);
      const path = parentPath ? `${parentPath}/${segment}` : segment;
      nodes.push({
        id: nodeId,
        type: 'folder',
        kind: 'folder',
        parentId,
        name: item.text || `Item ${index + 1}`,
        path,
        sortOrder: index,
        metadata: {
          promptExploder: {
            itemId: item.id,
            logicalOperator: item.logicalOperator ?? null,
            logicalConditions: cloneLogicalConditions(item.logicalConditions ?? []),
            referencedParamPath: item.referencedParamPath ?? null,
            referencedComparator: item.referencedComparator ?? null,
            referencedValue: item.referencedValue ?? null,
          } satisfies PromptExploderNodeMetadata,
        },
      });
      if (item.children.length > 0) {
        walk(item.children, nodeId, path);
      }
    });
  };

  walk(items, null, '');
  return nodes;
};

export const rebuildPromptExploderListFromMasterNodes = (args: {
  nodes: MasterTreeNode[];
  previousItems: PromptExploderListItem[];
}): PromptExploderListItem[] => {
  const fallbackById = collectListItemsById(args.previousItems);
  const childrenByParent = new Map<string | null, MasterTreeNode[]>();

  args.nodes.forEach((node) => {
    const parentId = node.parentId ?? null;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(node);
    childrenByParent.set(parentId, list);
  });

  childrenByParent.forEach((list) => {
    list.sort((left, right) => {
      const orderDelta = left.sortOrder - right.sortOrder;
      if (orderDelta !== 0) return orderDelta;
      return left.id.localeCompare(right.id);
    });
  });

  const build = (parentId: string | null): PromptExploderListItem[] => {
    const siblings = childrenByParent.get(parentId) ?? [];
    return siblings.map((node) => {
      const metadata = readNodeMetadata(node);
      const nodeItemId = fromPromptExploderMasterNodeId(node.id);
      const itemId = metadata?.itemId || nodeItemId || createListItemId();
      const fallback = fallbackById.get(itemId);

      const logicalOperator =
        metadata?.logicalOperator ?? fallback?.logicalOperator ?? null;
      const logicalConditions = coerceLogicalConditions(
        metadata?.logicalConditions ?? fallback?.logicalConditions ?? []
      );
      const referencedParamPath =
        metadata?.referencedParamPath ?? fallback?.referencedParamPath ?? null;
      const referencedComparator =
        metadata?.referencedComparator ?? fallback?.referencedComparator ?? null;
      const referencedValue =
        metadata?.referencedValue ?? fallback?.referencedValue ?? null;

      return {
        id: itemId,
        text: node.name,
        logicalOperator,
        logicalConditions,
        referencedParamPath,
        referencedComparator,
        referencedValue,
        children: build(node.id),
      } satisfies PromptExploderListItem;
    });
  };

  return build(null);
};

export const updatePromptExploderListItemById = (
  items: PromptExploderListItem[],
  itemId: string,
  updater: (item: PromptExploderListItem) => PromptExploderListItem
): PromptExploderListItem[] => {
  return items.map((item) => {
    if (item.id === itemId) return updater(item);
    if (item.children.length === 0) return item;
    return {
      ...item,
      children: updatePromptExploderListItemById(item.children, itemId, updater),
    };
  });
};

export const removePromptExploderListItemById = (
  items: PromptExploderListItem[],
  itemId: string
): PromptExploderListItem[] => {
  return items
    .filter((item) => item.id !== itemId)
    .map((item) => ({
      ...item,
      children: removePromptExploderListItemById(item.children, itemId),
    }));
};
