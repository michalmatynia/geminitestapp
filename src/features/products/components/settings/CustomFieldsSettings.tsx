'use client';

import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import {
  useDeleteCustomFieldMutation,
  useSaveCustomFieldMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldOption,
  ProductCustomFieldType,
} from '@/shared/contracts/products/custom-fields';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { FormModal } from '@/shared/ui/FormModal';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';
import { Textarea } from '@/shared/ui/textarea';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { LabeledOptionDto } from '@/shared/contracts/base';

type CustomFieldsSettingsProps = {
  loading: boolean;
  customFields: ProductCustomFieldDefinition[];
  onRefresh: () => void;
};

type CustomFieldFormData = {
  name: string;
  type: ProductCustomFieldType;
  optionsInput: string;
};

const CUSTOM_FIELD_TYPE_OPTIONS: Array<LabeledOptionDto<ProductCustomFieldType>> = [
  { value: 'text', label: 'Text Field' },
  { value: 'checkbox_set', label: 'Checkbox Set' },
];

const normalizeOptionLabels = (input: string): string[] => {
  const seen = new Set<string>();
  return input
    .split('\n')
    .flatMap((line: string) => line.split(','))
    .map((value: string) => value.trim())
    .filter((value: string): boolean => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const optionsToMultiline = (options: ProductCustomFieldOption[] | null | undefined): string =>
  (options ?? []).map((option) => option.label).join('\n');

const buildOptionId = (): string => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `custom-field-option-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const buildNextOptions = (
  input: string,
  existingOptions: ProductCustomFieldOption[]
): ProductCustomFieldOption[] => {
  const labels = normalizeOptionLabels(input);
  const existingByLabel = new Map(
    existingOptions.map((option) => [option.label.trim().toLowerCase(), option] as const)
  );
  const usedIds = new Set<string>();

  return labels.map((label, index) => {
    const labelKey = label.toLowerCase();
    const exactMatch = existingByLabel.get(labelKey);
    if (exactMatch && !usedIds.has(exactMatch.id)) {
      usedIds.add(exactMatch.id);
      return { id: exactMatch.id, label };
    }

    const positionalMatch = existingOptions[index];
    if (positionalMatch && !usedIds.has(positionalMatch.id)) {
      usedIds.add(positionalMatch.id);
      return { id: positionalMatch.id, label };
    }

    const id = buildOptionId();
    usedIds.add(id);
    return { id, label };
  });
};

const getCustomFieldTypeLabel = (type: ProductCustomFieldType): string =>
  CUSTOM_FIELD_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;

export function CustomFieldsSettings(props: CustomFieldsSettingsProps): React.JSX.Element {
  const { loading, customFields, onRefresh } = props;
  const { toast } = useToast();
  const saveCustomFieldMutation = useSaveCustomFieldMutation();
  const deleteCustomFieldMutation = useDeleteCustomFieldMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingCustomField, setEditingCustomField] = useState<ProductCustomFieldDefinition | null>(
    null
  );
  const [customFieldToDelete, setCustomFieldToDelete] =
    useState<ProductCustomFieldDefinition | null>(null);
  const [formData, setFormData] = useState<CustomFieldFormData>({
    name: '',
    type: 'text',
    optionsInput: '',
  });

  const openCreateModal = (): void => {
    setEditingCustomField(null);
    setFormData({
      name: '',
      type: 'text',
      optionsInput: '',
    });
    setShowModal(true);
  };

  const openEditModal = (customField: ProductCustomFieldDefinition): void => {
    setEditingCustomField(customField);
    setFormData({
      name: customField.name,
      type: customField.type,
      optionsInput: optionsToMultiline(customField.options),
    });
    setShowModal(true);
  };

  const handleSave = async (): Promise<void> => {
    const name = formData.name.trim();
    if (!name) {
      toast('Field title is required.', { variant: 'error' });
      return;
    }

    const options =
      formData.type === 'checkbox_set'
        ? buildNextOptions(formData.optionsInput, editingCustomField?.options ?? [])
        : [];

    if (formData.type === 'checkbox_set' && options.length === 0) {
      toast('Checkbox sets require at least one checkbox name.', { variant: 'error' });
      return;
    }

    try {
      await saveCustomFieldMutation.mutateAsync({
        id: editingCustomField?.id,
        data: {
          name,
          type: formData.type,
          options,
        },
      });

      toast(editingCustomField ? 'Custom field updated.' : 'Custom field created.', {
        variant: 'success',
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to save custom field.';
      toast(message, { variant: 'error' });
    }
  };

  const handleDelete = useCallback((customField: ProductCustomFieldDefinition): void => {
    setCustomFieldToDelete(customField);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!customFieldToDelete) return;
    try {
      await deleteCustomFieldMutation.mutateAsync({ id: customFieldToDelete.id });
      toast('Custom field deleted.', { variant: 'success' });
      onRefresh();
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to delete custom field.';
      toast(message, { variant: 'error' });
    } finally {
      setCustomFieldToDelete(null);
    }
  };

  const fieldTypeOptions = useMemo(
    (): Array<LabeledOptionDto<string>> =>
      CUSTOM_FIELD_TYPE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    []
  );

  return (
    <div className='space-y-5'>
      <div className='flex justify-start'>
        <Button onClick={openCreateModal} className='bg-white text-gray-900 hover:bg-gray-200'>
          <Plus className='mr-2 size-4' />
          Add Custom Field
        </Button>
      </div>

      <FormSection
        title='Custom Fields'
        description='Create reusable product-specific text fields and checkbox sets.'
        className='p-4'
      >
        <div className='mt-4'>
          {customFields.length === 0 && !loading ? (
            <EmptyState
              title='No custom fields'
              description='Create your first custom field to show it in the product editor.'
            />
          ) : (
            <SimpleSettingsList
              items={customFields.map((customField) => ({
                id: customField.id,
                title: customField.name,
                subtitle: `Type: ${getCustomFieldTypeLabel(customField.type)}`,
                description:
                  customField.type === 'checkbox_set'
                    ? `Checkboxes: ${customField.options.length}`
                    : 'Single text input',
                original: customField,
              }))}
              isLoading={loading}
              onEdit={(item) => openEditModal(item.original)}
              onDelete={(item) => handleDelete(item.original)}
              emptyMessage='No custom fields found.'
            />
          )}
        </div>
      </FormSection>

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingCustomField ? 'Edit Custom Field' : 'Create Custom Field'}
        onSave={() => {
          void handleSave();
        }}
        saveText={editingCustomField ? 'Save Changes' : 'Create Field'}
      >
        <div className='space-y-4'>
          <FormField label='Field Title' id='custom-field-name'>
            <Input
              id='custom-field-name'
              value={formData.name}
              onChange={(event) =>
                setFormData((current) => ({ ...current, name: event.target.value }))
              }
              placeholder='Example: Packaging Notes'
            />
          </FormField>

          <FormField label='Field Type' id='custom-field-type'>
            <SelectSimple
              value={formData.type}
              onValueChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  type: value as ProductCustomFieldType,
                }))
              }
              options={fieldTypeOptions}
              ariaLabel='Custom field type'
              placeholder='Select field type...'
            />
          </FormField>

          {formData.type === 'checkbox_set' && (
            <FormField
              label='Checkbox Names'
              description='Enter one checkbox name per line. Order is preserved in the product form.'
            >
              <Textarea
                value={formData.optionsInput}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, optionsInput: event.target.value }))
                }
                rows={6}
                placeholder={'Gift Ready\nLimited Edition\nNeeds Cleaning'}
              />
            </FormField>
          )}
        </div>
      </FormModal>

      <ConfirmModal
        isOpen={Boolean(customFieldToDelete)}
        title='Delete Custom Field?'
        message={`Delete "${customFieldToDelete?.name ?? 'this custom field'}"? Existing product values will no longer be shown.`}
        confirmText='Delete Field'
        onClose={() => setCustomFieldToDelete(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </div>
  );
}
