'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy } from 'lucide-react';

import { Button, useToast } from '@/shared/ui';

export interface ProductFormFooterProps {
  entityId: string | null;
}

export function ProductFormFooter({ entityId }: ProductFormFooterProps): React.JSX.Element | null {
  const { toast } = useToast();
  const [isCopyHighlightActive, setIsCopyHighlightActive] = useState(false);
  const copyHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return (): void => {
      if (copyHighlightTimeoutRef.current) {
        clearTimeout(copyHighlightTimeoutRef.current);
        copyHighlightTimeoutRef.current = null;
      }
    };
  }, []);

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
      setIsCopyHighlightActive(true);
      if (copyHighlightTimeoutRef.current) {
        clearTimeout(copyHighlightTimeoutRef.current);
      }
      copyHighlightTimeoutRef.current = setTimeout(() => {
        setIsCopyHighlightActive(false);
        copyHighlightTimeoutRef.current = null;
      }, 1500);
    } catch {
      toast('Failed to copy product ID.', { variant: 'error' });
    }
  }, [entityId, toast]);

  if (!entityId) return null;

  return (
    <Button
      type='button'
      variant='ghost'
      size='xs'
      className={`absolute bottom-0 right-0 flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-mono transition-colors ${
        isCopyHighlightActive
          ? 'border-muted-foreground/50 bg-muted/70 text-muted-foreground'
          : 'border-transparent bg-transparent text-muted-foreground/70 hover:border-muted-foreground/25 hover:bg-muted/30 hover:text-muted-foreground'
      }`}
      title='Click to copy ID'
      aria-label='Copy product ID'
      aria-pressed={isCopyHighlightActive}
      onClick={(): void => {
        void handleCopyProductId();
      }}
    >
      <span className='font-semibold'>{entityId}</span>
      <Copy className='size-3' aria-hidden='true' />
    </Button>
  );
}
