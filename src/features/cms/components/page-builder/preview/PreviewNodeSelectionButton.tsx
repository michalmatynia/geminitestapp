'use client';

import { MousePointer2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

interface PreviewNodeSelectionButtonProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}

export function PreviewNodeSelectionButton(
  props: PreviewNodeSelectionButtonProps
): React.JSX.Element {
  const { label, selected, onSelect, className } = props;

  return (
    <Button
      type='button'
      variant='outline'
      size='icon'
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.stopPropagation();
        onSelect();
      }}
      className={cn(
        'absolute left-3 top-3 z-10 size-7 rounded-full border-border/40 bg-gray-900/70 p-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:bg-gray-900/90 hover:text-white',
        selected && 'border-blue-400/40 bg-blue-500/20 text-blue-100 opacity-100 hover:bg-blue-500/25',
        className
      )}
    >
      <MousePointer2 className='size-3.5' />
      <span className='sr-only'>{label}</span>
    </Button>
  );
}
