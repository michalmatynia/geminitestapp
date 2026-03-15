'use client';

import { Plus } from 'lucide-react';
import { useState, useCallback } from 'react';

import {
  useSaveParameterMutation,
  useDeleteParameterMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { CatalogRecord } from '@/shared/contracts/products';
import type { ProductParameter } from '@/shared/contracts/products';
import {
  useToast,
  Button,
  Input,
  SelectSimple,
  FormModal,
  EmptyState,
  FormSection,
  FormField,
  Textarea,
  SimpleSettingsList,
} from '@/shared/ui';
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
  { value: 'checklist', label: 'Checklist' },
  { value: 'checkbox', label: 'Checkbox' },
];

const SELECTOR_TYPES_REQUIRING_OPTIONS = new Set<ParameterSelectorType>([
  'radio',
  'select',
  'dropdown',
  'checklist',
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

export function ParametersSettings(props: ParametersSettingsProps): React.JSX.Element {
  const { loading, parameters, catalogs, selectedCatalogId, onCatalogChange, onRefresh } = props;

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
    if (SELECTOR_TYPES_REQUIRING_OPTIONS.has(formData.selectorType) && optionLabels.length === 0) {
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

      toast(editingParameter ? 'Parameter updated.' : 'Parameter created.', {
        variant: 'success',
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save parameter.';
      toast(message, { variant: 'error' });
    }
  };

  const handleDelete = useCallback((parameter: ProductParameter): void => {
    setParameterToDelete(parameter);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!parameterToDelete) return;
    try {
      await deleteParameterMutation.mutateAsync({
        id: parameterToDelete.id,
        catalogId: selectedCatalogId,
      });
      toast('Parameter deleted.', { variant: 'success' });
      onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete parameter.';
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
            ariaLabel='Catalog'
           title='Select a catalog...'/>
        </div>
      </FormSection>

      {selectedCatalogId && (
        <>
          <div className='flex justify-start'>
            <Button onClick={openCreateModal} className='bg-white text-gray-900 hover:bg-gray-200'>
              <Plus className='size-4 mr-2' />
              Add Parameter
            </Button>
          </div>

          <FormSection title={`Parameters for "${selectedCatalog?.name}"`} className='p-4'>
            <div className='mt-4'>
              <SimpleSettingsList
                items={parameters.map((parameter: ProductParameter) => ({
                  id: parameter.id,
                  title: parameter.name_en,
                  subtitle: `Type: ${getSelectorTypeLabel(parameter.selectorType)}`,
                  description: (
                    <div className='flex flex-wrap gap-x-3 gap-y-1'>
                      {parameter.optionLabels.length > 0 && (
                        <span>Options: {parameter.optionLabels.length}</span>
                      )}
                      {parameter.name_pl && <span>PL: {parameter.name_pl}</span>}
                      {parameter.name_de && <span>DE: {parameter.name_de}</span>}
                    </div>
                  ),
                  original: parameter,
                }))}
                isLoading={loading}
                onEdit={(item) => openEditModal(item.original)}
                onDelete={(item) => {
                  handleDelete(item.original);
                }}
                emptyMessage='No parameters yet. Create product parameters and choose their selector type.'
              />
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
               aria-label='Field name in English' title='Field name in English'/>
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
               aria-label='Optional' title='Optional'/>
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
               aria-label='Optional' title='Optional'/>
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
               ariaLabel='Select selector type' title='Select selector type'/>
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
                 aria-label='One value label per line\nSmall\nMedium\nLarge' title='One value label per line\nSmall\nMedium\nLarge'/>
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
