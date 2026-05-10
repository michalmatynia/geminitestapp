import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  createCvBlock,
  getCvBlockChildren,
  isCvContainerBlock,
  isCvLeafBlock,
  type CvBlock,
  type CvColumnsBlock,
  type CvContainerBlock,
  type CvContainerBlockKind,
  type CvLeafBlockKind,
  type CvLeafBlock,
  type CvRowBlock,
  type CvSectionBlock,
  type CvStackBlock,
} from './cv-block-model';

const CV_CONTAINER_BLOCK_KINDS: ReadonlySet<string> = new Set([
  'section',
  'stack',
  'columns',
  'row',
]);

const CV_LEAF_BLOCK_KINDS: ReadonlySet<string> = new Set([
  'profileHeader',
  'summary',
  'experience',
  'education',
  'skills',
  'techStack',
  'languages',
  'customText',
  'divider',
  'spacer',
]);

const isCvContainerBlockKind = (kind: string): kind is CvContainerBlockKind =>
  CV_CONTAINER_BLOCK_KINDS.has(kind);

const isCvLeafBlockKind = (kind: string): kind is CvLeafBlockKind =>
  CV_LEAF_BLOCK_KINDS.has(kind);

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return slug.length > 0 ? slug : 'block';
};

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, '').trim();

const firstText = (values: Array<string | null | undefined>, fallback: string): string => {
  const value = values.find((entry: string | null | undefined): boolean =>
    entry !== null && entry !== undefined && entry.length > 0
  );
  return value ?? fallback;
};

const prefixedText = (prefix: string, value: string, fallback: string): string =>
  value.length > 0 ? `${prefix}: ${value}` : fallback;

const labelForContainerBlock = (block: CvContainerBlock): string => {
  switch (block.kind) {
    case 'section': return firstText([block.label], 'Section');
    case 'stack': return firstText([block.label], 'Stack');
    case 'columns': return firstText([block.label], 'Columns');
    case 'row': return firstText([block.label], 'Row');
  }
  return 'Group';
};

const labelForPrimaryLeafBlock = (block: CvLeafBlock): string | null => {
  switch (block.kind) {
    case 'profileHeader': return prefixedText('Header', block.name, 'Profile header');
    case 'summary': return prefixedText('Summary', block.text.slice(0, 40), 'Summary');
    case 'experience': return prefixedText('Experience', block.title, 'Experience');
    case 'education': return prefixedText('Education', block.institution, 'Education');
    default: return null;
  }
};

const labelForSecondaryLeafBlock = (block: CvLeafBlock): string => {
  switch (block.kind) {
    case 'skills': return firstText([block.label], 'Skills');
    case 'techStack': return firstText([block.label], 'Tech stack');
    case 'languages': return firstText([block.label], 'Languages');
    case 'customText': {
      const text = stripHtml(block.html);
      return firstText([block.label, text.length > 0 ? `Text: ${text.slice(0, 40)}` : null], 'Custom text');
    }
    case 'divider': return 'Divider';
    case 'spacer': return `Spacer (${block.height}px)`;
    default: return 'Block';
  }
};

