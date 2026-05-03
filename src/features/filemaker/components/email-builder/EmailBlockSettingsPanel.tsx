'use client';

import React, { useCallback } from 'react';

import { Button } from '@/shared/ui/primitives.public';

import { BlockEditor } from './block-editors';
import type { EmailBlock } from './block-model';
import { findBlockContext } from './email-master-tree';
import { removeBlock, updateBlock } from './block-mutations';

interface EmailBlockSettingsPanelProps {
  blocks: EmailBlock[];
  selectedBlockId: string | null;
  onChange: (next: EmailBlock[]) => void;
  onSelectBlock: (blockId: string | null) => void;
  className?: string;
}

type LayoutEmailBlock = Extract<EmailBlock, { kind: 'section' | 'columns' | 'row' }>;
type ContentEmailBlock = Exclude<EmailBlock, LayoutEmailBlock>;

const getLabelOrFallback = (value: string, fallback: string): string =>
  value.trim() !== '' ? value : fallback;

export function EmailBlockSettingsPanel({
  blocks,
  selectedBlockId,
  onChange,
  onSelectBlock,
  className,
}: EmailBlockSettingsPanelProps): React.JSX.Element {
  const selected = selectedBlockId !== null ? findBlockContext(blocks, selectedBlockId) : null;
  const block = selected?.block ?? null;

  const handleUpdate = useCallback(
    (patch: Partial<EmailBlock>): void => {
      if (block === null) return;
      onChange(updateBlock(blocks, block.id, patch));
    },
    [block, blocks, onChange]
  );

  const handleRemove = useCallback((): void => {
    if (block === null) return;
    onChange(removeBlock(blocks, block.id));
    onSelectBlock(null);
  }, [block, blocks, onChange, onSelectBlock]);

  if (block === null) {
    return (
      <div className={className ?? 'rounded-md border border-border/60 bg-card/20 p-4'}>
        <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
          Block settings
        </div>
        <div className='mt-3 text-xs text-gray-500'>
          Select a block in the layer panel to edit its settings.
        </div>
      </div>
    );
  }

  return (
    <div className={className ?? 'rounded-md border border-border/60 bg-card/20 p-4'}>
      <div className='mb-3 flex items-center justify-between'>
        <div>
          <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
            {block.kind}
          </div>
          <div className='text-xs text-gray-200'>{describeSelection(block)}</div>
        </div>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={handleRemove}
          className='h-7 px-2 text-xs text-red-400 hover:text-red-300'
        >
          Delete
        </Button>
      </div>
      <BlockEditor block={block} onUpdate={handleUpdate} />
    </div>
  );
}

const describeLayoutSelection = (block: LayoutEmailBlock): string => {
  switch (block.kind) {
    case 'section': return getLabelOrFallback(block.label, 'Section');
    case 'columns': return `${getLabelOrFallback(block.label, 'Columns')} (${block.children.length})`;
    case 'row': return getLabelOrFallback(block.label, 'Row');
  }
  return 'Block';
};

const describeContentSelection = (block: ContentEmailBlock): string => {
  switch (block.kind) {
    case 'heading': return `Heading: ${block.text}`.slice(0, 60);
    case 'text': return 'Text block';
    case 'image': return getLabelOrFallback(block.alt, 'Image');
    case 'button': return `Button: ${block.label}`;
    case 'divider': return 'Divider';
    case 'spacer': return `Spacer (${block.height}px)`;
  }
  return 'Block';
};

const describeSelection = (block: EmailBlock): string => {
  if (block.kind === 'section' || block.kind === 'columns' || block.kind === 'row') {
    return describeLayoutSelection(block);
  }
  return describeContentSelection(block);
};
