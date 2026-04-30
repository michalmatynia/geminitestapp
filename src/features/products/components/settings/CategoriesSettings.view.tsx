'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import { FolderTreeViewportV2 } from '@/shared/lib/foldertree/public';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { CompactEmptyState, EmptyState } from '@/shared/ui/empty-state';
import { FolderTreePanel } from '@/shared/ui/FolderTreePanel';
import { SelectSimple } from '@/shared/ui/select-simple';
import { Skeleton } from '@/shared/ui/skeleton';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';

import { CategoryForm } from './CategoryForm';
import { CategoryFormProvider } from './CategoryFormContext';
import { CategoryTreeNodeRenderer } from './CategoryTreeNodeRenderer';
import { CategoryTreeNodeRuntimeProvider } from './CategoryTreeNodeRuntimeContext';
import { getDeleteCategoryMessage } from './CategoriesSettings.helpers';
import type { CategoriesSettingsController } from './CategoriesSettings.controller';

const CatalogSelector = ({ controller }: { controller: CategoriesSettingsController }): React.JSX.Element => (
  <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
    <p className='text-sm font-semibold text-white mb-3'>Select Catalog</p>
    <p className='text-xs text-gray-400 mb-3'>
      Each catalog has its own category tree. Select a catalog to manage its categories.
    </p>
    <div className='w-full max-w-xs'>
      <SelectSimple
        size='sm'
        value={controller.context.selectedCategoryCatalogId ?? ''}
        onValueChange={controller.context.onCategoryCatalogChange}
        options={controller.catalogOptions}
        placeholder='Select a catalog...'
        ariaLabel='Catalog'
        title='Select a catalog...'
      />
    </div>
  </Card>
);

const CategoryTreeSkeleton = (): React.JSX.Element => (
  <div className='space-y-2 p-4'>
    <Skeleton className='h-8 w-full' />
    <Skeleton className='h-8 w-full' />
    <Skeleton className='h-8 w-full' />
  </div>
);

const CategoryTreeEmpty = ({ controller }: { controller: CategoriesSettingsController }): React.JSX.Element => (
  <EmptyState
    title='No categories yet'
    description='Categories help you organize products into a hierarchical tree.'
    action={
      <Button onClick={(): void => controller.actions.handleOpenCreateModal(null)} variant='outline'>
        <Plus className='size-4 mr-2' />
        Add Category
      </Button>
    }
  />
);

const CategoryTreePanelContent = ({
  controller,
}: {
  controller: CategoriesSettingsController;
}): React.JSX.Element => (
  <FolderTreePanel
    className='relative rounded-md border border-border bg-gray-900 p-2'
    bodyClassName='space-y-0.5'
    masterInstance='product_categories'
  >
    <div className='mb-2 flex items-center justify-end'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-7 px-2 text-xs'
        onClick={(): void => controller.treeShell.setPanelCollapsed(!controller.treeShell.panelCollapsed)}
        title={controller.treeShell.panelCollapsed ? 'Show category tree' : 'Collapse category tree'}
        aria-expanded={!controller.treeShell.panelCollapsed}
      >
        {controller.treeShell.panelCollapsed ? (
          <>
            <ChevronRight className='mr-1 size-3.5 -scale-x-100' aria-hidden='true' />
            Show Tree
          </>
        ) : (
          <>
            <ChevronLeft className='mr-1 size-3.5' aria-hidden='true' />
            Collapse
          </>
        )}
      </Button>
    </div>
    {controller.treeShell.panelCollapsed ? (
      <CompactEmptyState
        title='Tree Collapsed'
        description='Category tree is collapsed.'
        className='bg-card/30 border-dashed border-border/70 py-4'
      />
    ) : (
      <CategoryTreeNodeRuntimeProvider value={controller.treeShell.runtimeValue}>
        <FolderTreeViewportV2
          controller={controller.treeShell.controller}
          className='space-y-0.5'
          rootDropUi={controller.treeShell.rootDropUi}
          canStartDrag={controller.treeShell.canStartCategoryDrag}
          resolveDropPosition={controller.treeShell.resolveCategoryDropPosition}
          renderNode={(nodeProps) => <CategoryTreeNodeRenderer {...nodeProps} />}
        />
      </CategoryTreeNodeRuntimeProvider>
    )}
  </FolderTreePanel>
);

const CategoryTreeContent = ({ controller }: { controller: CategoriesSettingsController }): React.JSX.Element => {
  if (controller.context.loadingCategories && controller.derived.treeData.length === 0) {
    return <CategoryTreeSkeleton />;
  }
  if (controller.derived.treeData.length === 0) {
    return <CategoryTreeEmpty controller={controller} />;
  }
  return <CategoryTreePanelContent controller={controller} />;
};

const CategoryTreeSection = ({ controller }: { controller: CategoriesSettingsController }): React.JSX.Element | null => {
  if (controller.context.selectedCategoryCatalogId === null) return null;
  return (
    <>
      <div className='flex justify-start'>
        <Button
          onClick={(): void => controller.actions.handleOpenCreateModal(null)}
          variant='solid'
          className='flex items-center gap-2'
        >
          <Plus className='size-4' />
          Add Category
        </Button>
      </div>
      <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
        <p className='text-sm font-semibold text-white mb-4'>
          Category Tree for &quot;{controller.selectedCatalog?.name}&quot;
        </p>
        <CategoryTreeContent controller={controller} />
      </Card>
    </>
  );
};

const NoCatalogsEmptyState = ({ controller }: { controller: CategoriesSettingsController }): React.JSX.Element | null =>
  controller.context.selectedCategoryCatalogId === null && controller.context.catalogs.length === 0 ? (
    <EmptyState
      title='No catalogs found'
      description='Please create a catalog first in the Catalogs section before adding categories.'
    />
  ) : null;

const CategoryDeleteConfirm = ({ controller }: { controller: CategoriesSettingsController }): React.JSX.Element => (
  <ConfirmModal
    isOpen={controller.categoryToDelete !== null}
    onClose={() => controller.setCategoryToDelete(null)}
    onConfirm={controller.actions.handleConfirmDelete}
    title='Delete Category'
    message={getDeleteCategoryMessage(controller.categoryToDelete)}
    confirmText='Delete'
    isDangerous={true}
  />
);

const CategoryFormSection = ({ controller }: { controller: CategoriesSettingsController }): React.JSX.Element => (
  <CategoryFormProvider
    value={{
      open: controller.showModal,
      onClose: controller.actions.closeModal,
      isEditing: controller.editingCategory !== null,
      formData: controller.formData,
      onFormDataChange: controller.setFormData,
      onSave: (): void => {
        void controller.actions.handleSave();
      },
      saving: controller.actions.saveCategoryPending,
      catalogs: controller.context.catalogs,
      onCatalogChange: controller.setModalCatalogId,
      parentOptions: controller.derived.parentOptions,
      loadingCategories: controller.derived.modalLoadingCategories,
      modalCatalogName: controller.modalCatalog?.name,
    }}
  >
    <CategoryForm />
  </CategoryFormProvider>
);

export const CategoriesSettingsView = ({
  controller,
}: {
  controller: CategoriesSettingsController;
}): React.JSX.Element => (
  <>
    <div className='space-y-5'>
      <CatalogSelector controller={controller} />
      <CategoryTreeSection controller={controller} />
    </div>
    <NoCatalogsEmptyState controller={controller} />
    <CategoryDeleteConfirm controller={controller} />
    <CategoryFormSection controller={controller} />
  </>
);
