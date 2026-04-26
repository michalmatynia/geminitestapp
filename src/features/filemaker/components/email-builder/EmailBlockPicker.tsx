'use client';

import React, { useMemo } from 'react';

import { Button } from '@/shared/ui/primitives.public';

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
  const selected = selectedBlockId ? findBlockContext(blocks, selectedBlockId) : null;
  const targets: EmailContainerBlock[] = [];
  if (selected) {
    if (isEmailContainerBlock(selected.block)) targets.push(selected.block);
    if (selected.parent) targets.push(selected.parent);
  }
  // Fallback: any root-level container.
  blocks.forEach((block: EmailBlock) => {
    if (isEmailContainerBlock(block)) targets.push(block);
  });
  return targets.some((container: EmailContainerBlock) =>
    isContainerKindAcceptingChildKind(container.kind, kind)
  );
};

export function EmailBlockPicker({
  blocks,
  selectedBlockId,
  onChange,
  onSelectBlock,
  className,
}: EmailBlockPickerProps): React.JSX.Element {
  const enabledKinds = useMemo<Set<EmailBlockKind>>(() => {
    const set = new Set<EmailBlockKind>();
    PALETTE.forEach((entry) => {
      if (isInsertable(blocks, selectedBlockId, entry.kind)) set.add(entry.kind);
    });
    return set;
  }, [blocks, selectedBlockId]);

  const handleAdd = (kind: EmailBlockKind): void => {
    const newBlock = createEmailBlock(kind);
    const { parentId, index } = resolveInsertionParent(blocks, selectedBlockId, kind);
    const next = insertBlock(blocks, parentId, newBlock, index);
    if (next === blocks) return; // insertion was rejected
    onChange(next);
    onSelectBlock(newBlock.id);
  };

  return (
    <div className={className ?? 'flex flex-col gap-1'}>
      <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>Insert</div>
      <div className='flex flex-wrap gap-1'>
        {PALETTE.map((entry) => (
          <Button
            key={entry.kind}
            type='button'
            variant='outline'
            size='sm'
            disabled={!enabledKinds.has(entry.kind)}
            onClick={(): void => { handleAdd(entry.kind); }}
            className='h-7 text-[11px]'
            title={enabledKinds.has(entry.kind) ? `Add ${entry.label}` : `${entry.label} cannot be inserted here`}
          >
            ＋ {entry.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
