'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  useDeleteSimpleParameterMutation,
  useSaveSimpleParameterMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type {
  CatalogRecord,
  ProductSimpleParameter,
} from '@/features/products/types';
import {
  Button,
  EmptyState,
  FormField,
  FormModal,
  FormSection,
  Input,
  SelectSimple,
  Skeleton,
  useToast,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

type SimpleParametersSettingsProps = {
  loading: boolean;
  parameters: ProductSimpleParameter[];
  catalogs: CatalogRecord[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};

type SimpleParameterFormData = {
  name_en: string;
  name_pl: string;
  name_de: string;
  catalogId: string;
};

export function SimpleParametersSettings({
  loading,
  parameters,
  catalogs,
  selectedCatalogId,
  onCatalogChange,
  onRefresh,
}: SimpleParametersSettingsProps): React.JSX.Element {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingParameter, setEditingParameter] =
    useState<ProductSimpleParameter | null>(null);
  const [parameterToDelete, setParameterToDelete] =
    useState<ProductSimpleParameter | null>(null);
  const [formData, setFormData] = useState<SimpleParameterFormData>({
    name_en: '',
    name_pl: '',
    name_de: '',
    catalogId: '',
  });

  const saveMutation = useSaveSimpleParameterMutation();
  const deleteMutation = useDeleteSimpleParameterMutation();

  const openCreateModal = (): void => {
    if (!selectedCatalogId) {
      toast('Please select a catalog first.', { variant: 'error' });
      return;
    }
    setEditingParameter(null);
    setFormData({
      name_en: '',
      name_pl: '',
      name_de: '',
      catalogId: selectedCatalogId,
    });
    setShowModal(true);
  };

  const openEditModal = (parameter: ProductSimpleParameter): void => {
    setEditingParameter(parameter);
    setFormData({
      name_en: parameter.name_en,
      name_pl: parameter.name_pl ?? '',
      name_de: parameter.name_de ?? '',
      catalogId: parameter.catalogId,
    });
    setShowModal(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!formData.name_en.trim()) {
      toast('English name is required.', { variant: 'error' });
      return;
    }
    if (!formData.catalogId) {
      toast('Catalog is required.', { variant: 'error' });
      return;
    }

    try {
      const payload = {
        name_en: formData.name_en.trim(),
        name_pl: formData.name_pl.trim() || null,
        name_de: formData.name_de.trim() || null,
        catalogId: formData.catalogId,
      };
      await saveMutation.mutateAsync({
        id: editingParameter?.id,
        data: payload,
      });
      toast(editingParameter ? 'Parameter updated.' : 'Parameter created.', {
        variant: 'success',
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save parameter.';
      toast(message, { variant: 'error' });
    }
  };

  const handleDelete = useCallback((parameter: ProductSimpleParameter): void => {
    setParameterToDelete(parameter);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!parameterToDelete) return;
    try {
      await deleteMutation.mutateAsync({
        id: parameterToDelete.id,
        catalogId: selectedCatalogId,
      });
      toast('Parameter deleted.', { variant: 'success' });
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete parameter.';
      toast(message, { variant: 'error' });
    } finally {
      setParameterToDelete(null);
    }
  };

  const selectedCatalog = catalogs.find(
    (catalog: CatalogRecord): boolean => catalog.id === selectedCatalogId
  );

  return (
    <div className='space-y-5'>
      <FormSection
        title='Select Catalog'
        description='Parameters are managed per catalog.'
        className='p-4'
      >
        <div className='mt-4 w-full max-w-xs'>
          <SelectSimple
            size='sm'
            value={selectedCatalogId || ''}
            onValueChange={onCatalogChange}
            options={catalogs.map((catalog: CatalogRecord) => ({
              value: catalog.id,
              label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`,
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
              <Plus className='mr-2 size-4' />
              Add Parameter
            </Button>
          </div>

          <FormSection
            title={`Parameters for "${selectedCatalog?.name}"`}
            description='Choose from these parameters in the Product form and optionally set a value.'
            className='p-4'
          >
            <div className='mt-4'>
              {loading ? (
                <div className='space-y-2 p-4'>
                  <Skeleton className='h-8 w-full' />
                  <Skeleton className='h-8 w-full' />
                  <Skeleton className='h-8 w-full' />
                </div>
              ) : parameters.length === 0 ? (
                <EmptyState
                  title='No parameters yet'
                  description='Create simple parameters that can be selected in products.'
                  action={
                    <Button onClick={openCreateModal} variant='outline'>
                      <Plus className='mr-2 size-4' />
                      Create Your First Parameter
                    </Button>
                  }
                />
              ) : (
                <div className='space-y-2'>
                  {parameters.map((parameter: ProductSimpleParameter) => (
                    <div
                      key={parameter.id}
                      className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-gray-900/40 p-3'
                    >
                      <div className='min-w-0'>
                        <p className='truncate text-sm text-gray-100'>
                          {parameter.name_en}
                        </p>
                        <div className='space-x-2 text-xs text-gray-400'>
                          {parameter.name_pl && <span>PL: {parameter.name_pl}</span>}
                          {parameter.name_de && <span>DE: {parameter.name_de}</span>}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          type='button'
                          onClick={(): void => openEditModal(parameter)}
                          className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700'
                        >
                          Edit
                        </Button>
                        <Button
                          type='button'
                          onClick={(): void => {
                            handleDelete(parameter);
                          }}
                          className='rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600'
                          title='Delete parameter'
                        >
                          <Trash2 className='size-3' />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormSection>
        </>
      )}

      {!selectedCatalogId && catalogs.length === 0 && (
        <EmptyState
          title='No catalogs found'
          description='Please create a catalog first in the Catalogs section before adding parameters.'
        />
      )}

      <ConfirmModal
        isOpen={!!parameterToDelete}
        onClose={() => setParameterToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Parameter'
        message={`Are you sure you want to delete parameter "${parameterToDelete?.name_en}"? This action cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />

      {showModal && (
        <FormModal
          open={showModal}
          onClose={(): void => setShowModal(false)}
          title={editingParameter ? 'Edit Parameter' : 'Create Parameter'}
          onSave={(): void => {
            void handleSave();
          }}
          isSaving={saveMutation.isPending}
          size='md'
        >
          <div className='space-y-4'>
            <FormField label='Name (EN)'>
              <Input
                value={formData.name_en}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: SimpleParameterFormData) => ({
                    ...prev,
                    name_en: event.target.value,
                  }))
                }
                placeholder='Parameter name in English'
                className='h-9'
              />
            </FormField>
            <FormField label='Name (PL)'>
              <Input
                value={formData.name_pl}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: SimpleParameterFormData) => ({
                    ...prev,
                    name_pl: event.target.value,
                  }))
                }
                placeholder='Optional'
                className='h-9'
              />
            </FormField>
            <FormField label='Name (DE)'>
              <Input
                value={formData.name_de}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: SimpleParameterFormData) => ({
                    ...prev,
                    name_de: event.target.value,
                  }))
                }
                placeholder='Optional'
                className='h-9'
              />
            </FormField>
          </div>
        </FormModal>
      )}
    </div>
  );
}
