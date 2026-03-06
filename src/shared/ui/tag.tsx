'use client';

import React, { useMemo } from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { cn } from '@/shared/utils';
import { Badge } from './badge';

interface TagProps {
  label: string;
  color?: string | null;
  className?: string;
  dot?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}

type TagRuntimeValue = {
  label: string;
  color?: string | null;
  className?: string;
  dot: boolean;
  onRemove?: () => void;
  onClick?: () => void;
};

const { Context: TagRuntimeContext, useStrictContext: useTagRuntime } =
  createStrictContext<TagRuntimeValue>({
    hookName: 'useTagRuntime',
    providerName: 'TagRuntimeProvider',
    displayName: 'TagRuntimeContext',
  });

function TagBadge(): React.JSX.Element {
  const runtime = useTagRuntime();
  return (
    <Badge
      variant='outline'
      onClick={runtime.onClick}
      onRemove={runtime.onRemove}
      removeLabel={`Remove ${runtime.label}`}
      className={cn(
        'gap-1.5 px-2.5 py-0.5 font-medium transition-colors border-none',
        runtime.color ? 'text-white' : 'bg-primary/10 text-primary',
        runtime.className
      )}
      style={runtime.color ? { backgroundColor: runtime.color } : undefined}
      icon={
        runtime.dot ? (
          <span className='size-1.5 rounded-full bg-current' aria-hidden='true' />
        ) : undefined
      }
    >
      {runtime.label}
    </Badge>
  );
}

/**
 * Tag - A specialized badge typically used for categorization or metadata.
 * Leverages the shared Badge component for consistent styling and logic.
 */
export function Tag({
  label,
  color,
  className,
  dot = false,
  onRemove,
  onClick,
}: TagProps): React.JSX.Element {
  const runtimeValue = useMemo<TagRuntimeValue>(
    () => ({
      label,
      color,
      className,
      dot,
      onRemove,
      onClick,
    }),
    [label, color, className, dot, onRemove, onClick]
  );

  return (
    <TagRuntimeContext.Provider value={runtimeValue}>
      <TagBadge />
    </TagRuntimeContext.Provider>
  );
}
