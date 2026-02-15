'use client';

import React, { useState } from 'react';

import { Viewer3D } from '@/features/viewer3d';
import { Asset3DPreviewModal } from '@/features/viewer3d';
import { useAssets3D, useAsset3DCategories, useAsset3DTags } from '@/features/viewer3d/hooks/useAsset3dQueries';
import type { Asset3DListFilters, Asset3DRecord } from '@/features/viewer3d/types';
import { Input, SelectSimple, Checkbox, Button, AppModal, FormSection } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { EntityModalProps } from '@/shared/types/modal-props';

interface Asset3DPickerModalProps extends EntityModalProps<Asset3DRecord, Asset3DRecord> {
  onSelect: (assetId: string) => void;
}

export function Asset3DPickerModal({
  isOpen,
  onClose,
  onSelect,
}: Asset3DPickerModalProps): React.JSX.Element | null {
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('__all__');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPublicOnly, setIsPublicOnly] = useState<boolean>(false);

  const filters: Asset3DListFilters = {
    search: search.trim() || null,
    categoryId: category === '__all__' ? null : category,
    tags: selectedTags.length > 0 ? selectedTags : [],
    ...(isPublicOnly ? { isPublic: true } : {}),
  };
  const assetsQuery = useAssets3D(filters);
  const categoriesQuery = useAsset3DCategories();
  const tagsQuery = useAsset3DTags();

  const assets = assetsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];

  if (!isOpen) return null;

  return (
    <>
      <AppModal open={isOpen} onClose={onClose} title='Select 3D asset' size='xl'>
        <div className='space-y-4 text-sm text-gray-200'>
          <div className='grid gap-2 md:grid-cols-[1fr_200px_200px]'>
            <Input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder='Search assets...'
              className='h-9'
            />
            <SelectSimple size='sm'
              value={category}
              onValueChange={(value: string) => setCategory(value)}
              options={[
                { value: '__all__', label: 'All categories' },
                ...categories.map((cat: string) => ({ value: cat, label: cat }))
              ]}
              placeholder='Category'
              triggerClassName='h-9'
            />
            <div className='flex items-center gap-2'>
              <Checkbox
                checked={isPublicOnly}
                onCheckedChange={(value: boolean | 'indeterminate'): void => setIsPublicOnly(Boolean(value))}
              />
              <span className='text-xs text-gray-300'>Public only</span>
            </div>
          </div>

          {tags.length > 0 ? (
            <FormSection title='Tags' variant='subtle' className='p-2'>
              <div className='mt-2 flex flex-wrap gap-2'>
                {tags.map((tag: string) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type='button'
                      className={cn(
                        'rounded-full border px-2 py-1 text-[11px]',
                        active
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                          : 'border-border/60 text-gray-300 hover:border-emerald-500/40'
                      )}
                      onClick={() => {
                        setSelectedTags((prev: string[]) =>
                          prev.includes(tag) ? prev.filter((t: string) => t !== tag) : [...prev, tag]
                        );
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </FormSection>
          ) : null}

          <div className='grid gap-3 md:grid-cols-[1fr_320px]'>
            <div className='space-y-2'>
              {assetsQuery.isLoading ? (
                <div className='text-xs text-gray-400'>Loading assets...</div>
              ) : assets.length === 0 ? (
                <div className='text-xs text-gray-400'>No 3D assets found.</div>
              ) : (
                <div className='space-y-2'>
                  {assets.map((asset: Asset3DRecord) => (
                    <FormSection key={asset.id} variant='subtle' className='p-2'>
                      <div className='flex items-center justify-between gap-2'>
                        <div className='min-w-0'>
                          <div className='truncate text-sm text-gray-100'>{asset.name || asset.filename}</div>
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
      </AppModal>

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
