'use client';

import React, { useCallback } from 'react';

import { Button } from '@/shared/ui/primitives.public';

import type { CvBlock } from './cv-block-model';
import { duplicateCvBlock, removeCvBlock, updateCvBlock } from './cv-block-mutations';
import { CvBlockEditor } from './cv-block-editors';
import { findCvBlockContext } from './cv-master-tree';

interface CvBlockSettingsPanelProps {
  blocks: CvBlock[];
  selectedBlockId: string | null;
  onChange: (next: CvBlock[]) => void;
  onSelectBlock: (blockId: string | null) => void;
  className?: string;
}

const fallbackText = (value: string, fallback: string): string => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

const describeContainerSelection = (block: CvBlock): string | null => {
  switch (block.kind) {
    case 'section': return fallbackText(block.label, 'Section');
    case 'stack': return `${fallbackText(block.label, 'Stack')} (${block.children.length})`;
    case 'columns': return `${fallbackText(block.label, 'Columns')} (${block.children.length})`;
    case 'row': return fallbackText(block.label, 'Row');
    default: return null;
  }
};

const describeNamedLeafSelection = (block: CvBlock): string | null => {
  switch (block.kind) {
    case 'profileHeader': return fallbackText(block.name, 'Profile header');
    case 'experience': return fallbackText(block.title, 'Experience');
    case 'education': return fallbackText(block.institution, 'Education');
    case 'skills': return fallbackText(block.label, 'Skills');
    case 'techStack': return fallbackText(block.label, 'Tech stack');
    case 'languages': return fallbackText(block.label, 'Languages');
    case 'customText': return fallbackText(block.label, 'Custom text');
    default: return null;
  }
};

const describeStaticLeafSelection = (block: CvBlock): string | null => {
  switch (block.kind) {
    case 'summary': return 'Summary';
    case 'divider': return 'Divider';
    case 'spacer': return `Spacer (${block.height}px)`;
    default: return null;
  }
};

const describeSelection = (block: CvBlock): string => {
  const containerDescription = describeContainerSelection(block);
  if (containerDescription !== null) return containerDescription;
  const namedDescription = describeNamedLeafSelection(block);
  if (namedDescription !== null) return namedDescription;
  return describeStaticLeafSelection(block) ?? 'Block';
};

function EmptyBlockSettingsPanel({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <div className={className ?? 'rounded-md border border-border/60 bg-card/20 p-4'}>
      <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
        Block settings
      </div>
      <div className='mt-3 text-xs text-gray-500'>
        Select a CV block in the layer panel to edit its settings.
      </div>
    </div>
  );
}

function BlockSettingsHeader({
  block,
  onDuplicate,
  onRemove,
}: {
  block: CvBlock;
  onDuplicate: () => void;
  onRemove: () => void;
}): React.JSX.Element {
  return (
    <div className='mb-3 flex items-center justify-between gap-3'>
      <div className='min-w-0'>
        <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
          {block.kind}
        </div>
        <div className='truncate text-xs text-gray-200'>{describeSelection(block)}</div>
      </div>
      <div className='flex shrink-0 items-center gap-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={onDuplicate}
          className='h-7 px-2 text-xs text-gray-300 hover:text-white'
        >
          Duplicate
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={onRemove}
          className='h-7 px-2 text-xs text-red-400 hover:text-red-300'
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

export function CvBlockSettingsPanel({
  blocks,
  selectedBlockId,
  onChange,
  onSelectBlock,
  className,
}: CvBlockSettingsPanelProps): React.JSX.Element {
  const selected = selectedBlockId !== null ? findCvBlockContext(blocks, selectedBlockId) : null;
  const block = selected?.block ?? null;

  const handleUpdate = useCallback(
    (patch: Partial<CvBlock>): void => {
      if (!block) return;
      onChange(updateCvBlock(blocks, block.id, patch));
    },
    [block, blocks, onChange]
  );

  const handleRemove = useCallback((): void => {
    if (!block) return;
    onChange(removeCvBlock(blocks, block.id));
    onSelectBlock(null);
  }, [block, blocks, onChange, onSelectBlock]);

  const handleDuplicate = useCallback((): void => {
    if (!block) return;
    const result = duplicateCvBlock(blocks, block.id);
    onChange(result.blocks);
    onSelectBlock(result.duplicatedId);
  }, [block, blocks, onChange, onSelectBlock]);

  if (!block) {
    return <EmptyBlockSettingsPanel className={className} />;
  }

  return (
    <div className={className ?? 'rounded-md border border-border/60 bg-card/20 p-4'}>
      <BlockSettingsHeader
        block={block}
        onDuplicate={handleDuplicate}
        onRemove={handleRemove}
      />
      <CvBlockEditor block={block} onUpdate={handleUpdate} />
    </div>
  );
}
