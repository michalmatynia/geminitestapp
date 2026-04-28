'use client';

import React from 'react';

import { FolderTreeViewportV2 } from '@/shared/lib/foldertree/public';

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
  const { controller, runtime } = useCvLayerPanel({
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
      <FolderTreeViewportV2
        controller={controller}
        enableDnd
        emptyLabel='Add a section to start.'
        rootDropUi={{ enabled: true, label: 'Drop CV section here' }}
        runtime={runtime}
      />
    </div>
  );
}
