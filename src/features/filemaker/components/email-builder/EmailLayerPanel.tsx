'use client';

import React from 'react';

import { useEmailLayerPanel } from './useEmailLayerPanel';
import type { EmailBlock } from './block-model';
import { LayerPanel } from '../shared/LayerPanel';

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
    <LayerPanel
      label='Email layers'
      tree={tree}
      runtime={runtime}
      className={className}
    />
  );
}
