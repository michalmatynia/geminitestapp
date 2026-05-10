'use client';

import React from 'react';
import { MasterFolderTreeViewport } from '@/shared/lib/foldertree/public';

interface LayerPanelProps {
  label: string;
  tree: any;
  runtime: any;
  className?: string;
}

export function LayerPanel({
  label,
  tree,
  runtime,
  className,
}: LayerPanelProps): React.JSX.Element {
  return (
    <div className={className ?? 'flex flex-col gap-2'}>
      <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
        {label}
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
