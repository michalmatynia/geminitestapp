'use client';

import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  useSaveParameterMutation,
  useDeleteParametersMutation,
  useDeleteParameterMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import {
  PRODUCT_PARAMETER_LINKABLE_SELECTOR_TYPES,
  type ProductParameter,
  type ProductParameterLinkedTitleTermType,
} from '@/shared/contracts/products/parameters';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { FormSection, FormField } from '@/shared/ui/form-section';
import { FormModal } from '@/shared/ui/FormModal';
import { Input } from '@/shared/ui/input';
import { Checkbox } from '@/shared/ui/checkbox';
import { SelectSimple } from '@/shared/ui/select-simple';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';
import { Textarea } from '@/shared/ui/textarea';
import { useToast } from '@/shared/ui/toast';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

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
  linkedTitleTermType: ProductParameterLinkedTitleTermType;
};

const SELECTOR_TYPE_OPTIONS: Array<LabeledOptionDto<ParameterSelectorType>> = [
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
const LINKABLE_SELECTOR_TYPES = new Set<ParameterSelectorType>(
  PRODUCT_PARAMETER_LINKABLE_SELECTOR_TYPES
);
const LINKED_TITLE_TERM_OPTIONS: Array<LabeledOptionDto<string>> = [
  { value: '', label: 'No English Title sync' },
  { value: 'size', label: 'Size term' },
  { value: 'material', label: 'Material term' },
  { value: 'theme', label: 'Theme term' },
];

const getLinkedTitleTermLabel = (
  value: ProductParameterLinkedTitleTermType
): string | null => {
  if (!value) return null;
  return LINKED_TITLE_TERM_OPTIONS.find((option) => option.value === value)?.label ?? value;
};

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
    linkedTitleTermType: null,
  });
  const [selectedParameterIds, setSelectedParameterIds] = useState<Set<string>>(new Set());
  const [parameterIdsToDelete, setParameterIdsToDelete] = useState<string[]>([]);

  const saveParameterMutation = useSaveParameterMutation();
  const deleteParametersMutation = useDeleteParametersMutation();
  const deleteParameterMutation = useDeleteParameterMutation();
  const deletePending = deleteParameterMutation.isPending || deleteParametersMutation.isPending;

  const visibleParameterIds = useMemo(
    () => parameters.map((parameter: ProductParameter) => parameter.id),
    [parameters]
  );
  const hasVisibleParameters = visibleParameterIds.length > 0;
  const isAllSelected =
    hasVisibleParameters && selectedParameterIds.size === visibleParameterIds.length;
  const isIndeterminateSelection =
    selectedParameterIds.size > 0 && selectedParameterIds.size < visibleParameterIds.length;
  const parameterIdsToDeleteSet = useMemo(
    () => new Set(parameterIdsToDelete),
    [parameterIdsToDelete]
  );
  const selectAllChecked = isAllSelected
    ? true
    : isIndeterminateSelection
      ? ('indeterminate' as const)
      : false;
  const selectedCount = selectedParameterIds.size;
  const pendingDeleteCount = parameterIdsToDeleteSet.size;

  const clearSelection = useCallback(() => {
    setSelectedParameterIds(new Set());
  }, []);

  useEffect(() => {
    setSelectedParameterIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleParameterIds.includes(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleParameterIds]);

  useEffect(() => {
    clearSelection();
    setParameterIdsToDelete([]);
  }, [clearSelection, selectedCatalogId]);

  const updateSelection = useCallback((parameterId: string, checked: boolean): void => {
    setSelectedParameterIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(parameterId);
      } else {
        next.delete(parameterId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback((): void => {
    if (isAllSelected) {
      clearSelection();
      return;
    }
    setSelectedParameterIds(new Set(visibleParameterIds));
  }, [clearSelection, isAllSelected, visibleParameterIds]);

  const startDeleteSelection = useCallback((): void => {
    if (selectedParameterIds.size === 0) {
      toast('Please select at least one parameter to delete.', { variant: 'error' });
      return;
    }
    setParameterIdsToDelete(Array.from(selectedParameterIds));
  }, [selectedParameterIds, toast]);

  const startDeleteParameter = useCallback((parameter: ProductParameter): void => {
    setParameterIdsToDelete([parameter.id]);
  }, []);

  const normalizeSelectionForDeletion = useCallback((): string[] => {
    return Array.from(new Set(parameterIdsToDelete.filter((id) => id.trim())));
  }, [parameterIdsToDelete]);

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
      linkedTitleTermType: null,
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
      linkedTitleTermType: parameter.linkedTitleTermType ?? null,
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
    if (
      formData.linkedTitleTermType &&
      !LINKABLE_SELECTOR_TYPES.has(formData.selectorType)
    ) {
      toast('Only text and textarea parameters can sync from English Title terms.', {
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
        linkedTitleTermType: formData.linkedTitleTermType,
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
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to save parameter.';
      toast(message, { variant: 'error' });
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    const ids = normalizeSelectionForDeletion();
    if (ids.length === 0) return;
    try {
      if (ids.length === 1) {
        await deleteParameterMutation.mutateAsync({
          id: ids[0]!,
          catalogId: selectedCatalogId,
        });
        toast('Parameter deleted.', { variant: 'success' });
      } else {
        await deleteParametersMutation.mutateAsync({
          parameterIds: ids,
          catalogId: selectedCatalogId,
        });
        const noun = ids.length === 1 ? 'parameter' : 'parameters';
        toast(`Deleted ${ids.length} ${noun}.`, { variant: 'success' });
      }
      onRefresh();
      clearSelection();
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to delete parameter(s).';
      toast(message, { variant: 'error' });
    } finally {
      setParameterIdsToDelete([]);
    }
  };

  const selectedCatalog = catalogs.find(
    (catalog: CatalogRecord): boolean => catalog.id === selectedCatalogId
  );
  const selectorNeedsOptions = SELECTOR_TYPES_REQUIRING_OPTIONS.has(formData.selectorType);
  const selectorSupportsLinking = LINKABLE_SELECTOR_TYPES.has(formData.selectorType);
  const catalogOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      catalogs.map((catalog: CatalogRecord) => ({
        value: catalog.id,
        label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`,
      })),
    [catalogs]
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
            options={catalogOptions}
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
            <div className='mb-4 flex items-center justify-between gap-3'>
              <div className='flex items-center gap-2 text-sm text-gray-300'>
                <Checkbox
                  checked={selectAllChecked}
                  onCheckedChange={() => {
                    handleToggleSelectAll();
                  }}
                  disabled={!hasVisibleParameters || loading}
                  aria-label='Select all parameters'
                  title='Select all parameters'
                />
                <span>Select all</span>
              </div>
              <Button
                size='sm'
                onClick={startDeleteSelection}
                disabled={selectedCount === 0 || deletePending || loading}
                variant='destructive'
                className='gap-2'
              >
                {deletePending ? 'Deleting...' : `Delete Selected (${selectedCount})`}
              </Button>
            </div>
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
                      {parameter.linkedTitleTermType && (
                        <span>Synced: {getLinkedTitleTermLabel(parameter.linkedTitleTermType)}</span>
                      )}
                      {parameter.name_pl && <span>PL: {parameter.name_pl}</span>}
                      {parameter.name_de && <span>DE: {parameter.name_de}</span>}
                    </div>
                  ),
                  original: parameter,
                }))}
                isLoading={loading}
                onEdit={(item) => openEditModal(item.original)}
                renderActions={(item) => (
                  <Checkbox
                    checked={selectedParameterIds.has(item.id)}
                    onCheckedChange={(checked) => {
                      updateSelection(item.id, checked === true);
                    }}
                    aria-label={`Select parameter ${item.title}`}
                    title={`Select parameter ${item.title}`}
                  />
                )}
                onDelete={(item) => {
                  startDeleteParameter(item.original);
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
        isOpen={pendingDeleteCount > 0}
        onClose={() => {
          setParameterIdsToDelete([]);
        }}
        onConfirm={handleConfirmDelete}
        title={pendingDeleteCount === 1 ? 'Delete parameter?' : 'Delete parameters?'}
        message={`Delete ${pendingDeleteCount} selected ${
          pendingDeleteCount === 1 ? 'parameter' : 'parameters'
        }? This action cannot be undone and will remove them from all products. `}
        confirmText='Delete'
        isDangerous={true}
        loading={deletePending}
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
                    linkedTitleTermType: LINKABLE_SELECTOR_TYPES.has(
                      value as ParameterSelectorType
                    )
                      ? prev.linkedTitleTermType
                      : null,
                  }))
                }
                options={SELECTOR_TYPE_OPTIONS}
                placeholder='Select selector type'
                triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
               ariaLabel='Select selector type' title='Select selector type'/>
            </FormField>
            <FormField label='Linked English Title Term'>
              <SelectSimple
                size='sm'
                value={formData.linkedTitleTermType ?? ''}
                onValueChange={(value: string): void =>
                  setFormData((prev: ParameterFormData) => ({
                    ...prev,
                    linkedTitleTermType:
                      value === '' ? null : (value as ProductParameterLinkedTitleTermType),
                  }))
                }
                options={LINKED_TITLE_TERM_OPTIONS}
                placeholder='No English Title sync'
                disabled={!selectorSupportsLinking}
                triggerClassName='w-full bg-gray-900 border-border text-sm text-white h-9'
               ariaLabel='Linked English Title term' title='Linked English Title term'/>
              <p className='mt-1 text-xs text-gray-500'>
                Automatically maps this parameter from the structured English Title. Available
                for Text Field and Textarea parameters only.
              </p>
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
