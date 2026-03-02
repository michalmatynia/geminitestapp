import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  buildPromptExploderTreeMetadata,
  readPromptExploderTreeMetadata,
  toPromptExploderTreeNodeId,
} from './types';

import type { PromptExploderListItem, PromptExploderSubsection } from '../types';

const createListItemId = (): string =>
  `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const cloneLogicalConditions = (conditions: PromptExploderListItem['logicalConditions']) =>
  Array.isArray(conditions)
    ? conditions.map((condition) => ({
        ...condition,
      }))
    : [];

const cloneListItem = (item: PromptExploderListItem): PromptExploderListItem => ({
  ...item,
  logicalConditions: cloneLogicalConditions(item.logicalConditions),
  children: item.children.map(cloneListItem),
});

const buildFallbackItemMap = (subsections: PromptExploderSubsection[]): Map<string, PromptExploderListItem> => {
  const byId = new Map<string, PromptExploderListItem>();
  const walk = (items: PromptExploderListItem[]): void => {
    items.forEach((item) => {
      byId.set(item.id, item);
      if (item.children.length > 0) walk(item.children);
    });
  };
  subsections.forEach((subsection) => {
    walk(subsection.items ?? []);
  });
  return byId;
};

const buildItemNodes = (
  items: PromptExploderListItem[],
  parentId: string,
  nodes: MasterTreeNode[]
): void => {
  items.forEach((item, index) => {
    const nodeId = toPromptExploderTreeNodeId('subsection_item', item.id);
    nodes.push({
      id: nodeId,
      type: 'folder',
      kind: 'folder',
      parentId,
      name: item.text?.trim() || item.label?.trim() || `Item ${index + 1}`,
      path: `${parentId}/${item.id}`,
      sortOrder: index,
      metadata: buildPromptExploderTreeMetadata({
        kind: 'subsection_item',
        entityId: item.id,
        logicalOperator: item.logicalOperator ?? null,
      }),
    });
    if (item.children.length > 0) {
      buildItemNodes(item.children, nodeId, nodes);
    }
  });
};

export const buildPromptExploderSubsectionMasterNodes = (
  subsections: PromptExploderSubsection[]
): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];
  subsections.forEach((subsection, index) => {
    const subsectionNodeId = toPromptExploderTreeNodeId('subsection', subsection.id);
    nodes.push({
      id: subsectionNodeId,
      type: 'folder',
      kind: 'folder',
      parentId: null,
      name: subsection.title?.trim() || `Subsection ${index + 1}`,
      path: `subsection/${subsection.id}`,
      sortOrder: index,
      metadata: buildPromptExploderTreeMetadata({
        kind: 'subsection',
        entityId: subsection.id,
        code: subsection.code ?? null,
        condition: subsection.condition ?? null,
        guidance: subsection.guidance ?? null,
      }),
    });
    buildItemNodes(subsection.items ?? [], subsectionNodeId, nodes);
  });
  return nodes;
};

export const rebuildPromptExploderSubsectionsFromMasterNodes = (args: {
  nodes: MasterTreeNode[];
  previousSubsections: PromptExploderSubsection[];
}): PromptExploderSubsection[] => {
  const subsectionFallbackById = new Map(
    args.previousSubsections.map((subsection) => [subsection.id, subsection])
  );
  const itemFallbackById = buildFallbackItemMap(args.previousSubsections);
  const childrenByParent = new Map<string | null, MasterTreeNode[]>();

  args.nodes.forEach((node) => {
    const parentId = node.parentId ?? null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(parentId, siblings);
  });

  childrenByParent.forEach((siblings) => {
    siblings.sort((left, right) => {
      const orderDelta = left.sortOrder - right.sortOrder;
      if (orderDelta !== 0) return orderDelta;
      return left.id.localeCompare(right.id);
    });
  });

  const buildItems = (parentId: string): PromptExploderListItem[] => {
    const siblings = childrenByParent.get(parentId) ?? [];
    return siblings
      .filter((node) => readPromptExploderTreeMetadata(node)?.kind === 'subsection_item')
      .map((node) => {
        const metadata = readPromptExploderTreeMetadata(node);
        const entityId = metadata?.entityId ?? createListItemId();
        const fallback = itemFallbackById.get(entityId);
        return {
          id: entityId,
          label: fallback?.label,
          value: fallback?.value,
          text: node.name,
          description: fallback?.description,
          logicalOperator: fallback?.logicalOperator ?? null,
          logicalConditions: cloneLogicalConditions(fallback?.logicalConditions ?? []),
          referencedParamPath: fallback?.referencedParamPath ?? null,
          referencedComparator: fallback?.referencedComparator ?? null,
          referencedValue: fallback?.referencedValue ?? null,
          children: buildItems(node.id),
        } satisfies PromptExploderListItem;
      });
  };

  return (childrenByParent.get(null) ?? [])
    .filter((node) => readPromptExploderTreeMetadata(node)?.kind === 'subsection')
    .map((node, index) => {
      const metadata = readPromptExploderTreeMetadata(node);
      const entityId = metadata?.entityId ?? `subsection_${index + 1}`;
      const fallback = subsectionFallbackById.get(entityId);
      return {
        id: entityId,
        title: node.name,
        code: metadata?.code ?? fallback?.code ?? null,
        condition: metadata?.condition ?? fallback?.condition ?? null,
        guidance: metadata?.guidance ?? fallback?.guidance ?? null,
        items: buildItems(node.id),
      } satisfies PromptExploderSubsection;
    });
};

export const updatePromptExploderSubsectionById = (
  subsections: PromptExploderSubsection[],
  subsectionId: string,
  updater: (subsection: PromptExploderSubsection) => PromptExploderSubsection
): PromptExploderSubsection[] =>
  subsections.map((subsection) =>
    subsection.id === subsectionId ? updater(subsection) : subsection
  );

export const updatePromptExploderSubsectionItemById = (
  subsections: PromptExploderSubsection[],
  itemId: string,
  updater: (item: PromptExploderListItem) => PromptExploderListItem
): PromptExploderSubsection[] => {
  const updateItems = (items: PromptExploderListItem[]): PromptExploderListItem[] =>
    items.map((item) => {
      if (item.id === itemId) return updater(item);
      if (item.children.length === 0) return item;
      return {
        ...item,
        children: updateItems(item.children),
      };
    });

  return subsections.map((subsection) => ({
    ...subsection,
    items: updateItems(subsection.items ?? []),
  }));
};

export const removePromptExploderSubsectionNodeById = (
  subsections: PromptExploderSubsection[],
  node: { kind: 'subsection' | 'subsection_item'; entityId: string }
): PromptExploderSubsection[] => {
  if (node.kind === 'subsection') {
    return subsections.filter((subsection) => subsection.id !== node.entityId);
  }

  const removeItem = (items: PromptExploderListItem[]): PromptExploderListItem[] =>
    items
      .filter((item) => item.id !== node.entityId)
      .map((item) => ({
        ...item,
        children: removeItem(item.children),
      }));

  return subsections.map((subsection) => ({
    ...subsection,
    items: removeItem(subsection.items ?? []),
  }));
};
