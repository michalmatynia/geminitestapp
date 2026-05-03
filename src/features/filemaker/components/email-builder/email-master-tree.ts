import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  createEmailBlock,
  getBlockChildren,
  isEmailContainerBlock,
  isEmailLeafBlock,
  type EmailBlock,
  type EmailColumnsBlock,
  type EmailContainerBlock,
  type EmailLeafBlock,
  type EmailRowBlock,
  type EmailSectionBlock,
} from './block-model';

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return slug.length > 0 ? slug : 'block';
};

const labelWithFallback = (label: string, fallback: string): string => {
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const labelForTextBlock = (block: Extract<EmailLeafBlock, { kind: 'text' }>): string => {
  const stripped = block.html.replace(/<[^>]*>/g, '').trim();
  return stripped.length > 0 ? `Text: ${stripped.slice(0, 40)}` : 'Text';
};

const labelForImageBlock = (block: Extract<EmailLeafBlock, { kind: 'image' }>): string =>
  block.alt.length > 0 ? `Image: ${block.alt}` : 'Image';

const labelForContainerBlock = (block: EmailContainerBlock): string => {
  switch (block.kind) {
    case 'section': return labelWithFallback(block.label, 'Section');
    case 'columns': return labelWithFallback(block.label, 'Columns');
    case 'row': return labelWithFallback(block.label, 'Row');
  }
  return 'Block';
};

const labelForLeafBlock = (block: EmailLeafBlock): string => {
  switch (block.kind) {
    case 'heading': return `Heading: ${block.text}`.slice(0, 60);
    case 'text': return labelForTextBlock(block);
    case 'image': return labelForImageBlock(block);
    case 'button': return `Button: ${block.label}`;
    case 'divider': return 'Divider';
    case 'spacer': return `Spacer (${block.height}px)`;
  }
  return 'Block';
};

const labelForBlock = (block: EmailBlock): string =>
  isEmailContainerBlock(block) ? labelForContainerBlock(block) : labelForLeafBlock(block);

export const projectBlocksToMasterNodes = (blocks: EmailBlock[]): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];

  const walk = (
    block: EmailBlock,
    parentId: string | null,
    parentPath: string,
    sortOrder: number
  ): void => {
    const segment = `${slugify(block.kind)}-${slugify(block.id)}`;
    const path = parentPath.length > 0 ? `${parentPath}/${segment}` : segment;
    nodes.push({
      id: block.id,
      type: isEmailContainerBlock(block) ? 'folder' : 'file',
      kind: block.kind,
      parentId,
      name: labelForBlock(block),
      path,
      sortOrder,
    });
    if (isEmailContainerBlock(block)) {
      block.children.forEach((child: EmailBlock, index: number) => {
        walk(child, block.id, path, index);
      });
    }
  };

  blocks.forEach((block: EmailBlock, index: number) => {
    walk(block, null, '', index);
  });

  return nodes;
};

const indexBlocksById = (blocks: EmailBlock[]): Map<string, EmailBlock> => {
  const map = new Map<string, EmailBlock>();
  const visit = (block: EmailBlock): void => {
    map.set(block.id, block);
    getBlockChildren(block).forEach(visit);
  };
  blocks.forEach(visit);
  return map;
};

interface RebuildContext {
  previousById: Map<string, EmailBlock>;
  childrenByParent: Map<string | null, MasterTreeNode[]>;
}

const resolveNodeChildren = (
  node: MasterTreeNode,
  context: RebuildContext
): EmailBlock[] =>
  (context.childrenByParent.get(node.id) ?? [])
    .slice()
    .sort((left: MasterTreeNode, right: MasterTreeNode): number => left.sortOrder - right.sortOrder)
    .map((child: MasterTreeNode): EmailBlock | null => buildBlockFromNode(child, context))
    .filter((entry: EmailBlock | null): entry is EmailBlock => entry !== null);

const createSectionBlockFromNode = (
  node: MasterTreeNode,
  previous: EmailBlock | undefined,
  children: EmailBlock[],
  label: string
): EmailBlock => {
  const previousSection = previous?.kind === 'section' ? previous : null;
  const overrides: Partial<EmailSectionBlock> = {
    ...(previousSection ?? {}),
    id: node.id,
    label: labelWithFallback(label, previousSection?.label ?? 'Section'),
    children: children.filter((child: EmailBlock): boolean => child.kind !== 'section'),
  };
  return createEmailBlock('section', overrides);
};

