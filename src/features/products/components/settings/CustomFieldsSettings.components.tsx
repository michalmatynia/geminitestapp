'use client';

import type { ProductCustomFieldDefinition, ProductCustomFieldType } from '@/shared/contracts/products/custom-fields';
import { EmptyState } from '@/shared/ui/empty-state';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { FormModal } from '@/shared/ui/FormModal';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';
import { Textarea } from '@/shared/ui/textarea';

import type { CustomFieldsController } from './CustomFieldsSettings.controller';
import { getCustomFieldTypeLabel } from './CustomFieldsSettings.helpers';

export function CustomFieldsListSection({
  customFields,
  loading,
  onDelete,
  onEdit,
}: {
  customFields: ProductCustomFieldDefinition[];
  loading: boolean;
  onDelete: (customField: ProductCustomFieldDefinition) => void;
  onEdit: (customField: ProductCustomFieldDefinition) => void;
}): React.JSX.Element {
  return (
    <FormSection title='Custom Fields' description='Create reusable product-specific text fields and checkbox sets.' className='p-4'>
      <div className='mt-4'>
        {customFields.length === 0 && !loading ? (
          <EmptyState title='No custom fields' description='Create your first custom field to show it in the product editor.' />
        ) : (
          <SimpleSettingsList
            items={customFields.map((customField) => ({
              id: customField.id,
              title: customField.name,
              subtitle: `Type: ${getCustomFieldTypeLabel(customField.type)}`,
              description: customField.type === 'checkbox_set' ? `Checkboxes: ${customField.options.length}` : 'Single text input',
              original: customField,
            }))}
            isLoading={loading}
            onEdit={(item) => onEdit(item.original)}
            onDelete={(item) => onDelete(item.original)}
            emptyMessage='No custom fields found.'
          />
        )}
      </div>
    </FormSection>
  );
}

export function CustomFieldFormModal({
  controller,
}: {
  controller: CustomFieldsController;
}): React.JSX.Element {
  const { editingCustomField, fieldTypeOptions, formData, handleSave, setFormData, setShowModal, showModal } = controller;

  return (
    <FormModal
      open={showModal}
      onClose={() => setShowModal(false)}
      title={editingCustomField === null ? 'Create Custom Field' : 'Edit Custom Field'}
      onSave={() => {
        void handleSave();
      }}
      saveText={editingCustomField === null ? 'Create Field' : 'Save Changes'}
    >
      <div className='space-y-4'>
        <FormField label='Field Title' id='custom-field-name'>
          <Input
            id='custom-field-name'
            value={formData.name}
            onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
            placeholder='Example: Packaging Notes'
          />
        </FormField>
        <FormField label='Field Type' id='custom-field-type'>
          <SelectSimple
            value={formData.type}
            onValueChange={(value) => setFormData((current) => ({ ...current, type: value as ProductCustomFieldType }))}
            options={fieldTypeOptions}
            ariaLabel='Custom field type'
            placeholder='Select field type...'
          />
        </FormField>
        {formData.type === 'checkbox_set' && (
          <FormField label='Checkbox Names' description='Enter one checkbox name per line. Order is preserved in the product form.'>
            <Textarea
              value={formData.optionsInput}
              onChange={(event) => setFormData((current) => ({ ...current, optionsInput: event.target.value }))}
              rows={6}
              placeholder={'Gift Ready\nLimited Edition\nNeeds Cleaning'}
            />
          </FormField>
        )}
      </div>
    </FormModal>
  );
}

export function CustomFieldDeleteModal({
  controller,
}: {
  controller: CustomFieldsController;
}): React.JSX.Element {
  const { customFieldToDelete, handleConfirmDelete, setCustomFieldToDelete } = controller;

  return (
    <ConfirmModal
      isOpen={customFieldToDelete !== null}
      title='Delete Custom Field?'
      message={`Delete "${customFieldToDelete?.name ?? 'this custom field'}"? Existing product values will no longer be shown.`}
      confirmText='Delete Field'
      onClose={() => setCustomFieldToDelete(null)}
      onConfirm={() => {
        void handleConfirmDelete();
      }}
    />
  );
}
