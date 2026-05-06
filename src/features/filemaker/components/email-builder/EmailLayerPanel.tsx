'use client';

import React from 'react';

import { MasterFolderTreeViewport } from '@/shared/lib/foldertree/public';
import type { EmailBlock } from './block-model';
import { useEmailLayerPanel } from './useEmailLayerPanel';

interface EmailLayerPanelProps {
  blocks: EmailBlock[];
  onChange: (next: EmailBlock[]) => void;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  className?: string;
}

export function EmailLayerPanel({
  blocks,
  onChange,
  selectedBlockId,
  onSelectBlock,
  className,
}: EmailLayerPanelProps): React.JSX.Element {
  const { tree, runtime } = useEmailLayerPanel({
    blocks,
    onChange,
    selectedBlockId,
    onSelectBlock,
  });

  return (
    <div className={className ?? 'flex flex-col gap-2'}>
      <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
        Email layers
      </div>
      <MasterFolderTreeViewport
        tree={tree}
        enableDnd
        emptyLabel='Add a section to start.'
        runtime={runtime}
      />
    </div>
  );
}
