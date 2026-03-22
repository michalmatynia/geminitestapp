'use client';

import React from 'react';

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

type TagBadgeProps = {
  label: string;
  color?: string | null;
  className?: string;
  dot: boolean;
  onRemove?: () => void;
  onClick?: () => void;
};

function TagBadge({
  label,
  color,
  className,
  dot,
  onRemove,
  onClick,
}: TagBadgeProps): React.JSX.Element {
  return (
    <Badge
      variant='outline'
      onClick={onClick}
      onRemove={onRemove}
      removeLabel={`Remove ${label}`}
      className={cn(
        'gap-1.5 px-2.5 py-0.5 font-medium transition-colors border-none',
        color ? 'text-white' : 'bg-primary/10 text-primary',
        className
      )}
      style={color ? { backgroundColor: color } : undefined}
      icon={
        dot ? (
          <span className='size-1.5 rounded-full bg-current' aria-hidden='true' />
        ) : undefined
      }
    >
      {label}
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
  return (
    <TagBadge
      label={label}
      color={color}
      className={className}
      dot={dot}
      onRemove={onRemove}
      onClick={onClick}
    />
  );
}
