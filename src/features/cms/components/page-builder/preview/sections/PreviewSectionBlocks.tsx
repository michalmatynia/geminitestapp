import React from 'react';

import { BlockContextProvider } from '@/features/cms/components/page-builder/preview/context/BlockContext';
import type { BlockInstance } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';
import { CompactEmptyState } from '@/shared/ui/navigation-and-layout.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { cn } from '@/shared/utils/ui-utils';

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
          {blocks.map((block: BlockInstance) => {
            try {
                return <PreviewBlockItem key={block.id} block={block} />;
            } catch (error) {
                logClientCatch(internalError(`Failed to render block: ${block.id}`), {
                    source: 'cms.preview-blocks',
                    action: 'renderBlockItem',
                    blockId: block.id,
                    blockType: block.type,
                    settings: block.settings,
                    cause: error instanceof Error ? error.message : String(error),
                });
                return null;
            }
          })}
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
