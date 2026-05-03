'use client';

import { Box, Eye, Edit2, Trash2, Globe, Lock } from 'lucide-react';
import type { JSX, MouseEvent } from 'react';

import { Button } from '@/shared/ui/primitives.public';
import { Tag } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

interface Asset3DCardHeaderProps {
  displayName: string;
  description?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function Asset3DCardHeader({
  displayName,
  description,
  onEdit,
  onDelete,
  isDeleting,
}: Asset3DCardHeaderProps): JSX.Element {
  return (
    <div className='flex items-start justify-between gap-2 p-3 pb-0'>
      <div className='min-w-0 flex-1'>
        <h3 className='truncate text-sm font-medium text-card-foreground' title={displayName}>
          {displayName}
        </h3>
        {description !== undefined && description !== null && description !== '' ? (
          <p className='mt-0.5 truncate text-xs text-muted-foreground' title={description}>
            {description}
          </p>
        ) : null}
      </div>
      <div className='flex items-center gap-1'>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-muted-foreground hover:text-blue-400'
          aria-label='Edit asset'
          onClick={(e: MouseEvent): void => {
            e.stopPropagation();
            onEdit();
          }}
          title='Edit asset'
        >
          <Edit2 className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-muted-foreground hover:text-red-400'
          aria-label='Delete asset'
          onClick={(e: MouseEvent): void => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          loading={isDeleting}
          title='Delete asset'
        >
          <Trash2 className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}

interface Asset3DCardPreviewProps {
  isPublic: boolean;
  categoryId?: string | null;
}

export function Asset3DCardPreview({ isPublic, categoryId }: Asset3DCardPreviewProps): JSX.Element {
  return (
    <div className='relative overflow-hidden rounded-md'>
      <div className='flex h-40 items-center justify-center bg-muted/30 p-0 transition-colors group-hover:bg-muted/40'>
        <div className='flex flex-col items-center gap-2 text-muted-foreground transition-colors group-hover:text-blue-400'>
          <Box className='h-12 w-12' />
          <span className='flex items-center gap-1 text-xs'>
            <Eye className='h-3 w-3' />
            Click to preview
          </span>
        </div>
      </div>
      <div className='pointer-events-none absolute inset-0 p-2'>
        <div
          className={cn(
            'absolute top-2 right-2 flex items-center gap-1 rounded px-2 py-1 text-xs',
            isPublic ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'
          )}
        >
          {isPublic ? (
            <>
              <Globe className='h-3 w-3' />
              Public
            </>
          ) : (
            <>
              <Lock className='h-3 w-3' />
              Private
            </>
          )}
        </div>
        {categoryId !== undefined && categoryId !== null && categoryId !== '' ? (
          <div className='absolute top-2 left-2 rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-300'>
            {categoryId}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface Asset3DCardFooterProps {
  tags: string[];
  size: number;
  createdAt?: string | Date | null;
  formatFileSize: (bytes: number) => string;
  formatDate: (date: string | Date) => string;
}

export function Asset3DCardFooter({
  tags,
  size,
  createdAt,
  formatFileSize,
  formatDate,
}: Asset3DCardFooterProps): JSX.Element {
  return (
    <div className='mt-3 flex h-full flex-col'>
      <div className='mt-3 flex-1'>
        {tags.length > 0 ? (
          <div className='flex flex-wrap gap-1'>
            {tags.slice(0, 3).map((tag: string) => (
              <Tag key={tag} label={tag} className='bg-muted text-muted-foreground' />
            ))}
            {tags.length > 3 ? (
              <Tag label={`+${tags.length - 3}`} className='bg-muted text-muted-foreground' />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className='mt-3 border-t border-border/40 pt-3'>
        <div className='text-xs text-muted-foreground'>
          <span>{formatFileSize(size)}</span>
          <span className='mx-1'>•</span>
          <span>{createdAt !== undefined && createdAt !== null ? formatDate(createdAt) : ''}</span>
        </div>
      </div>
    </div>
  );
}
