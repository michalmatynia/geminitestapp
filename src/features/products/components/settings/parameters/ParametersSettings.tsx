'use client';

import { EmptyState } from '@/shared/ui/empty-state';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';

import { ParametersCatalogSection } from './ParametersCatalogSection';
import { ParametersFormModal } from './ParametersFormModal';
import { ParametersListSection } from './ParametersListSection';
import type { ParametersSettingsProps } from './ParametersSettings.types';
import { getParameterNoun } from './ParametersSettings.utils';
import { useParametersSettingsController } from './useParametersSettingsController';

export function ParametersSettings(props: ParametersSettingsProps): React.JSX.Element {
  const controller = useParametersSettingsController(props);
  const hasSelectedCatalog = controller.selectedCatalogId !== null;

  return (
    <div className='space-y-5'>
      <ParametersCatalogSection
        selectedCatalogId={controller.selectedCatalogId}
        onCatalogChange={controller.onCatalogChange}
        catalogOptions={controller.catalogOptions}
      />

      {hasSelectedCatalog && <ParametersListSection {...controller} />}

      {!hasSelectedCatalog && controller.catalogs.length === 0 && (
        <EmptyState
          title='No catalogs found'
          description='Please create a catalog first in the Catalogs section before adding parameters.'
        />
      )}

      <ConfirmModal
        isOpen={controller.pendingDeleteCount > 0}
        onClose={controller.clearPendingDeletion}
        onConfirm={controller.handleConfirmDelete}
        title={
          controller.pendingDeleteCount === 1 ? 'Delete parameter?' : 'Delete parameters?'
        }
        message={`Delete ${controller.pendingDeleteCount} selected ${getParameterNoun(
          controller.pendingDeleteCount
        )}? This action cannot be undone and will remove them from all products. `}
        confirmText='Delete'
        isDangerous={true}
        loading={controller.deletePending}
      />

      {controller.showModal && (
        <ParametersFormModal
          open={controller.showModal}
          onClose={(): void => controller.setShowModal(false)}
          isEditing={controller.editingParameter !== null}
          formData={controller.formData}
          setFormData={controller.setFormData}
          selectorNeedsOptions={controller.selectorNeedsOptions}
          selectorSupportsLinking={controller.selectorSupportsLinking}
          onSave={controller.handleSave}
          isSaving={controller.savePending}
        />
      )}
    </div>
  );
}
