'use client';

import React from 'react';

import { BlockContextProvider } from '@/features/cms/components/page-builder/preview/context/BlockContext';
import type { BlockInstance } from '@/shared/contracts/cms';
import { EmptyState } from '@/shared/ui';
import { cn } from '@/shared/utils';

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

export function PreviewSectionBlocks({
  blocks,
  PreviewBlockItem,
  showEmptyState = true,
  emptyState,
  className,
}: PreviewSectionBlocksProps): React.JSX.Element {
  return (
    <div className={cn('space-y-4', className)}>
      {blocks.length > 0 ? (
        <BlockContextProvider value={{ contained: true }}>
          {blocks.map((block: BlockInstance) => (
            <PreviewBlockItem key={block.id} block={block} />
          ))}
        </BlockContextProvider>
      ) : null}
      {showEmptyState && blocks.length === 0 && emptyState ? (
        <EmptyState
          title={emptyState.title}
          description={emptyState.description}
          variant='compact'
          className={emptyState.className}
        />
      ) : null}
    </div>
  );
}
