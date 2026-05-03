/* eslint-disable complexity, consistent-return, @typescript-eslint/consistent-type-assertions */

import {
  isCvContainerBlock,
  isCvContainerKindAcceptingChildKind,
  isCvLeafBlock,
  type CvBlock,
  type CvColumnsBlock,
  type CvContainerBlock,
  type CvLeafBlock,
  type CvRowBlock,
  type CvSectionBlock,
  type CvStackBlock,
} from './cv-block-model';
import { findCvBlockContext } from './cv-master-tree';

const replaceContainerChildren = (
  container: CvContainerBlock,
  nextChildren: CvBlock[]
): CvContainerBlock => {
  switch (container.kind) {
    case 'section':
      return {
        ...container,
        children: nextChildren.filter((entry: CvBlock): boolean => entry.kind !== 'section'),
      } satisfies CvSectionBlock;
    case 'stack':
      return {
        ...container,
        children: nextChildren.filter((entry: CvBlock): entry is CvLeafBlock =>
          isCvLeafBlock(entry)
        ),
      } satisfies CvStackBlock;
    case 'columns':
      return {
        ...container,
        children: nextChildren.filter((entry: CvBlock): entry is CvRowBlock => entry.kind === 'row'),
      } satisfies CvColumnsBlock;
    case 'row':
      return {
        ...container,
        children: nextChildren.filter((entry: CvBlock): entry is CvLeafBlock =>
          isCvLeafBlock(entry)
        ),
      } satisfies CvRowBlock;
  }
};

const collectBlockIds = (blocks: CvBlock[]): Set<string> => {
  const ids = new Set<string>();
  const visit = (block: CvBlock): void => {
    ids.add(block.id);
    if (isCvContainerBlock(block)) {
      (block.children as CvBlock[]).forEach(visit);
    }
  };
  blocks.forEach(visit);
  return ids;
};

const createCopyId = (sourceId: string, usedIds: Set<string>): string => {
  const base = `${sourceId}-copy`;
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
};

const cloneCvBlockTree = (block: CvBlock, usedIds: Set<string>): CvBlock => {
  const id = createCopyId(block.id, usedIds);
  if (!isCvContainerBlock(block)) return { ...block, id } as CvBlock;
  const children = (block.children as CvBlock[]).map((child: CvBlock): CvBlock =>
    cloneCvBlockTree(child, usedIds)
  );
  return replaceContainerChildren({ ...block, id } as CvContainerBlock, children);
};

const mapBlocks = (blocks: CvBlock[], visit: (block: CvBlock) => CvBlock): CvBlock[] =>
  blocks.map((block: CvBlock): CvBlock => {
    const updated = visit(block);
    if (isCvContainerBlock(updated)) {
      const mappedChildren = mapBlocks(updated.children as CvBlock[], visit);
      return replaceContainerChildren(updated, mappedChildren);
    }
    return updated;
  });

export type DuplicateCvBlockResult = {
  blocks: CvBlock[];
  duplicatedId: string | null;
};

type DuplicateEntriesResult = {
  duplicatedId: string | null;
  entries: CvBlock[];
};

export const updateCvBlock = (
  blocks: CvBlock[],
  blockId: string,
  patch: Partial<CvBlock>
): CvBlock[] =>
  mapBlocks(blocks, (block: CvBlock): CvBlock => {
    if (block.id !== blockId) return block;
    return { ...block, ...patch } as CvBlock;
  });

export const removeCvBlock = (blocks: CvBlock[], blockId: string): CvBlock[] => {
  const filterAndRecurse = (entries: CvBlock[]): CvBlock[] =>
    entries
      .filter((entry: CvBlock): boolean => entry.id !== blockId)
      .map((entry: CvBlock): CvBlock => {
        if (isCvContainerBlock(entry)) {
          return replaceContainerChildren(entry, filterAndRecurse(entry.children as CvBlock[]));
        }
        return entry;
      });
  return filterAndRecurse(blocks);
};

export const duplicateCvBlock = (
  blocks: CvBlock[],
  blockId: string
): DuplicateCvBlockResult => {
  const usedIds = collectBlockIds(blocks);
  const duplicateAndTrack = (entries: CvBlock[]): DuplicateEntriesResult => {
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (!entry) continue;
      if (entry.id === blockId) {
        const cloned = cloneCvBlockTree(entry, usedIds);
        return {
          duplicatedId: cloned.id,
          entries: [
            ...entries.slice(0, index),
            entry,
            cloned,
            ...entries.slice(index + 1),
          ],
        };
      }
      if (isCvContainerBlock(entry)) {
        const childResult = duplicateAndTrack(entry.children as CvBlock[]);
        if (childResult.duplicatedId !== null) {
          return {
            duplicatedId: childResult.duplicatedId,
            entries: entries.map((candidate: CvBlock, currentIndex: number): CvBlock =>
              currentIndex === index
                ? replaceContainerChildren(entry, childResult.entries)
                : candidate
            ),
          };
        }
      }
    }
    return { duplicatedId: null, entries };
  };

  const result = duplicateAndTrack(blocks);
  return result.duplicatedId !== null
    ? { blocks: result.entries, duplicatedId: result.duplicatedId }
    : { blocks, duplicatedId: null };
};

export const insertCvBlock = (
  blocks: CvBlock[],
  parentId: string | null,
  newBlock: CvBlock,
  index?: number
): CvBlock[] => {
  if (parentId === null) {
    if (newBlock.kind !== 'section') return blocks;
    const next = blocks.slice();
    next.splice(index ?? next.length, 0, newBlock);
    return next;
  }
  return mapBlocks(blocks, (block: CvBlock): CvBlock => {
    if (block.id !== parentId) return block;
    if (!isCvContainerBlock(block)) return block;
    if (!isCvContainerKindAcceptingChildKind(block.kind, newBlock.kind)) return block;
    const nextChildren = (block.children as CvBlock[]).slice();
    nextChildren.splice(index ?? nextChildren.length, 0, newBlock);
    return replaceContainerChildren(block, nextChildren);
  });
};

export const resolveCvInsertionParent = (
  blocks: CvBlock[],
  selectedBlockId: string | null,
  newKind: CvBlock['kind']
): { parentId: string | null; index: number | undefined } => {
  if (newKind === 'section') return { parentId: null, index: undefined };

  const selectedContext =
    selectedBlockId !== null ? findCvBlockContext(blocks, selectedBlockId) : null;
  if (selectedContext) {
    const { block, parent } = selectedContext;
    if (isCvContainerBlock(block) && isCvContainerKindAcceptingChildKind(block.kind, newKind)) {
      return { parentId: block.id, index: undefined };
    }
    if (parent && isCvContainerKindAcceptingChildKind(parent.kind, newKind)) {
      return { parentId: parent.id, index: selectedContext.index + 1 };
    }
  }

  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (block && isCvContainerBlock(block) && isCvContainerKindAcceptingChildKind(block.kind, newKind)) {
      return { parentId: block.id, index: undefined };
    }
  }
  return { parentId: null, index: undefined };
};
