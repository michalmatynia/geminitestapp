'use client';

import { Box } from 'lucide-react';
import React from 'react';

import { Alert } from '@/shared/ui/primitives.public';
import { StandardDataTablePanel, PanelHeader } from '@/shared/ui/templates.public';

import { useAsset3DListState } from '../hooks/useAsset3DListState';
import { 
  Asset3DStats, 
  Asset3DListFilters,
  Asset3DListBody
} from '../components/Asset3DListSubcomponents';
import { useAsset3DColumns } from '../hooks/useAsset3DColumns';

export function Asset3DListPage(): React.JSX.Element {
  const state = useAsset3DListState();
  const columns = useAsset3DColumns(state.setPreviewAsset);

  const stats = !state.loading ? (
    <Asset3DStats assetsCount={state.assets.length} isFiltered={state.isFiltered} />
  ) : null;

  return (
    <StandardDataTablePanel
      header={
        <PanelHeader
          title='3D Asset Library'
          description='Browse and preview 3D models and digital twins.'
          icon={<Box className='size-4' />}
          refreshable={true}
          isRefreshing={state.loading}
          onRefresh={state.refetch}
        />
      }
      alerts={state.error !== null ? <Alert variant='error'>{state.error}</Alert> : null}
      filters={
        <Asset3DListFilters
          searchQuery={state.searchQuery}
          setSearchQuery={state.setSearchQuery}
          selectedCategory={state.selectedCategory}
          setSelectedCategory={state.setSelectedCategory}
          selectedTags={state.selectedTags}
          setSelectedTags={state.setSelectedTags}
          categories={state.categories}
          allTags={state.allTags}
          viewMode={state.viewMode}
          setViewMode={state.setViewMode}
        />
      }
      footer={stats}
      columns={columns}
      data={state.assets}
      isLoading={state.loading}
      showTable={state.viewMode === 'list'}
    >
      <Asset3DListBody
        loading={state.loading}
        assets={state.assets}
        isFiltered={state.isFiltered}
        reindexing={state.reindexing}
        handleReindex={state.handleReindex}
        viewMode={state.viewMode}
        pickerItems={state.pickerItems}
        previewAsset={state.previewAsset}
        setPreviewAsset={state.setPreviewAsset}
      />
    </StandardDataTablePanel>
  );
}
