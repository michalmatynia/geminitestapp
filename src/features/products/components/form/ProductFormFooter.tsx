'use client';

import React, { useCallback } from 'react';

export interface ProductFormFooterProps {
  entityId: string | null;
}

export function ProductFormFooter({ entityId }: ProductFormFooterProps): React.JSX.Element | null {
  const handleCopyProductId = useCallback(async (): Promise<void> => {
    if (!entityId || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(entityId);
    } catch {
      // Ignore clipboard failures to keep form interactions non-blocking.
    }
  }, [entityId]);

  if (!entityId) return null;

  return (
    <button
      type='button'
      className='absolute bottom-0 right-0 text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors'
      title='Click to copy ID'
      onClick={() => {
        void handleCopyProductId();
      }}
    >
      {entityId}
    </button>
  );
}
