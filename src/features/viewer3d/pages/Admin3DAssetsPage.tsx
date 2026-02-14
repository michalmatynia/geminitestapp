'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Upload,
  Loader2,
  Grid,
  List,
  Filter,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { logClientError } from '@/features/observability/utils/client-error-logger';
import {
  Button,
  
  ListPanel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SelectSimple,
  SearchInput,
  Alert,
  useToast,
  RefreshButton,
  FormSection,
  FormField,
  EmptyState,
} from '@/shared/ui';

import { Asset3DCard } from '../components/Asset3DCard';
import { Asset3DEditModal } from '../components/Asset3DEditModal';
import { Asset3DPreviewModal } from '../components/Asset3DPreviewModal';
import { Asset3DUploader } from '../components/Asset3DUploader';
import { 
  useAssets3D, 
  useAsset3DCategories, 
  useAsset3DTags,
  useDeleteAsset3DMutation,
  useReindexAssets3DMutation,
  asset3dKeys
} from '../hooks/useAsset3dQueries';

import type { Asset3DRecord } from '../types';

type ViewMode = 'grid' | 'list';

export function Admin3DAssetsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showUploader, setShowUploader] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [editAsset, setEditAsset] = useState<Asset3DRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo(
    () => ({
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory && { category: selectedCategory }),
      ...(selectedTags.length > 0 && { tags: selectedTags }),
    }),
    [searchQuery, selectedCategory, selectedTags]
  );

  const assetsQuery = useAssets3D(filters);
  const categoriesQuery = useAsset3DCategories();
  const tagsQuery = useAsset3DTags();
  const deleteMutation = useDeleteAsset3DMutation();
  const reindexMutation = useReindexAssets3DMutation();

  const assets = assetsQuery.data ?? [];
  const loading = assetsQuery.isPending;
  const error = assetsQuery.error instanceof Error ? assetsQuery.error.message : null;
  const categories = categoriesQuery.data ?? [];
  const allTags = tagsQuery.data ?? [];

  const handleUpload = (_asset: Asset3DRecord): void => {
    setShowUploader(false);
    void queryClient.invalidateQueries({ queryKey: asset3dKeys.all });
  };

  const handleEdit = (_updated: Asset3DRecord): void => {
    void queryClient.invalidateQueries({ queryKey: asset3dKeys.all });
  };

  const handleDelete = async (asset: Asset3DRecord): Promise<void> => {
    if (!confirm(`Are you sure you want to delete "${asset.name || asset.filename}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(asset.id);
      toast(`Asset "${asset.name || asset.filename}" deleted.`, { variant: 'success' });
    } catch (err) {
      logClientError(err, { context: { source: 'Admin3DAssetsPage', action: 'deleteAsset', assetId: asset.id } });
      toast(err instanceof Error ? err.message : 'Failed to delete asset', { variant: 'error' });
    }
  };

  const clearFilters = (): void => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedTags([]);
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedTags.length > 0;

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
        Showing {assets.length} asset{assets.length !== 1 ? 's' : ''}
        {hasActiveFilters && ' (filtered)'}
      </div>
    ) : null;

  return (
    <ListPanel
      title='3D Assets'
      description='Upload and manage 3D models with dithering preview'
      refresh={{
        onRefresh: () => void assetsQuery.refetch(),
        isRefreshing: assetsQuery.isFetching,
      }}
      headerActions={
        <Button size='sm' onClick={() => setShowUploader(true)}>
          <Upload className='mr-2 h-4 w-4' />
          Upload Asset
        </Button>
      }
      isLoading={loading}
      loadingMessage='Loading 3D assets...'
      emptyState={
        <EmptyState
          title={hasActiveFilters ? 'No matching assets' : 'No 3D assets yet'}
          description={hasActiveFilters ? 'Try adjusting your filters' : 'Upload your first .glb or .gltf file'}
          icon={<Box className='h-12 w-12 opacity-60' />}
          action={
            !hasActiveFilters ? (
              <div className='mt-4 flex flex-wrap items-center justify-center gap-2'>
                <Button onClick={() => setShowUploader(true)}>
                  <Upload className='mr-2 h-4 w-4' />
                  Upload Asset
                </Button>
                <RefreshButton
                  onRefresh={(): void => {
                    void reindexMutation
                      .mutateAsync()
                      .then((): void => { 
                        toast('Assets reindexed successfully.', { variant: 'success' });
                        void assetsQuery.refetch(); 
                      })
                      .catch((err: unknown): void => {
                        logClientError(err, { context: { source: 'Admin3DAssetsPage', action: 'reindexAssets' } });
                        toast(err instanceof Error ? err.message : 'Failed to reindex assets', { variant: 'error' });
                      });
                  }}
                  isRefreshing={reindexMutation.isPending}
                  label={reindexMutation.isPending ? 'Reindexing...' : 'Reindex local uploads'}
                />
              </div>
            ) : undefined
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
        <div className='flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-3'>
          <SearchInput
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder='Search assets...'
            className='h-8'
            containerClassName='flex-1 min-w-[200px] max-w-md'
          />

          <Button
            variant={showFilters ? 'default' : 'outline'}
            size='sm'
            onClick={() => setShowFilters(!showFilters)}
            className='gap-2'
          >
            <Filter className='h-4 w-4' />
              Filters
            {hasActiveFilters && (
              <span className='ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white'>
                {(selectedCategory ? 1 : 0) + selectedTags.length}
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant='ghost' size='sm' onClick={clearFilters} className='gap-1'>
              <X className='h-4 w-4' />
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
        <FormSection title='Advanced Filters' className='p-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 mt-4'>
            <FormField label='Category'>
              <SelectSimple size='sm'
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
              />
            </FormField>

            <FormField label='Tags'>
              <div className='flex flex-wrap gap-2'>
                {allTags.map((tag: string) => (
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
                {allTags.length === 0 && (
                  <span className='text-sm text-muted-foreground'>No tags available</span>
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
            <Button variant='ghost' size='sm' onClick={() => setShowUploader(false)}>
              Cancel
            </Button>
          )}
          className='p-4'
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

      {assets.length > 0 && viewMode === 'grid' && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {assets.map((asset: Asset3DRecord) => (
            <Asset3DCard
              key={asset.id}
              asset={asset}
              onPreview={setPreviewAsset}
              onEdit={setEditAsset}
              onDelete={(a: Asset3DRecord) => void handleDelete(a)}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === asset.id}
            />
          ))}
        </div>
      )}

      {assets.length > 0 && viewMode === 'list' && (
        <Table className='text-sm text-foreground'>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className='hidden sm:table-cell'>Category</TableHead>
              <TableHead className='hidden md:table-cell'>Tags</TableHead>
              <TableHead className='hidden lg:table-cell'>Size</TableHead>
              <TableHead className='hidden lg:table-cell'>Date</TableHead>
              <TableHead className='w-36 text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset: Asset3DRecord) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <div
                      className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-border bg-muted/40'
                      onClick={() => setPreviewAsset(asset)}
                    >
                      <Box className='h-4 w-4 text-muted-foreground' />
                    </div>
                    <span className='text-sm font-medium text-foreground truncate'>
                      {asset.name || asset.filename}
                    </span>
                  </div>
                </TableCell>
                <TableCell className='hidden sm:table-cell'>
                  {asset.categoryId ? (
                    <span className='rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300'>
                      {asset.categoryId}
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
                  <div className='flex items-center justify-end gap-2'>
                    <Button variant='outline' size='sm' onClick={() => setPreviewAsset(asset)}>
                      Preview
                    </Button>
                    <Button variant='outline' size='sm' onClick={() => setEditAsset(asset)}>
                      Edit
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-red-400 hover:text-red-300'
                      onClick={() => void handleDelete(asset)}
                      disabled={deleteMutation.isPending && deleteMutation.variables === asset.id}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === asset.id ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        'Delete'
                      )}
                    </Button>
                  </div>
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

      {editAsset && (
        <Asset3DEditModal
          open={true}
          onClose={() => setEditAsset(null)}
          asset={editAsset}
          onSave={handleEdit}
          existingCategories={categories}
          existingTags={allTags}
        />
      )}
    </ListPanel>
  );
}
