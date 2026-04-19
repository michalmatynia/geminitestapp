'use client';

import { useCallback, type JSX, type KeyboardEvent } from 'react';
import { cn } from '@/shared/utils/ui-utils';
import { Card } from '@/shared/ui/primitives.public';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { useAdmin3DAssetsContext } from '../context/Admin3DAssetsContext';
import { formatAssetDate } from '../utils/formatAssetDate';
import { Asset3DCardHeader, Asset3DCardPreview, Asset3DCardFooter } from './Asset3DCardSubcomponents';

export interface Asset3DCardProps {
  asset: Asset3DRecord;
  className?: string;
}

function useAsset3DCardModel(asset: Asset3DRecord): {
  displayName: string;
  formatDate: (date: string | Date) => string;
  formatFileSize: (bytes: number) => string;
  isDeleting: boolean;
  onDeleteAsset: () => void;
  onEditAsset: () => void;
  onPreviewAsset: () => void;
} {
  const { setPreviewAsset, setEditAsset, handleDelete, isDeleting: checkIsDeleting } = useAdmin3DAssetsContext();

  const isDeleting = checkIsDeleting(asset.id);
  const onPreviewAsset = useCallback((): void => {
    setPreviewAsset(asset);
  }, [setPreviewAsset, asset]);
  const onEditAsset = useCallback((): void => {
    setEditAsset(asset);
  }, [setEditAsset, asset]);
  const onDeleteAsset = useCallback((): void => {
    handleDelete(asset).catch(() => {});
  }, [handleDelete, asset]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getDisplayName = (name: string | undefined | null, filename: string | undefined | null): string => {
    if (name !== undefined && name !== null && name.length > 0) return name.replace(/^\d+-/, '');
    if (filename !== undefined && filename !== null && filename.length > 0) return filename.replace(/^\d+-/, '');
    return '';
  };
  const displayName = getDisplayName(asset.name, asset.filename);

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

export function Asset3DCard({ asset, className }: Asset3DCardProps): JSX.Element {
  const { displayName, formatDate, formatFileSize, isDeleting, onDeleteAsset, onEditAsset, onPreviewAsset } = useAsset3DCardModel(asset);

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
      <Asset3DCardHeader
        displayName={displayName}
        description={asset.description}
        onEdit={onEditAsset}
        onDelete={onDeleteAsset}
        isDeleting={isDeleting}
      />

      <div className='flex h-full flex-col p-3'>
        <Asset3DCardPreview isPublic={Boolean(asset.isPublic)} categoryId={asset.categoryId} />
        <Asset3DCardFooter
          tags={asset.tags ?? []}
          size={asset.size ?? 0}
          createdAt={asset.createdAt}
          formatFileSize={formatFileSize}
          formatDate={formatDate}
        />
      </div>
    </Card>
  );
}
