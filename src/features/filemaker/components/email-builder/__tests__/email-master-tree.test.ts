import { describe, expect, it } from 'vitest';

import {
  createEmailBlock,
  type EmailBlock,
  type EmailColumnsBlock,
  type EmailHeadingBlock,
  type EmailRowBlock,
  type EmailSectionBlock,
  type EmailTextBlock,
} from '../block-model';
import {
  applyTreeMutationToBlocks,
  findBlockContext,
  projectBlocksToMasterNodes,
} from '../email-master-tree';

const buildSampleTree = (): EmailBlock[] => {
  const heading = createEmailBlock('heading', { id: 'h1', text: 'Welcome' }) as EmailHeadingBlock;
  const text = createEmailBlock('text', { id: 't1', html: '<p>Hello</p>' }) as EmailTextBlock;
  const row = createEmailBlock('row', { id: 'r1', children: [heading, text] }) as EmailRowBlock;
  const section = createEmailBlock('section', {
    id: 's1',
    label: 'Hero',
    children: [row],
  }) as EmailSectionBlock;
  return [section];
};

describe('projectBlocksToMasterNodes', () => {
  it('flattens a nested tree into ordered MasterTreeNodes with correct parent/order', () => {
    const tree = buildSampleTree();
    const nodes = projectBlocksToMasterNodes(tree);

    expect(nodes.map((node) => node.id)).toEqual(['s1', 'r1', 'h1', 't1']);

    const section = nodes.find((node) => node.id === 's1');
    const row = nodes.find((node) => node.id === 'r1');
    const heading = nodes.find((node) => node.id === 'h1');
    const text = nodes.find((node) => node.id === 't1');

    expect(section?.parentId).toBeNull();
    expect(section?.type).toBe('folder');
    expect(row?.parentId).toBe('s1');
    expect(row?.type).toBe('folder');
    expect(heading?.parentId).toBe('r1');
    expect(heading?.type).toBe('file');
    expect(heading?.sortOrder).toBe(0);
    expect(text?.sortOrder).toBe(1);
  });
});

describe('applyTreeMutationToBlocks', () => {
  it('round-trips a tree via project → apply with no structural change', () => {
    const tree = buildSampleTree();
    const nodes = projectBlocksToMasterNodes(tree);
    const restored = applyTreeMutationToBlocks(tree, nodes);

    expect(restored).toHaveLength(1);
    const section = restored[0];
    if (!section || section.kind !== 'section') throw new Error('Expected section root');
    const row = section.children[0];
    if (!row || row.kind !== 'row') throw new Error('Expected row');
    expect(row.children.map((child) => child.id)).toEqual(['h1', 't1']);
  });

  it('preserves leaf data when a sibling reorder happens', () => {
    const tree = buildSampleTree();
    const nodes = projectBlocksToMasterNodes(tree);

    const reordered = nodes.map((node) => {
      if (node.id === 'h1') return { ...node, sortOrder: 1 };
      if (node.id === 't1') return { ...node, sortOrder: 0 };
      return node;
    });

    const restored = applyTreeMutationToBlocks(tree, reordered);
    const section = restored[0];
    if (!section || section.kind !== 'section') throw new Error('Expected section root');
    const row = section.children[0];
    if (!row || row.kind !== 'row') throw new Error('Expected row');
    expect(row.children.map((child) => child.id)).toEqual(['t1', 'h1']);

    const heading = row.children.find((child) => child.id === 'h1');
    if (!heading || heading.kind !== 'heading') throw new Error('Expected heading');
    expect(heading.text).toBe('Welcome');
  });

  it('moves a leaf across rows', () => {
    const heading = createEmailBlock('heading', { id: 'h1' }) as EmailHeadingBlock;
    const text = createEmailBlock('text', { id: 't1' }) as EmailTextBlock;
    const rowA = createEmailBlock('row', { id: 'rA', children: [heading] }) as EmailRowBlock;
    const rowB = createEmailBlock('row', { id: 'rB', children: [text] }) as EmailRowBlock;
    const columns = createEmailBlock('columns', {
      id: 'c1',
      children: [rowA, rowB],
    }) as EmailColumnsBlock;
    const section = createEmailBlock('section', { id: 's1', children: [columns] }) as EmailSectionBlock;
    const tree: EmailBlock[] = [section];

    const nodes = projectBlocksToMasterNodes(tree);
    const moved = nodes.map((node) => {
      if (node.id === 'h1') return { ...node, parentId: 'rB', sortOrder: 1 };
      return node;
    });

    const restored = applyTreeMutationToBlocks(tree, moved);
    const restoredSection = restored[0];
    if (!restoredSection || restoredSection.kind !== 'section') throw new Error('section');
    const restoredColumns = restoredSection.children[0];
    if (!restoredColumns || restoredColumns.kind !== 'columns') throw new Error('columns');
    const [restoredRowA, restoredRowB] = restoredColumns.children;
    if (!restoredRowA || !restoredRowB) throw new Error('rows');
    expect(restoredRowA.children).toHaveLength(0);
    expect(restoredRowB.children.map((child) => child.id)).toEqual(['t1', 'h1']);
  });
});

describe('findBlockContext', () => {
  it('returns parent + index for a nested block', () => {
    const tree = buildSampleTree();
    const context = findBlockContext(tree, 'h1');
    expect(context?.parent?.id).toBe('r1');
    expect(context?.index).toBe(0);
  });

  it('returns null parent for a root block', () => {
    const tree = buildSampleTree();
    const context = findBlockContext(tree, 's1');
    expect(context?.parent).toBeNull();
    expect(context?.index).toBe(0);
  });
});
