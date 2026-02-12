'use client';

import {
  Box,
  Loader2,
  RefreshCw,
  Grid,
  List,
  Eye,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Button,
  ListPanel,
  SectionHeader,
  SectionPanel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  UnifiedSelect,
  SearchInput,
  Alert,
  EmptyState,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { Asset3DPreviewModal } from '../components/Asset3DPreviewModal';
import { useAssets3D, useAsset3DCategories, useAsset3DTags, useReindexAssets3DMutation } from '../hooks/useAsset3dQueries';

import type { Asset3DRecord } from '../types';


type ViewMode = 'grid' | 'list';

export function Asset3DListPage(): React.JSX.Element {
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filters = useMemo(
    () => ({
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory && { category: selectedCategory }),
      ...(selectedTags.length > 0 && { tags: selectedTags }),
    }),
    [searchQuery, selectedCategory, selectedTags]
  );

  const assetsQuery = useAssets3D(filters);
  const reindexMutation = useReindexAssets3DMutation();
  const categoriesQuery = useAsset3DCategories();
  const tagsQuery = useAsset3DTags();

  const assets = assetsQuery.data ?? [];
  const loading = assetsQuery.isPending;
  const error = assetsQuery.error instanceof Error ? assetsQuery.error.message : null;
  const categories = categoriesQuery.data ?? [];
  const allTags = tagsQuery.data ?? [];

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

  const stats =
    !loading && assets.length > 0 ? (
      <div className='text-sm text-muted-foreground'>
        {assets.length} asset{assets.length !== 1 ? 's' : ''}
        {searchQuery || selectedCategory || selectedTags.length > 0 ? ' (filtered)' : ''}
      </div>
    ) : null;

  return (
    <ListPanel
      header={
        <SectionHeader
          title='3D Asset Library'
          description='Browse and preview 3D models'
          actions={
            <Button
              variant='outline'
              size='sm'
              onClick={() => void assetsQuery.refetch()}
              disabled={loading}
              className='gap-2'
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          }
        />
      }
      alerts={
        error ? (
          <Alert variant='error'>
            {error}
          </Alert>
        ) : null
      }
      filters={
        <SectionPanel>
          <div className='flex flex-wrap items-center gap-3'>
            <SearchInput
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder='Search assets...'
              className='h-8'
              containerClassName='flex-1 min-w-[200px] max-w-md'
            />

            {categories.length > 0 && (
              <div className='w-[180px]'>
                <UnifiedSelect
                  value={selectedCategory ?? '__all__'}
                  onValueChange={(v: string): void => setSelectedCategory(v === '__all__' ? null : v)}
                  options={[
                    { value: '__all__', label: 'All categories' },
                    ...categories.map((cat: string) => ({
                      value: cat,
                      label: cat,
                    })),
                  ]}
                  placeholder='All categories'
                  triggerClassName='h-8'
                />
              </div>
            )}

            {allTags.length > 0 && (
              <div className='flex flex-wrap gap-2'>
                {allTags.slice(0, 5).map((tag: string) => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    size='sm'
                    onClick={() =>
                      setSelectedTags((prev: string[]) =>
                        prev.includes(tag) ? prev.filter((t: string) => t !== tag) : [...prev, tag]
                      )
                    }
                    className='h-7 px-2 text-xs'
                  >
                    {tag}
                  </Button>
                ))}
              </div>
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
        </SectionPanel>
      }
      footer={stats}
    >
      {loading && (
        <div className='flex items-center justify-center rounded-md border border-dashed border-border py-16 text-muted-foreground'>
          <Loader2 className='h-7 w-7 animate-spin text-blue-400' />
        </div>
      )}

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
                disabled={reindexMutation.isPending}
                onClick={() =>
                  void reindexMutation
                    .mutateAsync()
                    .then(() => assetsQuery.refetch())
                    .catch(() => {})
                }
              >
                {reindexMutation.isPending ? 'Reindexing...' : 'Reindex local uploads'}
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && assets.length > 0 && viewMode === 'grid' && (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
          {assets.map((asset: Asset3DRecord) => (
            <div
              key={asset.id}
              onClick={() => setPreviewAsset(asset)}
              className='group cursor-pointer overflow-hidden rounded-lg border border-border bg-card/60 transition-colors hover:border-blue-500/60'
            >
              <div className='relative flex aspect-square items-center justify-center bg-muted/30'>
                <Box className='h-12 w-12 text-muted-foreground/70' />
                <div className='absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover:opacity-100'>
                  <Eye className='h-7 w-7 text-foreground' />
                </div>
              </div>

              <div className='p-3'>
                <p className='text-sm font-medium text-foreground truncate'>
                  {asset.name || asset.filename}
                </p>
                <div className='mt-2 flex items-center gap-2'>
                  {asset.category && (
                    <span className='rounded bg-blue-500/10 px-1.5 py-0.5 text-xs text-blue-300'>
                      {asset.category}
                    </span>
                  )}
                  <span className='text-xs text-muted-foreground'>
                    {formatFileSize(asset.size)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && assets.length > 0 && viewMode === 'list' && (
        <Table className='text-sm text-foreground'>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className='hidden sm:table-cell'>Category</TableHead>
              <TableHead className='hidden md:table-cell'>Tags</TableHead>
              <TableHead className='hidden lg:table-cell'>Size</TableHead>
              <TableHead className='hidden lg:table-cell'>Date</TableHead>
              <TableHead className='w-24 text-right'>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset: Asset3DRecord) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/40'>
                      <Box className='h-4 w-4 text-muted-foreground' />
                    </div>
                    <span className='text-sm font-medium text-foreground truncate'>
                      {asset.name || asset.filename}
                    </span>
                  </div>
                </TableCell>
                <TableCell className='hidden sm:table-cell'>
                  {asset.category ? (
                    <span className='rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300'>
                      {asset.category}
                    </span>
                  ) : (
                    <span className='text-sm text-muted-foreground'>-</span>
                  )}
                </TableCell>
                <TableCell className='hidden md:table-cell'>
                  <div className='flex flex-wrap gap-1'>
                    {asset.tags.slice(0, 2).map((tag: string) => (
                      <span
                        key={tag}
                        className='rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground'
                      >
                        {tag}
                      </span>
                    ))}
                    {asset.tags.length > 2 && (
                      <span className='text-xs text-muted-foreground'>
                        +{asset.tags.length - 2}
                      </span>
                    )}
                    {asset.tags.length === 0 && (
                      <span className='text-sm text-muted-foreground'>-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className='hidden lg:table-cell text-muted-foreground'>
                  {formatFileSize(asset.size)}
                </TableCell>
                <TableCell className='hidden lg:table-cell text-muted-foreground'>
                  {formatDate(asset.createdAt)}
                </TableCell>
                <TableCell className='text-right'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setPreviewAsset(asset)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {previewAsset && (
        <Asset3DPreviewModal
          open={true}
          onClose={() => setPreviewAsset(null)}
          asset={previewAsset}
        />
      )}
    </ListPanel>
  );
}
