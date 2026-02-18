'use client';

import {
  Box,
  Upload,
  Grid,
  List,
  Filter,
  X,
  RefreshCw
} from 'lucide-react';
import React, { useMemo } from 'react';

import {
  Button,
  ListPanel,
  DataTable,
  SelectSimple,
  SearchInput,
  Alert,
  FormSection,
  FormField,
  EmptyState,
  StatusBadge,
  PanelHeader,
  Badge,
  ActionMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  LoadingState,
} from '@/shared/ui';

import { Asset3DCard } from '../components/Asset3DCard';
import { Asset3DEditModal } from '../components/Asset3DEditModal';
import { Asset3DPreviewModal } from '../components/Asset3DPreviewModal';
import { Asset3DUploader } from '../components/Asset3DUploader';
import { useAdmin3DAssetsState } from '../hooks/useAdmin3DAssetsState';

import type { Asset3DRecord } from '../types';
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

export function Admin3DAssetsPage(): React.JSX.Element {
  const {
    showUploader, setShowUploader,
    previewAsset, setPreviewAsset,
    editAsset, setEditAsset,
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    selectedTags, setSelectedTags,
    showFilters, setShowFilters,
    assets,
    loading,
    error,
    categories,
    allTags,
    handleUpload,
    handleEdit,
    handleDelete,
    handleReindex,
    clearFilters,
    hasActiveFilters,
    ConfirmationModal,
    isDeleting,
    isReindexing,
    refetch,
    isFetching,
  } = useAdmin3DAssetsState();

  const columns = useMemo<ColumnDef<Asset3DRecord>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <div
            className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-border bg-muted/40 hover:bg-muted/60 transition-colors'
            onClick={() => setPreviewAsset(row.original)}
          >
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
      cell: ({ row }) => row.original.categoryId ? (
        <StatusBadge status={row.original.categoryId} variant='info' size='sm' className='font-medium' />
      ) : <span className='text-muted-foreground'>-</span>,
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <div className='flex flex-wrap gap-1'>
          {row.original.tags.slice(0, 2).map((tag) => (
            <StatusBadge key={tag} status={tag} variant='neutral' size='sm' className='font-medium' />
          ))}
          {row.original.tags.length > 2 && (
            <StatusBadge status={'+' + (row.original.tags.length - 2)} variant='neutral' size='sm' className='font-bold' />
          )}
          {row.original.tags.length === 0 && <span className='text-muted-foreground'>-</span>}
        </div>
      ),
    },
    {
      accessorKey: 'size',
      header: 'Size',
      cell: ({ row }) => <span className='text-xs text-muted-foreground'>{formatFileSize(row.original.size)}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => <span className='text-xs text-muted-foreground'>{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => (
        <div className='flex justify-end'>
          <ActionMenu ariaLabel={`Actions for asset ${row.original.name || row.original.filename}`}>
            <DropdownMenuItem
              onSelect={(event: Event): void => {
                event.preventDefault();
                setPreviewAsset(row.original);
              }}
            >
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event: Event): void => {
                event.preventDefault();
                setEditAsset(row.original);
              }}
            >
              Edit Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-destructive focus:text-destructive'
              onSelect={(event: Event): void => {
                event.preventDefault();
                void handleDelete(row.original);
              }}
              disabled={isDeleting(row.original.id)}
            >
              {isDeleting(row.original.id) ? 'Deleting...' : 'Delete'}
            </DropdownMenuItem>
          </ActionMenu>
        </div>
      ),
    },
  ], [setPreviewAsset, setEditAsset, handleDelete, isDeleting]);

  const stats = !loading && assets.length > 0 ? (
    <div className='text-xs text-muted-foreground font-medium'>
      Showing {assets.length} asset{assets.length !== 1 ? 's' : ''}
      {hasActiveFilters && ' (filtered)'}
    </div>
  ) : null;

  return (
    <ListPanel
      header={
        <PanelHeader
          title='3D Asset Manager'
          description='Centralized repository for 3D models and digital twins.'
          icon={<Box className='size-4' />}
          refreshable={true}
          isRefreshing={isFetching}
          onRefresh={refetch}
          actions={[
            {
              key: 'upload',
              label: 'Upload Asset',
              icon: <Upload className='size-3.5' />,
              onClick: () => setShowUploader(true),
            }
          ]}
        />
      }
      alerts={error ? <Alert variant='error'>{error}</Alert> : null}
      filters={
        <div className='flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-3'>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder='Search assets...'
            size='sm'
            containerClassName='flex-1 min-w-[200px] max-w-md'
          />

          <Button
            variant={showFilters ? 'default' : 'outline'}
            size='sm'
            onClick={() => setShowFilters(!showFilters)}
            className='gap-2 h-8 text-xs'
          >
            <Filter className='h-3.5 w-3.5' />
              Filters
            {hasActiveFilters && (
              <Badge
                variant='active'
                className='ml-1 flex h-4 w-4 items-center justify-center p-0 text-[9px] font-bold'
              >
                {(selectedCategory ? 1 : 0) + selectedTags.length}
              </Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant='ghost' size='sm' onClick={clearFilters} className='gap-1 h-8 text-xs'>
              <X className='h-3.5 w-3.5' />
                Clear
            </Button>
          )}

          <div className='ml-auto flex items-center overflow-hidden rounded-md border border-border bg-muted/20'>
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
        </div>
      }
      footer={stats}
    >
      {showFilters && (
        <FormSection 
          variant='subtle' 
          className='p-4 mb-4 border border-border/40'
        >
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <FormField label='Category'>
              <SelectSimple 
                size='sm'
                value={selectedCategory ?? '__all__'}
                onValueChange={(v) => setSelectedCategory(v === '__all__' ? null : v)}
                options={[
                  { value: '__all__', label: 'All categories' },
                  ...categories.map((cat) => ({ value: cat, label: cat })),
                ]}
                placeholder='All categories'
              />
            </FormField>

            <FormField label='Tags'>
              <div className='flex flex-wrap gap-2 pt-1'>
                {allTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    size='xs'
                    onClick={() =>
                      setSelectedTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
                    className='h-6 px-2 text-[10px]'
                  >
                    {tag}
                  </Button>
                ))}
                {allTags.length === 0 && (
                  <span className='text-xs text-muted-foreground italic'>No tags available</span>
                )}
              </div>
            </FormField>
          </div>
        </FormSection>
      )}

      {showUploader && (
        <FormSection
          title='Upload 3D Asset'
          actions={(
            <Button variant='ghost' size='sm' onClick={() => setShowUploader(false)} className='h-7 text-xs'>
              Cancel
            </Button>
          )}
          className='p-4 mb-6'
          variant='glass'
        >
          <div className='mt-4'>
            <Asset3DUploader
              onUpload={handleUpload}
              onCancel={() => setShowUploader(false)}
              existingCategories={categories}
              existingTags={allTags}
            />
          </div>
        </FormSection>
      )}

      {loading && (
        <LoadingState message='Loading 3D assets...' className='rounded-md border border-dashed border-border py-16' />
      )}

      {!loading && assets.length === 0 && (
        <EmptyState
          title={hasActiveFilters ? 'No matching assets' : 'Library is empty'}
          description={hasActiveFilters ? 'Try adjusting your filters.' : 'Upload your first .glb or .gltf file to get started.'}
          icon={<Box className='h-12 w-12 opacity-60' />}
          action={
            !hasActiveFilters ? (
              <div className='mt-4 flex flex-wrap items-center justify-center gap-2'>
                <Button onClick={() => setShowUploader(true)} size='sm'>
                  <Upload className='mr-2 h-4 w-4' />
                  Upload Asset
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => { void handleReindex(); }}
                  disabled={isReindexing}
                >
                  <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
                  {isReindexing ? 'Reindexing...' : 'Reindex Local Files'}
                </Button>
              </div>
            ) : undefined
          }
        />
      )}

      {!loading && assets.length > 0 && viewMode === 'grid' && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {assets.map((asset) => (
            <Asset3DCard
              key={asset.id}
              asset={asset}
              onPreview={setPreviewAsset}
              onEdit={setEditAsset}
              onDelete={(a) => void handleDelete(a)}
              isDeleting={isDeleting(asset.id)}
            />
          ))}
        </div>
      )}

      {!loading && assets.length > 0 && viewMode === 'list' && (
        <div className='rounded-md border border-border bg-gray-950/20'>
          <DataTable
            columns={columns}
            data={assets}
          />
        </div>
      )}

      {previewAsset && (
        <Asset3DPreviewModal
          isOpen={true}
          onClose={() => setPreviewAsset(null)}
          item={previewAsset}
        />
      )}

      {editAsset && (
        <Asset3DEditModal
          isOpen={true}
          onClose={() => setEditAsset(null)}
          item={editAsset}
          onSave={handleEdit}
          existingCategories={categories}
          existingTags={allTags}
        />
      )}

      <ConfirmationModal />
    </ListPanel>
  );
}
