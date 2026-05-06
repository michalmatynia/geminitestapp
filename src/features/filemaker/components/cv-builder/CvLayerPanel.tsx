'use client';

import React from 'react';

import { MasterFolderTreeViewport } from '@/shared/lib/foldertree/public';

import type { CvBlock } from './cv-block-model';
import { useCvLayerPanel } from './useCvLayerPanel';

interface CvLayerPanelProps {
  blocks: CvBlock[];
  onChange: (next: CvBlock[]) => void;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  className?: string;
}

export function CvLayerPanel({
  blocks,
  onChange,
  selectedBlockId,
  onSelectBlock,
  className,
}: CvLayerPanelProps): React.JSX.Element {
  const { tree, runtime } = useCvLayerPanel({
    blocks,
    onChange,
    selectedBlockId,
    onSelectBlock,
  });

  return (
    <div className={className ?? 'flex flex-col gap-2'}>
      <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
        CV layers
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
