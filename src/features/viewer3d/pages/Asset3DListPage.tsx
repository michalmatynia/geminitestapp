'use client';

import { Box, Grid, List } from 'lucide-react';
import React, { useMemo } from 'react';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import {
  Button,
  StandardDataTablePanel,
  Alert,
  EmptyState,
  StatusBadge,
  PanelHeader,
  Card,
  FilterPanel,
  LoadingState,
} from '@/shared/ui';

import { Asset3DPreviewModal } from '../components/Asset3DPreviewModalImpl';
import { useAsset3DListState } from '../hooks/useAsset3DListState';

import type { ColumnDef } from '@tanstack/react-table';

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

export function Asset3DListPage(): React.JSX.Element {
  const {
    previewAsset,
    setPreviewAsset,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedTags,
    setSelectedTags,
    assets,
    loading,
    error,
    categories,
    allTags,
    reindexing,
    handleReindex,
    refetch,
  } = useAsset3DListState();

  const columns = useMemo<ColumnDef<Asset3DRecord>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/40'>
              <Box className='h-4 w-4 text-muted-foreground' />
            </div>
            <span className='text-sm font-medium text-foreground truncate'>
              {row.original.name || row.original.filename}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'categoryId',
        header: 'Category',
        cell: ({ row }) =>
          row.original.categoryId ? (
            <StatusBadge
              status={row.original.categoryId}
              variant='info'
              size='sm'
              className='font-medium'
            />
          ) : (
            <span className='text-muted-foreground'>-</span>
          ),
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ row }) => (
          <div className='flex flex-wrap gap-1'>
            {(row.original.tags || []).slice(0, 2).map((tag) => (
              <StatusBadge
                key={tag}
                status={tag}
                variant='neutral'
                size='sm'
                className='font-medium'
              />
            ))}
            {(row.original.tags || []).length > 2 && (
              <StatusBadge
                status={'+' + ((row.original.tags || []).length - 2)}
                variant='neutral'
                size='sm'
                className='font-bold'
              />
            )}
            {(row.original.tags || []).length === 0 && (
              <span className='text-muted-foreground'>-</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => (
          <span className='text-xs text-muted-foreground'>
            {formatFileSize(row.original.size || 0)}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ row }) => (
          <span className='text-xs text-muted-foreground'>
            {row.original.createdAt ? formatDate(row.original.createdAt) : ''}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Action</div>,
        cell: ({ row }) => (
          <div className='text-right'>
            <Button variant='outline' size='xs' onClick={() => setPreviewAsset(row.original)}>
              View
            </Button>
          </div>
        ),
      },
    ],
    [setPreviewAsset]
  );

  const stats =
    !loading && assets.length > 0 ? (
      <div className='text-xs text-muted-foreground'>
        {assets.length} asset{assets.length !== 1 ? 's' : ''}
        {searchQuery || selectedCategory || selectedTags.length > 0 ? ' (filtered)' : ''}
      </div>
    ) : null;

  const searchConfig = useMemo(
    () => ({
      value: searchQuery,
      onChange: (val: string) => setSearchQuery(val),
      placeholder: 'Search assets...',
    }),
    [searchQuery, setSearchQuery]
  );

  return (
    <StandardDataTablePanel
      header={
        <PanelHeader
          title='3D Asset Library'
          description='Browse and preview 3D models and digital twins.'
          icon={<Box className='size-4' />}
          refreshable={true}
          isRefreshing={loading}
          onRefresh={refetch}
        />
      }
      alerts={error ? <Alert variant='error'>{error}</Alert> : null}
      filters={
        <div className='space-y-3'>
          <FilterPanel
            search={searchConfig.value}
            onSearchChange={searchConfig.onChange}
            searchPlaceholder={searchConfig.placeholder}
            values={{
              category: selectedCategory ?? '__all__',
            }}
            onFilterChange={(key, val) => {
              if (key === 'category') {
                setSelectedCategory(val === '__all__' ? null : (val as string));
              }
            }}
            filters={[
              ...(categories.length > 0
                ? [
                    {
                      key: 'category',
                      label: 'Category',
                      type: 'select' as const,
                      options: [
                        { value: '__all__', label: 'All categories' },
                        ...categories.map((cat: string) => ({ value: cat, label: cat })),
                      ],
                      width: '180px',
                    },
                  ]
                : []),
            ]}
            headerAction={
              <div className='flex items-center overflow-hidden rounded-md border border-border bg-muted/20'>
                {' '}
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size='icon'
                  className='h-8 w-8 rounded-none'
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className='h-4 w-4' />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size='icon'
                  className='h-8 w-8 rounded-none'
                  onClick={() => setViewMode('list')}
                >
                  <List className='h-4 w-4' />
                </Button>
              </div>
            }
          />
          {allTags.length > 0 && (
            <div className='flex flex-wrap gap-2 pt-2'>
              {allTags.slice(0, 5).map((tag) => (
                <Button
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  size='xs'
                  onClick={() =>
                    setSelectedTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )
                  }
                  className='h-7 px-2 text-[10px]'
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>
      }
      footer={stats}
      columns={columns}
      data={assets}
      isLoading={loading}
    >
      {loading && <LoadingState className='py-16' />}

      {!loading && assets.length === 0 && (
        <EmptyState
          title='No assets found'
          description={
            searchQuery || selectedCategory || selectedTags.length > 0
              ? 'Try adjusting your filters'
              : 'No 3D assets available'
          }
          icon={<Box className='h-12 w-12 opacity-60' />}
          action={
            !searchQuery && !selectedCategory && selectedTags.length === 0 ? (
              <Button
                variant='outline'
                disabled={reindexing}
                onClick={() => {
                  void handleReindex();
                }}
              >
                {reindexing ? 'Reindexing...' : 'Reindex local uploads'}
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && assets.length > 0 && viewMode === 'grid' && (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
          {assets.map((asset) => (
            <Card
              key={asset.id}
              onClick={() => setPreviewAsset(asset)}
              className='group cursor-pointer overflow-hidden bg-card/60 transition-all hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10'
            >
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
                  title={asset.name || asset.filename}
                >
                  {asset.name || asset.filename}
                </p>
                <div className='mt-2 flex items-center justify-between'>
                  {asset.categoryId ? (
                    <StatusBadge
                      status={asset.categoryId}
                      variant='info'
                      size='sm'
                      className='font-medium'
                    />
                  ) : (
                    <div />
                  )}
                  <span className='text-[10px] text-muted-foreground font-medium'>
                    {formatFileSize(asset.size || 0)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && assets.length > 0 && viewMode === 'list' && null}

      {previewAsset && (
        <Asset3DPreviewModal
          isOpen={true}
          onClose={() => setPreviewAsset(null)}
          item={previewAsset}
        />
      )}
    </StandardDataTablePanel>
  );
}
