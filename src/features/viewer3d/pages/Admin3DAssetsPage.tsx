'use client';

import { Box, Upload } from 'lucide-react';
import React, { useMemo } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Button, Alert } from '@/shared/ui/primitives.public';
import { StandardDataTablePanel, PanelHeader } from '@/shared/ui/templates.public';
import { SelectSimple, FormSection, FormField } from '@/shared/ui/forms-and-actions.public';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';

import { Asset3DCard } from '../components/Asset3DCard';
import { Asset3DEditModal } from '../components/Asset3DEditModalImpl';
import { Asset3DPreviewModal } from '../components/Asset3DPreviewModalImpl';
import { Asset3DUploader } from '../components/Asset3DUploader';
import { Admin3DAssetsProvider, useAdmin3DAssetsContext } from '../context/Admin3DAssetsContext';
import { useAdmin3DAssetsColumns } from './admin-3d-assets/Admin3DAssetsColumns';
import { Admin3DAssetsFilters, Admin3DAssetsEmptyState } from './admin-3d-assets/Admin3DAssetsSubcomponents';

const ALL_CATEGORIES_OPTION: LabeledOptionDto<string> = {
  value: '__all__',
  label: 'All categories',
};

function Admin3DAssetsContent(): React.JSX.Element {
  const state = useAdmin3DAssetsContext();
  const columns = useAdmin3DAssetsColumns({
    setPreviewAsset: state.setPreviewAsset,
    setEditAsset: state.setEditAsset,
    handleDelete: state.handleDelete,
    isDeleting: state.isDeleting,
  });

  const stats =
    !state.loading && state.assets.length > 0 ? (
      <div className='text-xs text-muted-foreground font-medium'>
        Showing {state.assets.length} asset{state.assets.length !== 1 ? 's' : ''}
        {state.hasActiveFilters && ' (filtered)'}
      </div>
    ) : null;

  const categoryOptions = useMemo(
    (): Array<LabeledOptionDto<string>> => [
      ALL_CATEGORIES_OPTION,
      ...state.categories.map((cat) => ({ value: cat, label: cat })),
    ],
    [state.categories]
  );

  return (
    <StandardDataTablePanel
      header={
        <PanelHeader
          title='3D Asset Manager'
          description='Centralized repository for 3D models and digital twins.'
          icon={<Box className='size-4' />}
          refreshable={true}
          isRefreshing={state.isFetching}
          onRefresh={state.refetch}
          actions={[
            {
              key: 'upload',
              label: 'Upload Asset',
              icon: <Upload className='size-3.5' />,
              onClick: () => state.setShowUploader(true),
            },
          ]}
        />
      }
      alerts={state.error !== null && state.error !== '' ? <Alert variant='error'>{state.error}</Alert> : null}
      filters={
        <Admin3DAssetsFilters
          searchQuery={state.searchQuery}
          setSearchQuery={state.setSearchQuery}
          showFilters={state.showFilters}
          setShowFilters={state.setShowFilters}
          hasActiveFilters={state.hasActiveFilters}
          selectedCategory={state.selectedCategory}
          selectedTags={state.selectedTags}
          clearFilters={state.clearFilters}
          viewMode={state.viewMode}
          setViewMode={state.setViewMode}
        />
      }
      footer={stats}
      columns={columns}
      data={state.assets}
      isLoading={state.loading}
    >
      {state.showFilters && (
        <FormSection variant='subtle' className='p-4 mb-4 border border-border/40'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <FormField label='Category'>
              <SelectSimple
                size='sm'
                value={state.selectedCategory ?? '__all__'}
                onValueChange={(v) => state.setSelectedCategory(v === '__all__' ? null : v)}
                options={categoryOptions}
                placeholder='All categories'
               ariaLabel='All categories' title='All categories'/>
            </FormField>

            <FormField label='Tags'>
              <div className='flex flex-wrap gap-2 pt-1'>
                {state.allTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={state.selectedTags.includes(tag) ? 'default' : 'outline'}
                    size='xs'
                    onClick={() =>
                      state.setSelectedTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
                    className='h-6 px-2 text-[10px]'
                  >
                    {tag}
                  </Button>
                ))}
                {state.allTags.length === 0 && (
                  <span className='text-xs text-muted-foreground italic'>No tags available</span>
                )}
              </div>
            </FormField>
          </div>
        </FormSection>
      )}

      {state.showUploader && (
        <FormSection
          title='Upload 3D Asset'
          actions={
            <Button
              variant='ghost'
              size='sm'
              onClick={() => state.setShowUploader(false)}
              className='h-7 text-xs'
            >
              Cancel
            </Button>
          }
          className='p-4 mb-6'
          variant='glass'
        >
          <div className='mt-4'>
            <Asset3DUploader />
          </div>
        </FormSection>
      )}

      {!state.loading && state.assets.length === 0 && (
        <EmptyState
          title={state.hasActiveFilters ? 'No matching assets' : 'Library is empty'}
          description={
            state.hasActiveFilters
              ? 'Try adjusting your filters.'
              : 'Upload your first .glb or .gltf file to get started.'
          }
          icon={<Box className='h-12 w-12 opacity-60' />}
          action={
            <Admin3DAssetsEmptyState
              hasActiveFilters={state.hasActiveFilters}
              setShowUploader={state.setShowUploader}
              handleReindex={() => { void state.handleReindex(); }}
              isReindexing={state.isReindexing}
            />
          }
        />
      )}

      {!state.loading && state.assets.length > 0 && state.viewMode === 'grid' && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {state.assets.map((asset) => (
            <Asset3DCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      {!state.loading && state.assets.length > 0 && state.viewMode === 'list' && null}

      {state.previewAsset && (
        <Asset3DPreviewModal
          isOpen={true}
          onClose={() => state.setPreviewAsset(null)}
          item={state.previewAsset}
        />
      )}

      {state.editAsset && (
        <Asset3DEditModal isOpen={true} onClose={() => state.setEditAsset(null)} item={state.editAsset} />
      )}

      <state.ConfirmationModal />
    </StandardDataTablePanel>
  );
}

export function Admin3DAssetsPage(): React.JSX.Element {
  return (
    <Admin3DAssetsProvider>
      <Admin3DAssetsContent />
    </Admin3DAssetsProvider>
  );
}
