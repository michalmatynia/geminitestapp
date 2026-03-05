'use client';

import React, { useCallback } from 'react';
import { Copy } from 'lucide-react';

import { Button, useToast } from '@/shared/ui';

export interface ProductFormFooterProps {
  entityId: string | null;
}

export function ProductFormFooter({ entityId }: ProductFormFooterProps): React.JSX.Element | null {
  const { toast } = useToast();

  const handleCopyProductId = useCallback(async (): Promise<void> => {
    if (!entityId) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(entityId);
      } else if (typeof document !== 'undefined') {
        const fallbackInput = document.createElement('textarea');
        fallbackInput.value = entityId;
        fallbackInput.setAttribute('readonly', '');
        fallbackInput.style.position = 'absolute';
        fallbackInput.style.left = '-9999px';
        document.body.appendChild(fallbackInput);
        fallbackInput.select();
        document.execCommand('copy');
        document.body.removeChild(fallbackInput);
      }
      toast('Product ID copied to clipboard.', { variant: 'success' });
    } catch {
      toast('Failed to copy product ID.', { variant: 'error' });
    }
  }, [entityId, toast]);

  if (!entityId) return null;

  return (
    <Button
      variant='ghost'
      size='xs'
      className='absolute bottom-0 right-0 flex items-center gap-1 rounded-none p-0 text-[10px] font-mono text-muted-foreground/70 hover:bg-transparent hover:text-muted-foreground'
      title='Click to copy ID'
      aria-label='Copy product ID'
      onClick={(): void => {
        void handleCopyProductId();
      }}
    >
      <span className='text-muted-foreground/60'>Product ID:</span>
      <span className='font-semibold text-muted-foreground'>{entityId}</span>
      <Copy className='size-3 text-muted-foreground/70' aria-hidden='true' />
    </Button>
  );
}
