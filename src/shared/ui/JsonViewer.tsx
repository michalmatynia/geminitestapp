'use client';

import React, { useMemo } from 'react';

import { cn } from '@/shared/utils';
import { CopyButton } from './copy-button';

interface JsonViewerProps {
  data: unknown;
  title?: string;
  maxHeight?: string | number;
  className?: string;
  showCopy?: boolean;
  expandable?: boolean;
}

/**
 * A standardized component for displaying JSON data, typically for debugging.
 * Handles circular references and includes integrated copy functionality via CopyButton.
 */
export function JsonViewer({
  data,
  title,
  maxHeight = '400px',
  className,
  showCopy = true,
}: JsonViewerProps): React.JSX.Element {
  const formattedJson = useMemo(() => {
    const seen = new WeakSet();
    const circularReplacer = (_key: string, value: unknown): unknown => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    };

    try {
      return JSON.stringify(data, circularReplacer, 2);
    } catch (err) {
      return `Error formatting JSON: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [data]);

  return (
    <div className={cn('relative flex flex-col gap-2 rounded-lg border border-border/60 bg-card/40 p-3', className)}>
      {(title || showCopy) && (
        <div className='flex items-center justify-between gap-2 mb-1'>
          {title ? (
            <h4 className='text-xs font-semibold text-gray-300 uppercase tracking-wider'>{title}</h4>
          ) : <div />}
          {showCopy && (
            <CopyButton
              value={formattedJson}
              variant='ghost'
              size='sm'
              className='h-6 px-2 text-[10px] text-gray-400 hover:text-white hover:bg-white/10'
              showText
            />
          )}
        </div>
      )}
      <pre
        className='overflow-auto rounded bg-black/40 p-2 font-mono text-[11px] text-gray-300'
        style={{ maxHeight }}
      >
        {formattedJson}
      </pre>
    </div>
  );
}
