'use client';

import React, { useCallback } from 'react';
import { Button } from '@/shared/ui';

export interface ProductFormFooterProps {
  entityId: string | null;
}

export function ProductFormFooter({ entityId }: ProductFormFooterProps): React.JSX.Element | null {
  const handleCopyProductId = useCallback(async (): Promise<void> => {
    if (!entityId) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(entityId);
      }
    } catch {
      // ignore
    }
  }, [entityId]);

  if (!entityId) return null;

  return (
    <Button
      variant='ghost'
      size='xs'
      className='mt-4 flex w-full items-center justify-center gap-1.5 border-t border-border/40 py-3 text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors h-auto bg-transparent'
      title='Click to copy ID'
      onClick={(): void => {
        void handleCopyProductId();
      }}
    >
      {entityId}
    </Button>
  );
}
