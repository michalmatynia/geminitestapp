import { Plus } from 'lucide-react';
import { useState, useCallback } from 'react';

import { logClientError } from '@/features/observability';
import { useSaveTagMutation, useDeleteTagMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { Catalog, ProductTag } from '@/features/products/types';
import { useToast, Button, SelectSimple, Input, FormModal, EmptyState, Tag as UiTag, FormSection, FormField, SimpleSettingsList } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { useProductSettingsContext } from './ProductSettingsContext';

type TagFormData = {
  name: string;
  color: string;
  catalogId: string;
};

export function TagsSettings(): React.JSX.Element {
  const {
    loadingTags: loading,
    tags,
    catalogs,
    selectedTagCatalogId: selectedCatalogId,
    onTagCatalogChange: onCatalogChange,
    onRefreshTags: onRefresh,
  } = useProductSettingsContext();

  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<ProductTag | null>(null);
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    color: '#38bdf8',
    catalogId: '',
  });
  const [tagToDelete, setTagToDelete] = useState<ProductTag | null>(null);

  const saveTagMutation = useSaveTagMutation();
  const deleteTagMutation = useDeleteTagMutation();

  const openCreateModal = (): void => {
    if (!selectedCatalogId) {
      toast('Please select a catalog first.', { variant: 'error' });
      return;
    }
    setEditingTag(null);
    setFormData({
      name: '',
      color: '#38bdf8',
      catalogId: selectedCatalogId,
    });
    setShowModal(true);
  };

  const openEditModal = (tag: ProductTag): void => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color ?? '#38bdf8',
      catalogId: tag.catalogId,
    });
    setShowModal(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!formData.name.trim()) {
      toast('Tag name is required.', { variant: 'error' });
      return;
    }
    if (!formData.catalogId) {
      toast('Catalog is required.', { variant: 'error' });
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        color: formData.color.trim() || null,
        catalogId: formData.catalogId,
      };

      await saveTagMutation.mutateAsync({
        id: editingTag?.id,
        data: payload,
      });

      toast(editingTag ? 'Tag updated.' : 'Tag created.', {
        variant: 'success',
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      logClientError(error, { context: { source: 'TagsSettings', action: 'saveTag', tagId: editingTag?.id } });
      const message =
        error instanceof Error ? error.message : 'Failed to save tag.';
      toast(message, { variant: 'error' });
    }
  };

  const handleDelete = useCallback((tag: ProductTag): void => {
    setTagToDelete(tag);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!tagToDelete) return;
    try {
      await deleteTagMutation.mutateAsync({ id: tagToDelete.id, catalogId: selectedCatalogId });
      toast('Tag deleted.', { variant: 'success' });
      onRefresh();
    } catch (error) {
      logClientError(error, { context: { source: 'TagsSettings', action: 'deleteTag', tagId: tagToDelete.id } });
      const message =
        error instanceof Error ? error.message : 'Failed to delete tag.';
      toast(message, { variant: 'error' });
    } finally {
      setTagToDelete(null);
    }
  };

  const selectedCatalog = catalogs.find((catalog: Catalog) => catalog.id === selectedCatalogId);

  return (
    <div className='space-y-5'>
      <FormSection
        title='Select Catalog'
        description='Tags are managed per catalog.'
        className='p-4'
      >
        <div className='w-full max-w-xs mt-4'>
          <SelectSimple size='sm'
            value={selectedCatalogId || ''}
            onValueChange={onCatalogChange}
            options={catalogs.map((catalog: Catalog) => ({
              value: catalog.id,
              label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`
            }))}
            placeholder='Select a catalog...'
          />
        </div>
      </FormSection>

      {selectedCatalogId && (
        <>
          <div className='flex justify-start'>
            <Button
              onClick={openCreateModal}
              className='bg-white text-gray-900 hover:bg-gray-200'
            >
              <Plus className='size-4 mr-2' />
              Add Tag
            </Button>
          </div>

          <FormSection
            title={`Tags for "${selectedCatalog?.name}"`}
            className='p-4'
          >
            <div className='mt-4'>
              <SimpleSettingsList
                items={tags.map((tag: ProductTag) => ({
                  id: tag.id,
                  title: (
                    <UiTag
                      label={tag.name}
                      color={tag.color || '#38bdf8'}
                      dot
                    />
                  ),
                  original: tag
                }))}
                isLoading={loading}
                onEdit={(item) => openEditModal(item.original)}
                onDelete={(item) => handleDelete(item.original)}
                emptyMessage='No tags yet. Tags help you categorize products within a catalog.'
              />
            </div>
          </FormSection>
        </>
      )}

      {!selectedCatalogId && catalogs.length === 0 && (
        <EmptyState
          title='No catalogs found'
          description='Please create a catalog first in the Catalogs section before adding tags.'
        />
      )}

      <ConfirmModal
        isOpen={!!tagToDelete}
        onClose={() => setTagToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Tag'
        message={`Are you sure you want to delete tag "${tagToDelete?.name}"? This action cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />

      {showModal && (
        <FormModal
          open={showModal}
          onClose={(): void => setShowModal(false)}
          title={editingTag ? 'Edit Tag' : 'Create Tag'}
          onSave={(): void => { void handleSave(); }}
          isSaving={saveTagMutation.isPending}
          size='md'
        >
          <div className='space-y-4'>
            <FormField label='Name'>
              <Input
                className='h-9'
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: TagFormData) => ({ ...prev, name: e.target.value }))
                }
                placeholder='Tag name'
              />
            </FormField>

            <FormField label='Catalog'>
              <SelectSimple size='sm'
                value={formData.catalogId}
                onValueChange={(value: string): void =>
                  setFormData((prev: TagFormData) => ({
                    ...prev,
                    catalogId: value,
                  }))
                }
                options={catalogs.map((catalog: Catalog) => ({
                  value: catalog.id,
                  label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`
                }))}
                placeholder='Select catalog'
              />
            </FormField>

            <FormField label='Color'>
              <div className='flex items-center gap-3 mt-1'>
                <Input
                  type='color'
                  className='h-10 w-20 cursor-pointer rounded border border-border bg-gray-900'
                  value={formData.color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: TagFormData) => ({ ...prev, color: e.target.value }))
                  }
                />
                <Input
                  type='text'
                  className='flex-1 h-10 font-mono'
                  value={formData.color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: TagFormData) => ({ ...prev, color: e.target.value }))
                  }
                  placeholder='#38bdf8'
                />
              </div>
            </FormField>
          </div>
        </FormModal>
      )}
    </div>
  );
}
            
