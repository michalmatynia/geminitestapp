import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

import { useSaveParameterMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { Toast } from '@/shared/contracts/ui/base';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { EMPTY_PARAMETER_FORM_DATA } from './ParametersSettings.constants';
import type { ParameterFormData } from './ParametersSettings.types';
import {
  buildParameterSavePayload,
  createParameterFormDataForCatalog,
  createParameterFormDataFromParameter,
} from './ParametersSettings.utils';

export type ParametersModalController = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  editingParameter: ProductParameter | null;
  formData: ParameterFormData;
  setFormData: Dispatch<SetStateAction<ParameterFormData>>;
  savePending: boolean;
  openCreateModal: () => void;
  openEditModal: (parameter: ProductParameter) => void;
  handleSave: () => Promise<void>;
};

export function useParametersSettingsModal({
  selectedCatalogId,
  onRefresh,
  toast,
}: {
  selectedCatalogId: string | null;
  onRefresh: () => void;
  toast: Toast;
}): ParametersModalController {
  const [showModal, setShowModal] = useState(false);
  const [editingParameter, setEditingParameter] = useState<ProductParameter | null>(null);
  const [formData, setFormData] = useState<ParameterFormData>(EMPTY_PARAMETER_FORM_DATA);
  const saveParameterMutation = useSaveParameterMutation();

  const openCreateModal = useCallback((): void => {
    if (selectedCatalogId === null) {
      toast('Please select a catalog first.', { variant: 'error' });
      return;
    }
    setEditingParameter(null);
    setFormData(createParameterFormDataForCatalog(selectedCatalogId));
    setShowModal(true);
  }, [selectedCatalogId, toast]);

  const openEditModal = useCallback((parameter: ProductParameter): void => {
    setEditingParameter(parameter);
    setFormData(createParameterFormDataFromParameter(parameter));
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    const result = buildParameterSavePayload(formData);
    if (result.status === 'error') {
      toast(result.message, { variant: 'error' });
      return;
    }

    try {
      await saveParameterMutation.mutateAsync({
        id: editingParameter?.id,
        data: result.payload,
      });
      toast(editingParameter !== null ? 'Parameter updated.' : 'Parameter created.', {
        variant: 'success',
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to save parameter.';
      toast(message, { variant: 'error' });
    }
  }, [editingParameter, formData, onRefresh, saveParameterMutation, toast]);

  return { showModal, setShowModal, editingParameter, formData, setFormData,
    savePending: saveParameterMutation.isPending, openCreateModal, openEditModal, handleSave };
}
