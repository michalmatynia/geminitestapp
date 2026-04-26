import {
  isContainerKindAcceptingChildKind,
  isEmailContainerBlock,
  isEmailLeafBlock,
  type EmailBlock,
  type EmailColumnsBlock,
  type EmailContainerBlock,
  type EmailLeafBlock,
  type EmailRowBlock,
  type EmailSectionBlock,
} from './block-model';
import { findBlockContext } from './email-master-tree';

const replaceContainerChildren = (
  container: EmailContainerBlock,
  nextChildren: EmailBlock[]
): EmailContainerBlock => {
  switch (container.kind) {
    case 'section':
      return {
        ...container,
        children: nextChildren.filter((entry) => entry.kind !== 'section'),
      } satisfies EmailSectionBlock;
    case 'columns':
      return {
        ...container,
        children: nextChildren.filter(
          (entry: EmailBlock): entry is EmailRowBlock => entry.kind === 'row'
        ),
      } satisfies EmailColumnsBlock;
    case 'row':
      return {
        ...container,
        children: nextChildren.filter((entry: EmailBlock): entry is EmailLeafBlock =>
          isEmailLeafBlock(entry)
        ),
      } satisfies EmailRowBlock;
  }
};

const mapBlocks = (
  blocks: EmailBlock[],
  visit: (block: EmailBlock) => EmailBlock
): EmailBlock[] =>
  blocks.map((block: EmailBlock): EmailBlock => {
    const updated = visit(block);
    if (isEmailContainerBlock(updated)) {
      const mappedChildren = mapBlocks(updated.children as EmailBlock[], visit);
      return replaceContainerChildren(updated, mappedChildren);
    }
    return updated;
  });

export const updateBlock = (
  blocks: EmailBlock[],
  blockId: string,
  patch: Partial<EmailBlock>
): EmailBlock[] =>
  mapBlocks(blocks, (block: EmailBlock): EmailBlock => {
    if (block.id !== blockId) return block;
    return { ...block, ...patch } as EmailBlock;
  });

export const removeBlock = (blocks: EmailBlock[], blockId: string): EmailBlock[] => {
  const filterAndRecurse = (entries: EmailBlock[]): EmailBlock[] =>
    entries
      .filter((entry: EmailBlock): boolean => entry.id !== blockId)
      .map((entry: EmailBlock): EmailBlock => {
        if (isEmailContainerBlock(entry)) {
          return replaceContainerChildren(entry, filterAndRecurse(entry.children as EmailBlock[]));
        }
        return entry;
      });
  return filterAndRecurse(blocks);
};

export const insertBlock = (
  blocks: EmailBlock[],
  parentId: string | null,
  newBlock: EmailBlock,
  index?: number
): EmailBlock[] => {
  if (parentId === null) {
    if (newBlock.kind !== 'section') return blocks; // root only accepts sections
    const next = blocks.slice();
    const insertAt = index ?? next.length;
    next.splice(insertAt, 0, newBlock);
    return next;
  }
  return mapBlocks(blocks, (block: EmailBlock): EmailBlock => {
    if (block.id !== parentId) return block;
    if (!isEmailContainerBlock(block)) return block;
    if (!isContainerKindAcceptingChildKind(block.kind, newBlock.kind)) return block;
    const nextChildren = (block.children as EmailBlock[]).slice();
    const insertAt = index ?? nextChildren.length;
    nextChildren.splice(insertAt, 0, newBlock);
    return replaceContainerChildren(block, nextChildren);
  });
};

export const resolveInsertionParent = (
  blocks: EmailBlock[],
  selectedBlockId: string | null,
  newKind: EmailBlock['kind']
): { parentId: string | null; index: number | undefined } => {
  if (newKind === 'section') return { parentId: null, index: undefined };

  const selectedContext = selectedBlockId ? findBlockContext(blocks, selectedBlockId) : null;
  if (selectedContext) {
    const { block, parent } = selectedContext;
    // If the selected block is a container that accepts the new kind, insert inside it.
    if (isEmailContainerBlock(block) && isContainerKindAcceptingChildKind(block.kind, newKind)) {
      return { parentId: block.id, index: undefined };
    }
    // Otherwise, insert as sibling under the selected block's parent if that parent accepts it.
    if (parent && isContainerKindAcceptingChildKind(parent.kind, newKind)) {
      return { parentId: parent.id, index: selectedContext.index + 1 };
    }
  }

  // Fall back: append to the last container at root that accepts the new kind.
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (block && isEmailContainerBlock(block) && isContainerKindAcceptingChildKind(block.kind, newKind)) {
      return { parentId: block.id, index: undefined };
    }
  }
  return { parentId: null, index: undefined };
};
