import { cn } from '@/shared/utils';

import { Card } from './card';

import type { ReactNode } from 'react';

interface ResourceCardProps {
  title: string;
  description?: string;
  media?: ReactNode; // Top area (Image, Icon, etc.)
  mediaClassName?: string;
  badges?: ReactNode; // Badges to overlay on media
  actions?: ReactNode; // Header actions
  footer?: ReactNode; // Bottom metadata or price
  children?: ReactNode; // Main body content
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'subtle' | 'glass' | 'outline';
}

/**
 * A unified card component for resources like Products, Assets, and Notes.
 * It provides a standardized layout with a top media area, header actions, and a footer.
 * Leverages the base Card component for consistent theme application.
 */
export function ResourceCard(props: ResourceCardProps): React.JSX.Element {
  const {
    title,
    description,
    media,
    mediaClassName,
    badges,
    actions,
    footer,
    children,
    onClick,
    className,
    variant = 'default',
  } = props;

  return (
    <Card
      variant={variant}
      padding='none'
      onClick={onClick}
      className={cn(
        'flex h-full flex-col overflow-hidden',
        onClick && 'cursor-pointer transition-colors hover:border-blue-500/60',
        className
      )}
    >
      {/* Header */}
      <div className='flex items-start justify-between gap-2 p-3 pb-0'>
        <div className='min-w-0 flex-1'>
          <h3 className='text-sm font-medium truncate text-card-foreground' title={title}>
            {title}
          </h3>
          {description && (
            <p className='text-xs text-muted-foreground truncate mt-0.5' title={description}>
              {description}
            </p>
          )}
        </div>
        {actions && <div className='flex-shrink-0 flex items-center gap-1'>{actions}</div>}
      </div>

      <div className='flex h-full flex-col p-3'>
        {/* Media Top Area */}
        {media && (
          <div className={cn('relative overflow-hidden rounded-md', mediaClassName)}>
            {media}
            {/* Overlay Badges */}
            {badges && <div className='absolute inset-0 pointer-events-none p-2'>{badges}</div>}
          </div>
        )}

        {/* Content Body */}
        <div className='flex-1 mt-3'>{children}</div>

        {/* Footer Area */}
        {footer && <div className='mt-3 border-t border-border/40 pt-3'>{footer}</div>}
      </div>
    </Card>
  );
}
