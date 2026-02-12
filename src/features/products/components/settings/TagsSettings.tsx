'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState, useCallback } from 'react';

import { logClientError } from '@/features/observability';
import { useSaveTagMutation, useDeleteTagMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { Catalog, ProductTag } from '@/features/products/types';
import { useToast, Button, UnifiedSelect, Input, Label, SharedModal, EmptyState, ConfirmDialog, SectionPanel, Tag as UiTag } from '@/shared/ui';

type TagsSettingsProps = {
  loading: boolean;
  tags: ProductTag[];
  catalogs: Catalog[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};

type TagFormData = {
  name: string;
  color: string;
  catalogId: string;
};

export function TagsSettings({
  loading,
  tags,
  catalogs,
  selectedCatalogId,
  onCatalogChange,
  onRefresh,
}: TagsSettingsProps): React.JSX.Element {
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
      <SectionPanel variant='subtle' className='p-4'>
        <p className='text-sm font-semibold text-white mb-3'>Select Catalog</p>
        <p className='text-xs text-gray-400 mb-3'>
          Tags are managed per catalog.
        </p>
        <div className='w-full max-w-xs'>
          <UnifiedSelect
            value={selectedCatalogId || ''}
            onValueChange={onCatalogChange}
            options={catalogs.map((catalog: Catalog) => ({
              value: catalog.id,
              label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`
            }))}
            placeholder='Select a catalog...'
          />
        </div>
      </SectionPanel>

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

          <SectionPanel variant='subtle' className='p-4'>
            <p className='text-sm font-semibold text-white mb-4'>
              Tags for &quot;{selectedCatalog?.name}&quot;
            </p>

            {loading ? (
              <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
                Loading tags...
              </div>
            ) : tags.length === 0 ? (
              <EmptyState
                title='No tags yet'
                description='Tags help you categorize products within a catalog.'
                action={
                  <Button onClick={openCreateModal} variant='outline'>
                    <Plus className='size-4 mr-2' />
                    Create Your First Tag
                  </Button>
                }
              />
            ) : (
              <div className='space-y-2'>
                {tags.map((tag: ProductTag) => (
                  <SectionPanel
                    key={tag.id}
                    variant='subtle-compact'
                    className='flex items-center justify-between gap-3 bg-gray-900'
                  >
                    <div className='flex items-center gap-3 min-w-0'>
                      <UiTag
                        label={tag.name}
                        color={tag.color || '#38bdf8'}
                        dot
                      />
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        onClick={(): void => openEditModal(tag)}
                        className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700'
                      >
                        Edit
                      </Button>
                      <Button
                        type='button'
                        onClick={(): void => handleDelete(tag)}
                        className='rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600'
                        title='Delete tag'
                      >
                        <Trash2 className='size-3' />
                      </Button>
                    </div>
                  </SectionPanel>
                ))}
              </div>
            )}
          </SectionPanel>
        </>
      )}

      {!selectedCatalogId && catalogs.length === 0 && (
        <EmptyState
          title='No catalogs found'
          description='Please create a catalog first in the Catalogs section before adding tags.'
        />
      )}

      <ConfirmDialog
        open={!!tagToDelete}
        onOpenChange={(open: boolean) => !open && setTagToDelete(null)}
        onConfirm={(): void => { void handleConfirmDelete(); }}
        title='Delete Tag'
        description={`Are you sure you want to delete tag "${tagToDelete?.name}"? This action cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
      />

      {showModal && (
        <SharedModal
          open={showModal}
          onClose={(): void => setShowModal(false)}
          title={editingTag ? 'Edit Tag' : 'Create Tag'}
          size='md'
        >
          <div className='space-y-4'>
            <div>
              <Label className='text-xs text-gray-400'>Name</Label>
              <Input
                className='mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: TagFormData) => ({ ...prev, name: e.target.value }))
                }
                placeholder='Tag name'
              />
            </div>

            <div>
              <Label className='text-xs text-gray-400'>Catalog</Label>
              <div className='mt-2'>
                <UnifiedSelect
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
              </div>
            </div>

            <div>
              <Label className='text-xs text-gray-400'>Color</Label>
              <div className='mt-2 flex items-center gap-3'>
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
                  className='flex-1 rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white'
                  value={formData.color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData((prev: TagFormData) => ({ ...prev, color: e.target.value }))
                  }
                  placeholder='#38bdf8'
                />
              </div>
            </div>

            <div className='flex items-center justify-end gap-3 pt-4'>
              <Button
                className='rounded-md border border-border px-3 py-2 text-sm text-gray-300 hover:bg-muted/50'
                type='button'
                onClick={(): void => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                className='rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200'
                type='button'
                onClick={(): void => { void handleSave(); }}
                disabled={saveTagMutation.isPending}
              >
                {saveTagMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </SharedModal>
      )}
    </div>
  );
}