const labelForBlock = (block: CvBlock): string => {
  if (isCvContainerBlock(block)) return labelForContainerBlock(block);
  return labelForPrimaryLeafBlock(block) ?? labelForSecondaryLeafBlock(block);
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
    const path = parentPath.length > 0 ? `${parentPath}/${segment}` : segment;
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

const sortMasterTreeNodes = (nodes: MasterTreeNode[]): MasterTreeNode[] =>
  nodes
    .slice()
    .sort((left: MasterTreeNode, right: MasterTreeNode): number => left.sortOrder - right.sortOrder);

const buildChildBlocksFromNode = (
  node: MasterTreeNode,
  context: RebuildContext
): CvBlock[] =>
  sortMasterTreeNodes(context.childrenByParent.get(node.id) ?? [])
    .map((child: MasterTreeNode): CvBlock | null => buildBlockFromNode(child, context))
    .filter((entry: CvBlock | null): entry is CvBlock => entry !== null);

const buildSectionBlock = (
  node: MasterTreeNode,
  previous: CvBlock | undefined,
  children: CvBlock[],
  renamedLabel: string
): CvBlock => {
  const previousSection = previous?.kind === 'section' ? previous : null;
  const sectionInput: Partial<CvSectionBlock> = {
    ...(previousSection ?? {}),
    id: node.id,
    label: firstText([renamedLabel, previousSection?.label], 'Section'),
    children: children.filter((child: CvBlock): boolean => child.kind !== 'section'),
  };
  return createCvBlock('section', sectionInput);
};

const buildStackBlock = (
  node: MasterTreeNode,
  previous: CvBlock | undefined,
  children: CvBlock[],
  renamedLabel: string
): CvBlock => {
  const previousStack = previous?.kind === 'stack' ? previous : null;
  const stackInput: Partial<CvStackBlock> = {
    ...(previousStack ?? {}),
    id: node.id,
    label: firstText([renamedLabel, previousStack?.label], 'Stack'),
    children: children.filter((child: CvBlock): child is CvLeafBlock => isCvLeafBlock(child)),
  };
  return createCvBlock('stack', stackInput);
};

const buildColumnsBlock = (
  node: MasterTreeNode,
  previous: CvBlock | undefined,
  children: CvBlock[],
  renamedLabel: string
): CvBlock => {
  const previousColumns = previous?.kind === 'columns' ? previous : null;
  const columnsInput: Partial<CvColumnsBlock> = {
    ...(previousColumns ?? {}),
    id: node.id,
    label: firstText([renamedLabel, previousColumns?.label], 'Columns'),
    children: children.filter((child: CvBlock): child is CvRowBlock => child.kind === 'row'),
  };
  return createCvBlock('columns', columnsInput);
};

const buildRowBlock = (
  node: MasterTreeNode,
  previous: CvBlock | undefined,
  children: CvBlock[],
  renamedLabel: string
): CvBlock => {
  const previousRow = previous?.kind === 'row' ? previous : null;
  const rowInput: Partial<CvRowBlock> = {
    ...(previousRow ?? {}),
    id: node.id,
    label: firstText([renamedLabel, previousRow?.label], 'Row'),
    children: children.filter((child: CvBlock): child is CvLeafBlock => isCvLeafBlock(child)),
  };
  return createCvBlock('row', rowInput);
};

const buildContainerBlockFromNode = (
  node: MasterTreeNode,
  previous: CvBlock | undefined,
  children: CvBlock[],
  renamedLabel: string
): CvBlock | null => {
  if (!isCvContainerBlockKind(node.kind)) return null;
  if (node.kind === 'section') return buildSectionBlock(node, previous, children, renamedLabel);
  if (node.kind === 'stack') return buildStackBlock(node, previous, children, renamedLabel);
  if (node.kind === 'columns') return buildColumnsBlock(node, previous, children, renamedLabel);
  return buildRowBlock(node, previous, children, renamedLabel);
};

const buildLeafBlockFromNode = (
  node: MasterTreeNode,
  previous: CvBlock | undefined
): CvBlock | null => {
  if (!isCvLeafBlockKind(node.kind)) return null;
  if (previous?.kind !== node.kind) {
    return createCvBlock(node.kind, { id: node.id });
  }
  return previous;
};

const buildBlockFromNode = (node: MasterTreeNode, context: RebuildContext): CvBlock | null => {
  const previous = context.previousById.get(node.id);
  const children = buildChildBlocksFromNode(node, context);
  const renamedLabel = node.name.trim();

  return (
    buildContainerBlockFromNode(node, previous, children, renamedLabel) ??
    buildLeafBlockFromNode(node, previous)
  );
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
  const roots = sortMasterTreeNodes(childrenByParent.get(null) ?? []);

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
