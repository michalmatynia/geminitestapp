'use client';

import { Box } from 'lucide-react';
import React from 'react';

import type { GridPickerItem } from '@/shared/contracts/ui/pickers';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { Button, Card } from '@/shared/ui/primitives.public';
import { GenericGridPicker } from '@/shared/ui/templates.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { EmptyState, LoadingState } from '@/shared/ui/navigation-and-layout.public';

import { Asset3DPreviewModal } from './Asset3DPreviewModalImpl';
export { Asset3DListFilters } from './Asset3DListFilters';

export type Asset3DGridItem = GridPickerItem<Asset3DRecord> & {
  value: Asset3DRecord;
};

export function Asset3DGridItemCard({ asset }: { asset: Asset3DRecord }): React.JSX.Element {
  const name = asset.name;
  const filename = asset.filename ?? '';
  const categoryId = asset.categoryId ?? '';
  const displayName = name !== '' ? name : filename;

  return (
    <Card className='group cursor-pointer overflow-hidden bg-card/60 transition-all hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10'>
      <div className='relative flex aspect-square items-center justify-center bg-muted/30'>
        <Box className='h-12 w-12 text-muted-foreground/70' />
        <div className='absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover:opacity-100'>
          <div className='flex flex-col items-center gap-2'>
            <div className='flex size-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg'>
              <Box className='size-5' />
            </div>
            <span className='text-[10px] font-bold uppercase tracking-wider text-blue-400'>
              Preview
            </span>
          </div>
        </div>
      </div>

      <div className='p-3'>
        <p
          className='text-sm font-medium text-foreground truncate'
          title={displayName}
        >
          {displayName}
        </p>
        <div className='mt-2 flex items-center justify-between'>
          {categoryId !== '' ? (
            <StatusBadge
              status={categoryId}
              variant='info'
              size='sm'
              className='font-medium'
            />
          ) : (
            <div />
          )}
          <span className='text-[10px] text-muted-foreground font-medium'>
            {formatFileSize(asset.size ?? 0)}
          </span>
        </div>
      </div>
    </Card>
  );
}

export function Asset3DStats({ assetsCount, isFiltered }: { assetsCount: number; isFiltered: boolean }): React.JSX.Element | null {
  if (assetsCount === 0) return null;
  return (
    <div className='text-xs text-muted-foreground'>
      {assetsCount} asset{assetsCount !== 1 ? 's' : ''}
      {isFiltered ? ' (filtered)' : ''}
    </div>
  );
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

interface Asset3DListEmptyStateProps {
  isFiltered: boolean;
  reindexing: boolean;
  handleReindex: () => Promise<void>;
}

export function Asset3DListEmptyState({
  isFiltered,
  reindexing,
  handleReindex,
}: Asset3DListEmptyStateProps): React.JSX.Element {
  return (
    <EmptyState
      title='No assets found'
      description={
        isFiltered
          ? 'Try adjusting your filters'
          : 'No 3D assets available'
      }
      icon={<Box className='h-12 w-12 opacity-60' />}
      action={
        !isFiltered ? (
          <Button
            variant='outline'
            disabled={reindexing}
            onClick={() => {
              handleReindex().catch(() => {});
            }}
          >
            {reindexing ? 'Reindexing...' : 'Reindex local uploads'}
          </Button>
        ) : undefined
      }
    />
  );
}

interface Asset3DGridContentViewProps {
  items: Asset3DGridItem[];
  onSelect: (item: Asset3DGridItem) => void;
}

export function Asset3DGridContentView({ items, onSelect }: Asset3DGridContentViewProps): React.JSX.Element {
  return (
    <GenericGridPicker<Asset3DGridItem>
      items={items}
      onSelect={onSelect}
      gridClassName='grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      gap='16px'
      renderItem={(item) => <Asset3DGridItemCard asset={item.value} />}
    />
  );
}

interface Asset3DListBodyProps {
  loading: boolean;
  assets: Asset3DRecord[];
  isFiltered: boolean;
  reindexing: boolean;
  handleReindex: () => Promise<void>;
  viewMode: 'grid' | 'list';
  pickerItems: Asset3DGridItem[];
  previewAsset: Asset3DRecord | null;
  setPreviewAsset: (asset: Asset3DRecord | null) => void;
}

export function Asset3DListBody({
  loading,
  assets,
  isFiltered,
  reindexing,
  handleReindex,
  viewMode,
  pickerItems,
  previewAsset,
  setPreviewAsset,
}: Asset3DListBodyProps): React.JSX.Element {
  return (
    <>
      {loading && <LoadingState className='py-16' />}

      {!loading && assets.length === 0 && (
        <Asset3DListEmptyState
          isFiltered={isFiltered}
          reindexing={reindexing}
          handleReindex={handleReindex}
        />
      )}

      {!loading && assets.length > 0 && viewMode === 'grid' && (
        <Asset3DGridContentView
          items={pickerItems}
          onSelect={(item) => setPreviewAsset(item.value)}
        />
      )}

      {previewAsset !== null && (
        <Asset3DPreviewModal
          isOpen={true}
          onClose={() => setPreviewAsset(null)}
          item={previewAsset}
        />
      )}
    </>
  );
}
