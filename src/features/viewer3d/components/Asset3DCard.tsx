'use client';

import { Box, Eye, Edit2, Trash2, Globe, Lock } from 'lucide-react';
import { useCallback, type JSX, type MouseEvent } from 'react';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Button, Tag, ResourceCard } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useAdmin3DAssetsContext } from '../context/Admin3DAssetsContext';

export interface Asset3DCardProps {
  asset: Asset3DRecord;
  className?: string;
}

type Asset3DResourceCardProps = {
  asset: Asset3DRecord;
  className?: string;
  isDeleting: boolean;
  onPreviewAsset: () => void;
  onEditAsset: () => void;
  onDeleteAsset: () => void;
};

function Asset3DResourceCard({
  asset,
  className,
  isDeleting,
  onDeleteAsset,
  onEditAsset,
  onPreviewAsset,
}: Asset3DResourceCardProps): JSX.Element {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const displayName = asset.name || (asset.filename || '').replace(/^\d+-/, '');

  return (
    <ResourceCard
      title={displayName}
      description={asset.description ?? ''}
      {...(className ? { className } : {})}
      onClick={onPreviewAsset}
      actions={
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
            title={'Edit asset'}>
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
            title={'Delete asset'}>
            <Trash2 className='h-4 w-4' />
          </Button>
        </div>
      }
      media={
        <div className='h-40 bg-muted/30 p-0 flex items-center justify-center transition-colors group-hover:bg-muted/40'>
          <div className='flex flex-col items-center gap-2 text-muted-foreground group-hover:text-blue-400 transition-colors'>
            <Box className='h-12 w-12' />
            <span className='text-xs flex items-center gap-1'>
              <Eye className='h-3 w-3' />
              Click to preview
            </span>
          </div>
        </div>
      }
      badges={
        <>
          {/* Visibility Badge */}
          <div
            className={cn(
              'absolute top-2 right-2 px-2 py-1 rounded text-xs flex items-center gap-1',
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

          {/* Category Badge */}
          {asset.categoryId && (
            <div className='absolute top-2 left-2 px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-300'>
              {asset.categoryId}
            </div>
          )}
        </>
      }
      footer={
        <div className='text-xs text-muted-foreground'>
          <span>{formatFileSize(asset.size || 0)}</span>
          <span className='mx-1'>•</span>
          <span>{asset.createdAt ? formatDate(asset.createdAt) : ''}</span>
        </div>
      }
    >
      {/* Tags */}
      {(asset.tags || []).length > 0 && (
        <div className='flex flex-wrap gap-1'>
          {(asset.tags || []).slice(0, 3).map((tag: string) => (
            <Tag key={tag} label={tag} className='bg-muted text-muted-foreground' />
          ))}
          {(asset.tags || []).length > 3 && (
            <Tag
              label={`+${(asset.tags || []).length - 3}`}
              className='bg-muted text-muted-foreground'
            />
          )}
        </div>
      )}
    </ResourceCard>
  );
}

export function Asset3DCard({ asset, className }: Asset3DCardProps): JSX.Element {
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

  return (
    <Asset3DResourceCard
      asset={asset}
      className={className}
      isDeleting={isDeleting}
      onPreviewAsset={onPreviewAsset}
      onEditAsset={onEditAsset}
      onDeleteAsset={onDeleteAsset}
    />
  );
}
