'use client';

import React, { useMemo } from 'react';

import { Button } from '@/shared/ui/primitives.public';

import {
  createCvBlock,
  isCvContainerBlock,
  isCvContainerKindAcceptingChildKind,
  type CvBlock,
  type CvBlockKind,
  type CvContainerBlock,
} from './cv-block-model';
import { insertCvBlock, resolveCvInsertionParent } from './cv-block-mutations';
import { findCvBlockContext } from './cv-master-tree';

interface CvBlockPickerProps {
  blocks: CvBlock[];
  selectedBlockId: string | null;
  onChange: (next: CvBlock[]) => void;
  onSelectBlock: (blockId: string | null) => void;
  className?: string;
}

const PALETTE: Array<{ kind: CvBlockKind; label: string }> = [
  { kind: 'section', label: 'Section' },
  { kind: 'stack', label: 'Stack' },
  { kind: 'columns', label: 'Columns' },
  { kind: 'row', label: 'Row' },
  { kind: 'profileHeader', label: 'Header' },
  { kind: 'summary', label: 'Summary' },
  { kind: 'experience', label: 'Experience' },
  { kind: 'education', label: 'Education' },
  { kind: 'skills', label: 'Skills' },
  { kind: 'techStack', label: 'Tech stack' },
  { kind: 'languages', label: 'Languages' },
  { kind: 'customText', label: 'Text' },
  { kind: 'divider', label: 'Divider' },
  { kind: 'spacer', label: 'Spacer' },
];

const isInsertable = (
  blocks: CvBlock[],
  selectedBlockId: string | null,
  kind: CvBlockKind
): boolean => {
  if (kind === 'section') return true;
  const selected = selectedBlockId !== null ? findCvBlockContext(blocks, selectedBlockId) : null;
  const targets: CvContainerBlock[] = [];
  if (selected) {
    if (isCvContainerBlock(selected.block)) targets.push(selected.block);
    if (selected.parent) targets.push(selected.parent);
  }
  blocks.forEach((block: CvBlock): void => {
    if (isCvContainerBlock(block)) targets.push(block);
  });
  return targets.some((container: CvContainerBlock): boolean =>
    isCvContainerKindAcceptingChildKind(container.kind, kind)
  );
};

export function CvBlockPicker({
  blocks,
  selectedBlockId,
  onChange,
  onSelectBlock,
  className,
}: CvBlockPickerProps): React.JSX.Element {
  const enabledKinds = useMemo<Set<CvBlockKind>>(() => {
    const set = new Set<CvBlockKind>();
    PALETTE.forEach((entry): void => {
      if (isInsertable(blocks, selectedBlockId, entry.kind)) set.add(entry.kind);
    });
    return set;
  }, [blocks, selectedBlockId]);

  const handleAdd = (kind: CvBlockKind): void => {
    const newBlock = createCvBlock(kind);
    const { parentId, index } = resolveCvInsertionParent(blocks, selectedBlockId, kind);
    const next = insertCvBlock(blocks, parentId, newBlock, index);
    if (next === blocks) return;
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
            onClick={(): void => {
              handleAdd(entry.kind);
            }}
            className='h-7 text-[11px]'
            title={enabledKinds.has(entry.kind) ? `Add ${entry.label}` : `${entry.label} cannot be inserted here`}
          >
            + {entry.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
