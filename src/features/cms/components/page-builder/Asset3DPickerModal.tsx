'use client';

import React, { useState, useMemo } from 'react';

import { Viewer3D } from '@/shared/lib/viewer3d';
import { Asset3DPreviewModal } from '@/shared/lib/viewer3d';
import {
  useAssets3D,
  useAsset3DCategories,
  useAsset3DTags,
} from '@/shared/lib/viewer3d/hooks/useAsset3dQueries';
import type { EntityModalProps } from '@/shared/contracts/ui';
import type { Asset3DListFilters, Asset3DRecord } from '@/shared/contracts/viewer3d';
import { FilterPanel, Button, FormSection, EmptyState } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';
import type { FilterField } from '@/shared/ui/templates/panels';

interface Asset3DPickerModalProps extends EntityModalProps<Asset3DRecord, Asset3DRecord> {
  onSelect: (assetId: string) => void;
}

export function Asset3DPickerModal({
  isOpen,
  onClose,
  onSelect,
}: Asset3DPickerModalProps): React.JSX.Element | null {
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '__all__',
    tags: [] as string[],
    isPublicOnly: false,
  });

  const categoriesQuery = useAsset3DCategories();
  const tagsQuery = useAsset3DTags();

  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];

  const filterConfig = useMemo<FilterField[]>(
    () => [
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { value: '__all__', label: 'All categories' },
          ...categories.map((cat: string) => ({ value: cat, label: cat })),
        ],
      },
      {
        key: 'tags',
        label: 'Tags',
        type: 'select',
        multi: true,
        options: tags.map((tag: string) => ({ value: tag, label: tag })),
      },
      {
        key: 'isPublicOnly',
        label: 'Public only',
        type: 'checkbox',
      },
    ],
    [categories, tags]
  );

  const apiFilters: Asset3DListFilters = {
    search: filters.search.trim() || undefined,
    categoryId: filters.category === '__all__' ? undefined : filters.category,
    tags: filters.tags,
    ...(filters.isPublicOnly ? { isPublic: true } : {}),
  };
  const assetsQuery = useAssets3D(apiFilters);
  const assets = assetsQuery.data ?? [];

  const handleFilterChange = (key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      search: '',
      category: '__all__',
      tags: [],
      isPublicOnly: false,
    });
  };

  return (
    <>
      <DetailModal
        isOpen={isOpen}
        onClose={onClose}
        title='Select 3D asset'
        size='xl'
        footer={null}
      >
        <div className='space-y-4 text-sm text-gray-200'>
          <FilterPanel
            filters={filterConfig}
            values={filters}
            search={filters.search}
            searchPlaceholder='Search assets...'
            onFilterChange={handleFilterChange}
            onSearchChange={(search) => handleFilterChange('search', search)}
            onReset={handleReset}
            showHeader={false}
            compact
          />

          <div className='grid gap-3 md:grid-cols-[1fr_320px]'>
            <div className='space-y-2'>
              {assetsQuery.isLoading ? (
                <div className='text-xs text-gray-400'>Loading assets...</div>
              ) : assets.length === 0 ? (
                <EmptyState
                  title='No 3D assets found'
                  description='Try adjusting your filters or upload new assets in the 3D Viewer admin.'
                  variant='compact'
                  className='py-12'
                />
              ) : (
                <div className='space-y-2'>
                  {assets.map((asset: Asset3DRecord) => (
                    <FormSection key={asset.id} variant='subtle' className='p-2'>
                      <div className='flex items-center justify-between gap-2'>
                        <div className='min-w-0'>
                          <div className='truncate text-sm text-gray-100'>
                            {asset.name || asset.filename}
                          </div>
                          <div className='text-[11px] text-gray-400'>
                            {asset.categoryId ? `${asset.categoryId} • ` : ''}
                            {asset.tags?.length ? asset.tags.join(', ') : 'No tags'}
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            onClick={() => setPreviewAsset(asset)}
                          >
                            Preview
                          </Button>
                          <Button
                            type='button'
                            size='sm'
                            onClick={() => {
                              onSelect(asset.id);
                              onClose();
                            }}
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    </FormSection>
                  ))}
                </div>
              )}
            </div>
            <FormSection title='Preview' variant='subtle' className='p-2'>
              {previewAsset ? (
                <div className='mt-2 h-56'>
                  <Viewer3D
                    modelUrl={`/api/assets3d/${previewAsset.id}/file`}
                    backgroundColor='#111827'
                    autoRotate
                    autoRotateSpeed={2}
                    environment='studio'
                    lighting='studio'
                    lightIntensity={1}
                    enableShadows
                    enableBloom={false}
                    bloomIntensity={0.5}
                    exposure={1}
                    showGround={false}
                    enableContactShadows
                    enableVignette={false}
                    autoFit
                    presentationMode={false}
                    className='h-full w-full'
                  />
                </div>
              ) : (
                <div className='mt-2 text-xs text-gray-500'>Pick an asset to preview.</div>
              )}
            </FormSection>
          </div>
        </div>
      </DetailModal>

      {previewAsset ? (
        <Asset3DPreviewModal
          isOpen={Boolean(previewAsset)}
          onClose={() => setPreviewAsset(null)}
          item={previewAsset}
        />
      ) : null}
    </>
  );
}
