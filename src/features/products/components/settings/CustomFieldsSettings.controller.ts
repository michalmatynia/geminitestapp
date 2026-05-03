import { useCallback, useState } from 'react';

import {
  useDeleteCustomFieldMutation,
  useSaveCustomFieldMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import { useToast } from '@/shared/ui/toast';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  buildCustomFieldFormData,
  buildCustomFieldSavePayload,
  CUSTOM_FIELD_TYPE_SELECT_OPTIONS,
  EMPTY_CUSTOM_FIELD_FORM,
  type CustomFieldFormData,
} from './CustomFieldsSettings.helpers';

export type CustomFieldsController = {
  customFieldToDelete: ProductCustomFieldDefinition | null;
  editingCustomField: ProductCustomFieldDefinition | null;
  fieldTypeOptions: Array<LabeledOptionDto<string>>;
  formData: CustomFieldFormData;
  handleConfirmDelete: () => Promise<void>;
  handleDelete: (customField: ProductCustomFieldDefinition) => void;
  handleSave: () => Promise<void>;
  openCreateModal: () => void;
  openEditModal: (customField: ProductCustomFieldDefinition) => void;
  setCustomFieldToDelete: (customField: ProductCustomFieldDefinition | null) => void;
  setFormData: React.Dispatch<React.SetStateAction<CustomFieldFormData>>;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  showModal: boolean;
};

export function useCustomFieldsController(onRefresh: () => void): CustomFieldsController {
  const { toast } = useToast();
  const saveCustomFieldMutation = useSaveCustomFieldMutation();
  const deleteCustomFieldMutation = useDeleteCustomFieldMutation();
  const [showModal, setShowModal] = useState(false);
  const [editingCustomField, setEditingCustomField] =
    useState<ProductCustomFieldDefinition | null>(null);
  const [customFieldToDelete, setCustomFieldToDelete] =
    useState<ProductCustomFieldDefinition | null>(null);
  const [formData, setFormData] = useState<CustomFieldFormData>(EMPTY_CUSTOM_FIELD_FORM);
  const openCreateModal = useCallback((): void => {
    setEditingCustomField(null);
    setFormData(EMPTY_CUSTOM_FIELD_FORM);
    setShowModal(true);
  }, []);
  const openEditModal = useCallback((customField: ProductCustomFieldDefinition): void => {
    setEditingCustomField(customField);
    setFormData(buildCustomFieldFormData(customField));
    setShowModal(true);
  }, []);
  const handleDelete = useCallback((customField: ProductCustomFieldDefinition): void => {
    setCustomFieldToDelete(customField);
  }, []);
  const handleSave = useCallback(async (): Promise<void> => {
    const result = buildCustomFieldSavePayload(formData, editingCustomField);
    if (result.error !== null || result.payload === null) {
      toast(result.error ?? 'Failed to save custom field.', { variant: 'error' });
      return;
    }
    try {
      await saveCustomFieldMutation.mutateAsync(result.payload);
      toast(editingCustomField === null ? 'Custom field created.' : 'Custom field updated.', { variant: 'success' });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save custom field.', { variant: 'error' });
    }
  }, [editingCustomField, formData, onRefresh, saveCustomFieldMutation, toast]);
  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (customFieldToDelete === null) return;
    try {
      await deleteCustomFieldMutation.mutateAsync({ id: customFieldToDelete.id });
      toast('Custom field deleted.', { variant: 'success' });
      onRefresh();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to delete custom field.', { variant: 'error' });
    } finally {
      setCustomFieldToDelete(null);
    }
  }, [customFieldToDelete, deleteCustomFieldMutation, onRefresh, toast]);

  return { customFieldToDelete, editingCustomField, fieldTypeOptions: CUSTOM_FIELD_TYPE_SELECT_OPTIONS, formData, handleConfirmDelete, handleDelete, handleSave, openCreateModal, openEditModal, setCustomFieldToDelete, setFormData, setShowModal, showModal };
}
