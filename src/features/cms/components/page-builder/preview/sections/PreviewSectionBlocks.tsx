import React from 'react';

import { BlockContextProvider } from '@/features/cms/components/page-builder/preview/context/BlockContext';
import type { BlockInstance } from '@/shared/contracts/cms';
import { CompactEmptyState } from '@/shared/ui';
import { cn } from '@/shared/utils';

const CONTAINED_BLOCK_CONTEXT_VALUE = { contained: true };

interface PreviewSectionBlocksProps {
  blocks: BlockInstance[];
  PreviewBlockItem: React.ComponentType<{ block: BlockInstance }>;
  showEmptyState?: boolean;
  emptyState?: {
    title: string;
    description: string;
    className?: string;
  };
  className?: string;
}

export function PreviewSectionBlocks(props: PreviewSectionBlocksProps): React.JSX.Element {
  const { blocks, PreviewBlockItem, showEmptyState = true, emptyState, className } = props;

  return (
    <div className={cn('space-y-4', className)}>
      {blocks.length > 0 ? (
        <BlockContextProvider value={CONTAINED_BLOCK_CONTEXT_VALUE}>
          {blocks.map((block: BlockInstance) => (
            <PreviewBlockItem key={block.id} block={block} />
          ))}
        </BlockContextProvider>
      ) : null}
      {showEmptyState && blocks.length === 0 && emptyState ? (
        <CompactEmptyState
          title={emptyState.title}
          description={emptyState.description}
          className={emptyState.className}
         />
      ) : null}
    </div>
  );
}
