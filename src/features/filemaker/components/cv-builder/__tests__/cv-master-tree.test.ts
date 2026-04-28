import { describe, expect, it } from 'vitest';

import {
  createCvBlock,
  type CvBlock,
  type CvColumnsBlock,
  type CvExperienceBlock,
  type CvProfileHeaderBlock,
  type CvRowBlock,
  type CvSectionBlock,
  type CvStackBlock,
  type CvSummaryBlock,
} from '../cv-block-model';
import {
  applyTreeMutationToCvBlocks,
  findCvBlockContext,
  projectCvBlocksToMasterNodes,
} from '../cv-master-tree';

const buildSampleTree = (): CvBlock[] => {
  const header = createCvBlock('profileHeader', {
    id: 'header',
    name: 'Ada Lovelace',
  }) as CvProfileHeaderBlock;
  const summary = createCvBlock('summary', {
    id: 'summary',
    text: 'Computing pioneer.',
  }) as CvSummaryBlock;
  const stack = createCvBlock('stack', {
    id: 'stack',
    children: [header, summary],
  }) as CvStackBlock;
  const section = createCvBlock('section', {
    id: 'section',
    label: 'Profile',
    children: [stack],
  }) as CvSectionBlock;
  return [section];
};

describe('projectCvBlocksToMasterNodes', () => {
  it('flattens stacked CV blocks into ordered MasterTreeNodes', () => {
    const nodes = projectCvBlocksToMasterNodes(buildSampleTree());

    expect(nodes.map((node) => node.id)).toEqual(['section', 'stack', 'header', 'summary']);
    expect(nodes.find((node) => node.id === 'section')?.parentId).toBeNull();
    expect(nodes.find((node) => node.id === 'section')?.type).toBe('folder');
    expect(nodes.find((node) => node.id === 'stack')?.parentId).toBe('section');
    expect(nodes.find((node) => node.id === 'stack')?.type).toBe('folder');
    expect(nodes.find((node) => node.id === 'header')?.parentId).toBe('stack');
    expect(nodes.find((node) => node.id === 'header')?.type).toBe('file');
    expect(nodes.find((node) => node.id === 'summary')?.sortOrder).toBe(1);
  });
});

describe('applyTreeMutationToCvBlocks', () => {
  it('preserves leaf data when a stack reorder happens', () => {
    const tree = buildSampleTree();
    const nodes = projectCvBlocksToMasterNodes(tree);
    const reordered = nodes.map((node) => {
      if (node.id === 'header') return { ...node, sortOrder: 1 };
      if (node.id === 'summary') return { ...node, sortOrder: 0 };
      return node;
    });

    const restored = applyTreeMutationToCvBlocks(tree, reordered);
    const section = restored[0];
    if (!section || section.kind !== 'section') throw new Error('Expected section');
    const stack = section.children[0];
    if (!stack || stack.kind !== 'stack') throw new Error('Expected stack');
    expect(stack.children.map((child) => child.id)).toEqual(['summary', 'header']);

    const header = stack.children.find((child) => child.id === 'header');
    if (!header || header.kind !== 'profileHeader') throw new Error('Expected profile header');
    expect(header.name).toBe('Ada Lovelace');
  });

  it('moves a leaf from a stack to a row inside columns', () => {
    const header = createCvBlock('profileHeader', { id: 'header' }) as CvProfileHeaderBlock;
    const experience = createCvBlock('experience', { id: 'experience' }) as CvExperienceBlock;
    const stack = createCvBlock('stack', { id: 'stack', children: [header] }) as CvStackBlock;
    const row = createCvBlock('row', { id: 'row', children: [experience] }) as CvRowBlock;
    const columns = createCvBlock('columns', {
      id: 'columns',
      children: [row],
    }) as CvColumnsBlock;
    const tree: CvBlock[] = [
      createCvBlock('section', {
        id: 'section',
        children: [stack, columns],
      }) as CvSectionBlock,
    ];
    const nodes = projectCvBlocksToMasterNodes(tree);
    const moved = nodes.map((node) => {
      if (node.id === 'header') return { ...node, parentId: 'row', sortOrder: 1 };
      return node;
    });

    const restored = applyTreeMutationToCvBlocks(tree, moved);
    const section = restored[0];
    if (!section || section.kind !== 'section') throw new Error('Expected section');
    const restoredStack = section.children.find((child) => child.kind === 'stack');
    const restoredColumns = section.children.find((child) => child.kind === 'columns');
    if (!restoredStack || restoredStack.kind !== 'stack') throw new Error('Expected stack');
    if (!restoredColumns || restoredColumns.kind !== 'columns') throw new Error('Expected columns');
    const restoredRow = restoredColumns.children[0];
    if (!restoredRow) throw new Error('Expected row');
    expect(restoredStack.children).toHaveLength(0);
    expect(restoredRow.children.map((child) => child.id)).toEqual(['experience', 'header']);
  });
});

describe('findCvBlockContext', () => {
  it('returns parent and index for a stacked block', () => {
    const context = findCvBlockContext(buildSampleTree(), 'summary');
    expect(context?.parent?.id).toBe('stack');
    expect(context?.index).toBe(1);
  });
});
