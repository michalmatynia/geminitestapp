/* eslint-disable complexity, consistent-return, max-lines-per-function, @typescript-eslint/consistent-type-assertions, @typescript-eslint/strict-boolean-expressions */

import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  createCvBlock,
  getCvBlockChildren,
  isCvContainerBlock,
  isCvLeafBlock,
  type CvBlock,
  type CvColumnsBlock,
  type CvContainerBlock,
  type CvLeafBlock,
  type CvRowBlock,
  type CvSectionBlock,
  type CvStackBlock,
} from './cv-block-model';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'block';

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, '').trim();

const labelForBlock = (block: CvBlock): string => {
  switch (block.kind) {
    case 'section': return block.label || 'Section';
    case 'stack': return block.label || 'Stack';
    case 'columns': return block.label || 'Columns';
    case 'row': return block.label || 'Row';
    case 'profileHeader': return block.name ? `Header: ${block.name}` : 'Profile header';
    case 'summary': return block.text ? `Summary: ${block.text.slice(0, 40)}` : 'Summary';
    case 'experience': return block.title ? `Experience: ${block.title}` : 'Experience';
    case 'education': return block.institution ? `Education: ${block.institution}` : 'Education';
    case 'skills': return block.label || 'Skills';
    case 'techStack': return block.label || 'Tech stack';
    case 'languages': return block.label || 'Languages';
    case 'customText': {
      const text = stripHtml(block.html);
      return block.label || (text ? `Text: ${text.slice(0, 40)}` : 'Custom text');
    }
    case 'divider': return 'Divider';
    case 'spacer': return `Spacer (${block.height}px)`;
  }
};

export const projectCvBlocksToMasterNodes = (blocks: CvBlock[]): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];

  const walk = (
    block: CvBlock,
    parentId: string | null,
    parentPath: string,
    sortOrder: number
  ): void => {
    const segment = `${slugify(block.kind)}-${slugify(block.id)}`;
    const path = parentPath ? `${parentPath}/${segment}` : segment;
    nodes.push({
      id: block.id,
      type: isCvContainerBlock(block) ? 'folder' : 'file',
      kind: block.kind,
      parentId,
      name: labelForBlock(block),
      path,
      sortOrder,
    });
    if (isCvContainerBlock(block)) {
      block.children.forEach((child: CvBlock, index: number): void => {
        walk(child, block.id, path, index);
      });
    }
  };

  blocks.forEach((block: CvBlock, index: number): void => {
    walk(block, null, '', index);
  });

  return nodes;
};

const indexBlocksById = (blocks: CvBlock[]): Map<string, CvBlock> => {
  const map = new Map<string, CvBlock>();
  const visit = (block: CvBlock): void => {
    map.set(block.id, block);
    getCvBlockChildren(block).forEach(visit);
  };
  blocks.forEach(visit);
  return map;
};

interface RebuildContext {
  previousById: Map<string, CvBlock>;
  childrenByParent: Map<string | null, MasterTreeNode[]>;
}

const buildBlockFromNode = (node: MasterTreeNode, context: RebuildContext): CvBlock | null => {
  const previous = context.previousById.get(node.id);
  const children = (context.childrenByParent.get(node.id) ?? [])
    .slice()
    .sort((left: MasterTreeNode, right: MasterTreeNode): number => left.sortOrder - right.sortOrder)
    .map((child: MasterTreeNode): CvBlock | null => buildBlockFromNode(child, context))
    .filter((entry: CvBlock | null): entry is CvBlock => entry !== null);
  const renamedLabel = node.name.trim();

  switch (node.kind) {
    case 'section': {
      const previousSection = previous?.kind === 'section' ? previous : null;
      return createCvBlock('section', {
        ...(previousSection ?? {}),
        id: node.id,
        label: renamedLabel || previousSection?.label || 'Section',
        children: children.filter((child: CvBlock): boolean => child.kind !== 'section'),
      } as Partial<CvSectionBlock>);
    }
    case 'stack': {
      const previousStack = previous?.kind === 'stack' ? previous : null;
      return createCvBlock('stack', {
        ...(previousStack ?? {}),
        id: node.id,
        label: renamedLabel || previousStack?.label || 'Stack',
        children: children.filter((child: CvBlock): child is CvLeafBlock => isCvLeafBlock(child)),
      } as Partial<CvStackBlock>);
    }
    case 'columns': {
      const previousColumns = previous?.kind === 'columns' ? previous : null;
      return createCvBlock('columns', {
        ...(previousColumns ?? {}),
        id: node.id,
        label: renamedLabel || previousColumns?.label || 'Columns',
        children: children.filter((child: CvBlock): child is CvRowBlock => child.kind === 'row'),
      } as Partial<CvColumnsBlock>);
    }
    case 'row': {
      const previousRow = previous?.kind === 'row' ? previous : null;
      return createCvBlock('row', {
        ...(previousRow ?? {}),
        id: node.id,
        label: renamedLabel || previousRow?.label || 'Row',
        children: children.filter((child: CvBlock): child is CvLeafBlock => isCvLeafBlock(child)),
      } as Partial<CvRowBlock>);
    }
    case 'profileHeader':
    case 'summary':
    case 'experience':
    case 'education':
    case 'skills':
    case 'techStack':
    case 'languages':
    case 'customText':
    case 'divider':
    case 'spacer': {
      if (previous?.kind !== node.kind) return createCvBlock(node.kind, { id: node.id });
      return previous;
    }
    default:
      return null;
  }
};

export const applyTreeMutationToCvBlocks = (
  previousBlocks: CvBlock[],
  nextNodes: MasterTreeNode[]
): CvBlock[] => {
  const previousById = indexBlocksById(previousBlocks);
  const childrenByParent = new Map<string | null, MasterTreeNode[]>();

  nextNodes.forEach((node: MasterTreeNode): void => {
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  });

  const context: RebuildContext = { previousById, childrenByParent };
  const roots = (childrenByParent.get(null) ?? [])
    .slice()
    .sort((left: MasterTreeNode, right: MasterTreeNode): number => left.sortOrder - right.sortOrder);

  return roots
    .map((root: MasterTreeNode): CvBlock | null => buildBlockFromNode(root, context))
    .filter((block: CvBlock | null): block is CvBlock => block !== null);
};

export type CvBlockTreeContext = {
  block: CvBlock;
  parent: CvContainerBlock | null;
  index: number;
};

export const findCvBlockContext = (
  blocks: CvBlock[],
  blockId: string
): CvBlockTreeContext | null => {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!block) continue;
    if (block.id === blockId) return { block, parent: null, index };
    if (isCvContainerBlock(block)) {
      const childContext = findCvBlockContext(block.children as CvBlock[], blockId);
      if (childContext) {
        return childContext.parent === null
          ? { block: childContext.block, parent: block, index: childContext.index }
          : childContext;
      }
    }
  }
  return null;
};
