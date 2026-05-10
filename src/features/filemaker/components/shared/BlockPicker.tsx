'use client';

import React, { useMemo } from 'react';
import { Button } from '@/shared/ui/primitives.public';

interface BlockPickerProps<T, K extends string> {
  blocks: T[];
  selectedBlockId: string | null;
  onChange: (next: T[]) => void;
  onSelectBlock: (blockId: string | null) => void;
  palette: Array<{ kind: K; label: string }>;
  isInsertable: (blocks: T[], selectedBlockId: string | null, kind: K) => boolean;
  createBlock: (kind: K) => T;
  resolveInsertionParent: (blocks: T[], selectedBlockId: string | null, kind: K) => { parentId: string | null; index: number };
  insertBlock: (blocks: T[], parentId: string | null, newBlock: T, index: number) => T[];
  className?: string;
}

export function BlockPicker<T extends { id: string }, K extends string>({
  blocks,
  selectedBlockId,
  onChange,
  onSelectBlock,
  palette,
  isInsertable,
  createBlock,
  resolveInsertionParent,
  insertBlock,
  className,
}: BlockPickerProps<T, K>): React.JSX.Element {
  const enabledKinds = useMemo(() => {
    const set = new Set<K>();
    palette.forEach((entry) => {
      if (isInsertable(blocks, selectedBlockId, entry.kind)) set.add(entry.kind);
    });
    return set;
  }, [blocks, selectedBlockId, palette, isInsertable]);

  const handleAdd = (kind: K): void => {
    const newBlock = createBlock(kind);
    const { parentId, index } = resolveInsertionParent(blocks, selectedBlockId, kind);
    const next = insertBlock(blocks, parentId, newBlock, index);
    if (next === blocks) return;
    onChange(next);
    onSelectBlock(newBlock.id);
  };

  return (
    <div className={className ?? 'flex flex-col gap-1'}>
      <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>Insert</div>
      <div className='flex flex-wrap gap-1'>
        {palette.map((entry) => (
          <Button
            key={entry.kind}
            type='button'
            variant='outline'
            size='sm'
            disabled={!enabledKinds.has(entry.kind)}
            onClick={(): void => handleAdd(entry.kind)}
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
