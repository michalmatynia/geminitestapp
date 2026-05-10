'use client';

import React from 'react';

import { BlockPicker } from '../shared/BlockPicker';
import {
  createEmailBlock,
  isContainerKindAcceptingChildKind,
  isEmailContainerBlock,
  type EmailBlock,
  type EmailBlockKind,
  type EmailContainerBlock,
} from './block-model';
import { findBlockContext } from './email-master-tree';
import { insertBlock, resolveInsertionParent } from './block-mutations';

interface EmailBlockPickerProps {
  blocks: EmailBlock[];
  selectedBlockId: string | null;
  onChange: (next: EmailBlock[]) => void;
  onSelectBlock: (blockId: string | null) => void;
  className?: string;
}

const PALETTE: Array<{ kind: EmailBlockKind; label: string }> = [
  { kind: 'section', label: 'Section' },
  { kind: 'columns', label: 'Columns' },
  { kind: 'row', label: 'Row' },
  { kind: 'heading', label: 'Heading' },
  { kind: 'text', label: 'Text' },
  { kind: 'image', label: 'Image' },
  { kind: 'button', label: 'Button' },
  { kind: 'divider', label: 'Divider' },
  { kind: 'spacer', label: 'Spacer' },
];

const isInsertable = (
  blocks: EmailBlock[],
  selectedBlockId: string | null,
  kind: EmailBlockKind
): boolean => {
  if (kind === 'section') return true;
  const selected = selectedBlockId !== null ? findBlockContext(blocks, selectedBlockId) : null;
  const targets: EmailContainerBlock[] = [];
  if (selected !== null) {
    if (isEmailContainerBlock(selected.block)) targets.push(selected.block);
    if (selected.parent) targets.push(selected.parent);
  }
  blocks.forEach((block: EmailBlock) => {
    if (isEmailContainerBlock(block)) targets.push(block);
  });
  return targets.some((container: EmailContainerBlock) =>
    isContainerKindAcceptingChildKind(container.kind, kind)
  );
};

export function EmailBlockPicker(props: EmailBlockPickerProps): React.JSX.Element {
  return (
    <BlockPicker
      {...props}
      palette={PALETTE}
      isInsertable={isInsertable}
      createBlock={createEmailBlock}
      resolveInsertionParent={resolveInsertionParent}
      insertBlock={insertBlock}
    />
  );
}
