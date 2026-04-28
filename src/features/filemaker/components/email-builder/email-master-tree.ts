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

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'block';

const labelForBlock = (block: EmailBlock): string => {
  switch (block.kind) {
    case 'section': return block.label || 'Section';
    case 'columns': return block.label || 'Columns';
    case 'row': return block.label || 'Row';
    case 'heading': return `Heading: ${block.text}`.slice(0, 60);
    case 'text': {
      const stripped = block.html.replace(/<[^>]*>/g, '').trim();
      return stripped ? `Text: ${stripped.slice(0, 40)}` : 'Text';
    }
    case 'image': return block.alt ? `Image: ${block.alt}` : 'Image';
    case 'button': return `Button: ${block.label}`;
    case 'divider': return 'Divider';
    case 'spacer': return `Spacer (${block.height}px)`;
  }
};

export const projectBlocksToMasterNodes = (blocks: EmailBlock[]): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];

  const walk = (
    block: EmailBlock,
    parentId: string | null,
    parentPath: string,
    sortOrder: number
  ): void => {
    const segment = `${slugify(block.kind)}-${slugify(block.id)}`;
    const path = parentPath ? `${parentPath}/${segment}` : segment;
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

const buildBlockFromNode = (
  node: MasterTreeNode,
  context: RebuildContext
): EmailBlock | null => {
  const previous = context.previousById.get(node.id);
  const children = (context.childrenByParent.get(node.id) ?? [])
    .slice()
    .sort((left: MasterTreeNode, right: MasterTreeNode): number => left.sortOrder - right.sortOrder)
    .map((child: MasterTreeNode): EmailBlock | null => buildBlockFromNode(child, context))
    .filter((entry: EmailBlock | null): entry is EmailBlock => entry !== null);

  const renamedLabel = node.name.trim();

  switch (node.kind) {
    case 'section': {
      const previousSection =
        previous?.kind === 'section' ? previous : null;
      return createEmailBlock('section', {
        ...(previousSection ?? {}),
        id: node.id,
        label: renamedLabel || previousSection?.label || 'Section',
        children: children.filter(
          (child: EmailBlock): boolean => child.kind !== 'section'
        ),
      } as Partial<EmailSectionBlock>);
    }
    case 'columns': {
      const previousColumns =
        previous?.kind === 'columns' ? previous : null;
      return createEmailBlock('columns', {
        ...(previousColumns ?? {}),
        id: node.id,
        label: renamedLabel || previousColumns?.label || 'Columns',
        children: children.filter(
          (child: EmailBlock): child is EmailRowBlock => child.kind === 'row'
        ),
      } as Partial<EmailColumnsBlock>);
    }
    case 'row': {
      const previousRow = previous?.kind === 'row' ? previous : null;
      return createEmailBlock('row', {
        ...(previousRow ?? {}),
        id: node.id,
        label: renamedLabel || previousRow?.label || 'Row',
        children: children.filter((child: EmailBlock): child is EmailLeafBlock =>
          isEmailLeafBlock(child)
        ),
      } as Partial<EmailRowBlock>);
    }
    case 'heading':
    case 'text':
    case 'image':
    case 'button':
    case 'divider':
    case 'spacer': {
      if (previous?.kind !== node.kind) {
        // node has no prior data (just created via tree insertion) — synthesise default
        return createEmailBlock(node.kind, { id: node.id });
      }
      return previous;
    }
    default:
      return null;
  }
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
  if (!block) return null;
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
    if (!block) continue;
    if (block.id === blockId) {
      return { block, parent: null, index };
    }
    if (isEmailContainerBlock(block)) {
      const childContext = findBlockContext(block.children as EmailBlock[], blockId);
      if (childContext) {
        return childContext.parent === null
          ? { block: childContext.block, parent: block, index: childContext.index }
          : childContext;
      }
    }
  }
  return null;
};
