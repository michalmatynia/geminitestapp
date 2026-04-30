'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

import { ParametersFormModal } from '@/features/products/components/settings/parameters/ParametersFormModal';
import {
  LINKABLE_SELECTOR_TYPES,
  SELECTOR_TYPES_REQUIRING_OPTIONS,
} from '@/features/products/components/settings/parameters/ParametersSettings.constants';
import type { ParameterFormData } from '@/features/products/components/settings/parameters/ParametersSettings.types';
import {
  buildParameterSavePayload,
  createParameterFormDataForCatalog,
} from '@/features/products/components/settings/parameters/ParametersSettings.utils';
import { useSaveParameterMutation } from '@/features/products/hooks/useProductSettingsQueries';
import { Button, useOptionalToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  useDraftCreatorMetadata,
  type DraftCreatorMetadata,
} from './DraftCreatorFormContext';

type ParameterDefinitionModalController = {
  formData: ParameterFormData;
  isOpen: boolean;
  isSaving: boolean;
  isTriggerDisabled: boolean;
  selectorNeedsOptions: boolean;
  selectorSupportsLinking: boolean;
  setFormData: Dispatch<SetStateAction<ParameterFormData>>;
  closeModal: () => void;
  handleSave: () => Promise<void>;
  openCreateModal: () => void;
};

const resolveSelectedCatalogId = (selectedCatalogIds: string[]): string | null => {
  const selectedCatalogId = selectedCatalogIds[0]?.trim() ?? '';
  return selectedCatalogId.length > 0 ? selectedCatalogId : null;
};

const resolveStorageCatalogId = ({
  catalogs,
  selectedCatalogIds,
}: Pick<DraftCreatorMetadata, 'catalogs' | 'selectedCatalogIds'>): string | null => {
  const selectedCatalogId = resolveSelectedCatalogId(selectedCatalogIds);
  if (selectedCatalogId !== null) return selectedCatalogId;

  const defaultCatalogId = catalogs.find((catalog) => catalog.isDefault)?.id.trim() ?? '';
  if (defaultCatalogId.length > 0) return defaultCatalogId;

  const firstCatalogId = catalogs[0]?.id.trim() ?? '';
  return firstCatalogId.length > 0 ? firstCatalogId : null;
};

const useParameterDefinitionModalController = (): ParameterDefinitionModalController => {
  const { catalogs, selectedCatalogIds } = useDraftCreatorMetadata();
  const storageCatalogId = resolveStorageCatalogId({ catalogs, selectedCatalogIds });
  const { toast } = useOptionalToast();
  const saveParameterMutation = useSaveParameterMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ParameterFormData>(
    createParameterFormDataForCatalog(storageCatalogId ?? '')
  );
  const closeModal = useCallback((): void => setIsOpen(false), []);
  const openCreateModal = useCallback((): void => {
    if (storageCatalogId === null) {
      toast('Create a catalog before creating a parameter.', { variant: 'error' });
      return;
    }
    setFormData(createParameterFormDataForCatalog(storageCatalogId));
    setIsOpen(true);
  }, [storageCatalogId, toast]);
  const handleSave = useCallback(async (): Promise<void> => {
    const result = buildParameterSavePayload(formData);
    if (result.status === 'error') {
      toast(result.message, { variant: 'error' });
      return;
    }

    try {
      await saveParameterMutation.mutateAsync({ id: undefined, data: result.payload });
      toast('Parameter created.', { variant: 'success' });
      setIsOpen(false);
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to save parameter.';
      toast(message, { variant: 'error' });
    }
  }, [formData, saveParameterMutation, toast]);

  return {
    formData,
    isOpen,
    isSaving: saveParameterMutation.isPending,
    isTriggerDisabled: storageCatalogId === null,
    selectorNeedsOptions: SELECTOR_TYPES_REQUIRING_OPTIONS.has(formData.selectorType),
    selectorSupportsLinking: LINKABLE_SELECTOR_TYPES.has(formData.selectorType),
    setFormData,
    closeModal,
    handleSave,
    openCreateModal,
  };
};

export function DraftCreatorParameterDefinitionModal(): React.JSX.Element {
  const controller = useParameterDefinitionModalController();

  return (
    <>
      <Button
        type='button'
        variant='outline'
        onClick={controller.openCreateModal}
        disabled={controller.isTriggerDisabled}
        title={
          controller.isTriggerDisabled
            ? 'Create a catalog before creating a parameter'
            : 'Create parameter'
        }
      >
        Create parameter
      </Button>
      <ParametersFormModal
        open={controller.isOpen}
        isEditing={false}
        formData={controller.formData}
        setFormData={controller.setFormData}
        selectorNeedsOptions={controller.selectorNeedsOptions}
        selectorSupportsLinking={controller.selectorSupportsLinking}
        isSaving={controller.isSaving}
        onClose={controller.closeModal}
        onSave={controller.handleSave}
      />
    </>
  );
}
