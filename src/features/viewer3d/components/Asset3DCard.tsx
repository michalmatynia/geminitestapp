'use client';

import { Box, Eye, Edit2, Trash2, Globe, Lock } from 'lucide-react';
import { useCallback, type JSX, type KeyboardEvent, type MouseEvent } from 'react';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Button, Card } from '@/shared/ui/primitives.public';
import { Tag } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

import { useAdmin3DAssetsContext } from '../context/Admin3DAssetsContext';
import { formatAssetDate } from '../utils/formatAssetDate';

export interface Asset3DCardProps {
  asset: Asset3DRecord;
  className?: string;
}

function useAsset3DCardModel(asset: Asset3DRecord) {
  const {
    setPreviewAsset,
    setEditAsset,
    handleDelete,
    isDeleting: checkIsDeleting,
  } = useAdmin3DAssetsContext();

  const isDeleting = checkIsDeleting(asset.id);
  const onPreviewAsset = useCallback((): void => {
    setPreviewAsset(asset);
  }, [setPreviewAsset, asset]);
  const onEditAsset = useCallback((): void => {
    setEditAsset(asset);
  }, [setEditAsset, asset]);
  const onDeleteAsset = useCallback((): void => {
    void handleDelete(asset);
  }, [handleDelete, asset]);
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };
  const displayName = asset.name || (asset.filename || '').replace(/^\d+-/, '');

  return {
    displayName,
    formatDate: formatAssetDate,
    formatFileSize,
    isDeleting,
    onDeleteAsset,
    onEditAsset,
    onPreviewAsset,
  };
}

function renderAsset3DCard(
  { asset, className }: Asset3DCardProps,
  {
    displayName,
    formatDate,
    formatFileSize,
    isDeleting,
    onDeleteAsset,
    onEditAsset,
    onPreviewAsset,
  }: ReturnType<typeof useAsset3DCardModel>
): JSX.Element {
  const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.currentTarget !== event.target) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPreviewAsset();
    }
  };

  return (
    <Card
      variant='default'
      padding='none'
      onClick={onPreviewAsset}
      onKeyDown={onCardKeyDown}
      role='button'
      tabIndex={0}
      aria-label={displayName}
      className={cn(
        'flex h-full cursor-pointer flex-col overflow-hidden transition-colors hover:border-blue-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      <div className='flex items-start justify-between gap-2 p-3 pb-0'>
        <div className='min-w-0 flex-1'>
          <h3 className='truncate text-sm font-medium text-card-foreground' title={displayName}>
            {displayName}
          </h3>
          {asset.description ? (
            <p
              className='mt-0.5 truncate text-xs text-muted-foreground'
              title={asset.description}
            >
              {asset.description}
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
              onEditAsset();
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
              onDeleteAsset();
            }}
            disabled={isDeleting}
            loading={isDeleting}
            title='Delete asset'
          >
            <Trash2 className='h-4 w-4' />
            </Button>
          </div>
      </div>

      <div className='flex h-full flex-col p-3'>
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
                asset.isPublic
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {asset.isPublic ? (
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
            {asset.categoryId ? (
              <div className='absolute top-2 left-2 rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-300'>
                {asset.categoryId}
              </div>
            ) : null}
          </div>
        </div>

        <div className='mt-3 flex-1'>
          {(asset.tags || []).length > 0 ? (
            <div className='flex flex-wrap gap-1'>
              {(asset.tags || []).slice(0, 3).map((tag: string) => (
                <Tag key={tag} label={tag} className='bg-muted text-muted-foreground' />
              ))}
              {(asset.tags || []).length > 3 ? (
                <Tag
                  label={`+${(asset.tags || []).length - 3}`}
                  className='bg-muted text-muted-foreground'
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className='mt-3 border-t border-border/40 pt-3'>
          <div className='text-xs text-muted-foreground'>
            <span>{formatFileSize(asset.size || 0)}</span>
            <span className='mx-1'>•</span>
            <span>{asset.createdAt ? formatDate(asset.createdAt) : ''}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function Asset3DCard(props: Asset3DCardProps): JSX.Element {
  const model = useAsset3DCardModel(props.asset);
  return renderAsset3DCard(props, model);
}