const createColumnsBlockFromNode = (
  node: MasterTreeNode,
  previous: EmailBlock | undefined,
  children: EmailBlock[],
  label: string
): EmailBlock => {
  const previousColumns = previous?.kind === 'columns' ? previous : null;
  const overrides: Partial<EmailColumnsBlock> = {
    ...(previousColumns ?? {}),
    id: node.id,
    label: labelWithFallback(label, previousColumns?.label ?? 'Columns'),
    children: children.filter((child: EmailBlock): child is EmailRowBlock => child.kind === 'row'),
  };
  return createEmailBlock('columns', overrides);
};

const createRowBlockFromNode = (
  node: MasterTreeNode,
  previous: EmailBlock | undefined,
  children: EmailBlock[],
  label: string
): EmailBlock => {
  const previousRow = previous?.kind === 'row' ? previous : null;
  const overrides: Partial<EmailRowBlock> = {
    ...(previousRow ?? {}),
    id: node.id,
    label: labelWithFallback(label, previousRow?.label ?? 'Row'),
    children: children.filter((child: EmailBlock): child is EmailLeafBlock => isEmailLeafBlock(child)),
  };
  return createEmailBlock('row', overrides);
};

const isEmailLeafBlockKind = (kind: string): kind is EmailLeafBlock['kind'] =>
  kind === 'heading' ||
  kind === 'text' ||
  kind === 'image' ||
  kind === 'button' ||
  kind === 'divider' ||
  kind === 'spacer';

const createLeafBlockFromNode = (
  node: MasterTreeNode,
  previous: EmailBlock | undefined
): EmailBlock | null => {
  if (!isEmailLeafBlockKind(node.kind)) return null;
  if (previous?.kind !== node.kind) return createEmailBlock(node.kind, { id: node.id });
  return previous;
};

const buildBlockFromNode = (
  node: MasterTreeNode,
  context: RebuildContext
): EmailBlock | null => {
  const previous = context.previousById.get(node.id);
  const renamedLabel = node.name.trim();
  if (node.kind === 'section') return createSectionBlockFromNode(node, previous, resolveNodeChildren(node, context), renamedLabel);
  if (node.kind === 'columns') return createColumnsBlockFromNode(node, previous, resolveNodeChildren(node, context), renamedLabel);
  if (node.kind === 'row') return createRowBlockFromNode(node, previous, resolveNodeChildren(node, context), renamedLabel);
  return createLeafBlockFromNode(node, previous);
};

export const applyTreeMutationToBlocks = (
  previousBlocks: EmailBlock[],
  nextNodes: MasterTreeNode[]
): EmailBlock[] => {
  const previousById = indexBlocksById(previousBlocks);

  const childrenByParent = new Map<string | null, MasterTreeNode[]>();
  nextNodes.forEach((node: MasterTreeNode) => {
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  });

  const context: RebuildContext = { previousById, childrenByParent };
  const roots = (childrenByParent.get(null) ?? [])
    .slice()
    .sort((left: MasterTreeNode, right: MasterTreeNode): number => left.sortOrder - right.sortOrder);

  return roots
    .map((root: MasterTreeNode): EmailBlock | null => buildBlockFromNode(root, context))
    .filter((block: EmailBlock | null): block is EmailBlock => block !== null);
};

export const decodeEmailBlockNodeId = (
  nodeId: string,
  blocks: EmailBlock[]
): { entity: 'block'; id: string; kind: EmailBlock['kind']; node: EmailBlock } | null => {
  const map = indexBlocksById(blocks);
  const block = map.get(nodeId);
  if (block === undefined) return null;
  return { entity: 'block', id: block.id, kind: block.kind, node: block };
};

export type EmailBlockTreeContext = {
  block: EmailBlock;
  parent: EmailContainerBlock | null;
  index: number;
};

export const findBlockContext = (
  blocks: EmailBlock[],
  blockId: string
): EmailBlockTreeContext | null => {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block === undefined) continue;
    if (block.id === blockId) {
      return { block, parent: null, index };
    }
    if (!isEmailContainerBlock(block)) continue;
    const childContext = findBlockContext(getBlockChildren(block), blockId);
    if (childContext === null) continue;
    if (childContext.parent === null) {
      return { block: childContext.block, parent: block, index: childContext.index };
    }
    return childContext;
  }
  return null;
};
