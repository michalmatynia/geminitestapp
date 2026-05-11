'use client';

import React from 'react';

import { useCvLayerPanel } from './useCvLayerPanel';
import type { CvBlock } from './cv-block-model';
import { LayerPanel } from '../shared/LayerPanel';

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
    <LayerPanel
      label='CV layers'
      tree={tree}
      runtime={runtime}
      className={className}
    />
  );
}
