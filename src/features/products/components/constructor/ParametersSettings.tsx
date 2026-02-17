'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState, useCallback } from 'react';

import { useSaveParameterMutation, useDeleteParameterMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { CatalogRecord } from '@/features/products/types';
import type { ProductParameter } from '@/features/products/types';
import { useToast, Button, Input, SelectSimple, FormModal, EmptyState, Skeleton, FormSection, FormField, Textarea } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

type ParametersSettingsProps = {
  loading: boolean;
  parameters: ProductParameter[];
  catalogs: CatalogRecord[];
  selectedCatalogId: string | null;
  onCatalogChange: (catalogId: string) => void;
  onRefresh: () => void;
};

type ParameterSelectorType = ProductParameter['selectorType'];

type ParameterFormData = {
  name_en: string;
  name_pl: string;
  name_de: string;
  catalogId: string;
  selectorType: ParameterSelectorType;
  optionLabelsInput: string;
};

const SELECTOR_TYPE_OPTIONS: Array<{ value: ParameterSelectorType; label: string }> = [
  { value: 'text', label: 'Text Field' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'select', label: 'Select List' },
  { value: 'dropdown', label: 'Dropdown' },
];

const SELECTOR_TYPES_REQUIRING_OPTIONS = new Set<ParameterSelectorType>([
  'radio',
  'select',
  'dropdown',
]);

const normalizeOptionLabels = (input: string): string[] => {
  const seen = new Set<string>();
  return input
    .split('\n')
    .flatMap((line: string) => line.split(','))
    .map((value: string) => value.trim())
    .filter((value: string) => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const optionLabelsToMultiline = (labels: string[] | null | undefined): string =>
  (labels ?? []).filter(Boolean).join('\n');

const getSelectorTypeLabel = (value: ParameterSelectorType): string =>
  SELECTOR_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;

export function ParametersSettings({
  loading,
  parameters,
  catalogs,
  selectedCatalogId,
  onCatalogChange,
  onRefresh,
}: ParametersSettingsProps): React.JSX.Element {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingParameter, setEditingParameter] = useState<ProductParameter | null>(null);
  const [formData, setFormData] = useState<ParameterFormData>({
    name_en: '',
    name_pl: '',
    name_de: '',
    catalogId: '',
    selectorType: 'text',
    optionLabelsInput: '',
  });
  const [parameterToDelete, setParameterToDelete] = useState<ProductParameter | null>(null);

  const saveParameterMutation = useSaveParameterMutation();
  const deleteParameterMutation = useDeleteParameterMutation();

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
      selectorType: 'text',
      optionLabelsInput: '',
    });
    setShowModal(true);
  };

  const openEditModal = (parameter: ProductParameter): void => {
    setEditingParameter(parameter);
    setFormData({
      name_en: parameter.name_en,
      name_pl: parameter.name_pl ?? '',
      name_de: parameter.name_de ?? '',
      catalogId: parameter.catalogId,
      selectorType: parameter.selectorType ?? 'text',
      optionLabelsInput: optionLabelsToMultiline(parameter.optionLabels),
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

    const optionLabels = normalizeOptionLabels(formData.optionLabelsInput);
    if (
      SELECTOR_TYPES_REQUIRING_OPTIONS.has(formData.selectorType) &&
      optionLabels.length === 0
    ) {
      toast('This selector type requires at least one value label.', {
        variant: 'error',
      });
      return;
    }

    try {
      const payload = {
        name_en: formData.name_en.trim(),
        name_pl: formData.name_pl.trim() || null,
        name_de: formData.name_de.trim() || null,
        catalogId: formData.catalogId,
        selectorType: formData.selectorType,
        optionLabels,
      };

      await saveParameterMutation.mutateAsync({
        id: editingParameter?.id,
        data: payload,
      });

      toast(editingParameter ? 'Custom field updated.' : 'Custom field created.', {
        variant: 'success',
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save custom field.';
      toast(message, { variant: 'error' });
    }
  };

  const handleDelete = useCallback((parameter: ProductParameter): void => {
    setParameterToDelete(parameter);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!parameterToDelete) return;
    try {
      await deleteParameterMutation.mutateAsync({ id: parameterToDelete.id, catalogId: selectedCatalogId });
      toast('Custom field deleted.', { variant: 'success' });
      onRefresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete custom field.';
      toast(message, { variant: 'error' });
    } finally {
      setParameterToDelete(null);
    }
  };

  const selectedCatalog = catalogs.find(
    (catalog: CatalogRecord): boolean => catalog.id === selectedCatalogId
  );
  const selectorNeedsOptions = SELECTOR_TYPES_REQUIRING_OPTIONS.has(formData.selectorType);

  return (
    <div className='space-y-5'>
      <FormSection
        title='Select Catalog'
        description='Custom fields are managed per catalog.'
        className='p-4'
      >
        <div className='mt-4 w-full max-w-xs'>
          <SelectSimple size='sm'
            value={selectedCatalogId || ''}
            onValueChange={onCatalogChange}
            options={catalogs.map((catalog: CatalogRecord) => ({
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
              <Plus className='mr-2 size-4' />
              Add Custom Field
            </Button>
          </div>

          <FormSection
            title={`Custom Fields for "${selectedCatalog?.name}"`}
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
                  title='No custom fields yet'
                  description='Create custom product fields and choose their selector type.'
                  action={
                    <Button onClick={openCreateModal} variant='outline'>
                      <Plus className='mr-2 size-4' />
                      Create Your First Custom Field
                    </Button>
                  }
                />
              ) : (
                <div className='space-y-2'>
                  {parameters.map((parameter: ProductParameter) => (
                    <div
                      key={parameter.id}
                      className='flex items-center justify-between gap-3 rounded-md border border-border/40 bg-gray-900/40 p-3'
                    >
                      <div className='min-w-0'>
                        <p className='truncate text-sm text-gray-100'>
                          {parameter.name_en}
                        </p>
                        <div className='space-x-2 text-xs text-gray-400'>
                          <span>Type: {getSelectorTypeLabel(parameter.selectorType)}</span>
                          {parameter.optionLabels.length > 0 && (
                            <span>Options: {parameter.optionLabels.length}</span>
                          )}
                          {parameter.name_pl && (
                            <span>PL: {parameter.name_pl}</span>
                          )}
                          {parameter.name_de && (
                            <span>DE: {parameter.name_de}</span>
                          )}
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
                          onClick={(): void => { handleDelete(parameter); }}
                          className='rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600'
                          title='Delete custom field'
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
          description='Please create a catalog first in the Catalogs section before adding custom fields.'
        />
      )}

      <ConfirmModal

        isOpen={!!parameterToDelete}
        onClose={() => setParameterToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Custom Field'
        message={`Are you sure you want to delete custom field "${parameterToDelete?.name_en}"? This action cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />

      {showModal && (
        <FormModal
          open={showModal}
          onClose={(): void => setShowModal(false)}
          title={editingParameter ? 'Edit Custom Field' : 'Create Custom Field'}
          onSave={(): void => { void handleSave(); }}
          isSaving={saveParameterMutation.isPending}
          size='md'
        >
          <div className='space-y-4'>
            <FormField label='Name (EN)'>
              <Input
                value={formData.name_en}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: ParameterFormData) => ({
                    ...prev,
                    name_en: event.target.value,
                  }))
                }
                placeholder='Field name in English'
                className='h-9'
              />
            </FormField>
            <FormField label='Name (PL)'>
              <Input
                value={formData.name_pl}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: ParameterFormData) => ({
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
                  setFormData((prev: ParameterFormData) => ({
                    ...prev,
                    name_de: event.target.value,
                  }))
                }
                placeholder='Optional'
                className='h-9'
              />
            </FormField>
            <FormField label='Selector Type'>
              <SelectSimple
                size='sm'
                value={formData.selectorType}
                onValueChange={(value: string): void =>
                  setFormData((prev: ParameterFormData) => ({
                    ...prev,
                    selectorType: value as ParameterSelectorType,
                  }))
                }
                options={SELECTOR_TYPE_OPTIONS}
                placeholder='Select selector type'
                triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
              />
            </FormField>
            {selectorNeedsOptions && (
              <FormField label='Option Labels'>
                <Textarea
                  value={formData.optionLabelsInput}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                    setFormData((prev: ParameterFormData) => ({
                      ...prev,
                      optionLabelsInput: event.target.value,
                    }))
                  }
                  className='min-h-[110px] bg-gray-900'
                  placeholder={'One value label per line\nSmall\nMedium\nLarge'}
                />
                <p className='mt-1 text-xs text-gray-500'>
                  Value labels only. Saved labels are exported/imported as plain text values.
                </p>
              </FormField>
            )}
          </div>
        </FormModal>
      )}
    </div>
  );
}
