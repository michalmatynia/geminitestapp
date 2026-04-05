'use client';

import { useState } from 'react';

import {
  useListingSelection,
} from '@/features/integrations/context/ListingSettingsContext';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { FormModal } from '@/shared/ui/forms-and-actions.public';
import { Alert } from '@/shared/ui/primitives.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

import { ExportLogsPanel } from './ExportLogsPanel';
import { useMassListForm } from './hooks/useMassListForm';
import { IntegrationAccountSummary } from './IntegrationAccountSummary';
import { IntegrationSpecificListingSettings } from './IntegrationSpecificListingSettings';
import { ListingSettingsModalProvider } from './ListingSettingsModalProvider';
import {
  MassListProductModalViewProvider,
  useMassListProductModalViewContext,
} from './mass-list-modal/context/MassListProductModalViewContext';
import { MassListProgressPanel } from './mass-list-modal/MassListProgressPanel';
import { resolveMassListProductModalCopy } from './product-listings-copy';
import { resolveIntegrationDisplayName } from './product-listings-labels';

interface MassListProductModalProps extends EntityModalProps<string[]> {
  integrationId: string;
  connectionId: string;
}

function MassListProductModalContent(): React.JSX.Element {
  const { productIds, onClose } = useMassListProductModalViewContext();
  const [logsOpen, setLogsOpen] = useState(false);

  const {
    loadingIntegrations: loading,
    selectedIntegration,
    isBaseComIntegration,
  } = useListingSelection();

  const { error, progress, exportLogs, handleSubmit, submitting } = useMassListForm();
  const { modalTitle, saveText } = resolveMassListProductModalCopy({
    productCount: productIds.length,
    selectedIntegrationName: resolveIntegrationDisplayName(selectedIntegration?.name),
    isBaseComIntegration,
  });

  return (
    <FormModal
      open={true}
      onClose={onClose}
      title={modalTitle}
      onSave={(): void => {
        void handleSubmit();
      }}
      isSaving={submitting}
      saveText={saveText}
      cancelText='Cancel'
      size='md'
    >
      <div className='space-y-6'>
        {error && <Alert variant='error'>{error}</Alert>}

        {submitting && progress && (
          <MassListProgressPanel
            current={progress.current}
            total={progress.total}
            errors={progress.errors}
          />
        )}

        {!submitting && (
          <>
            <IntegrationAccountSummary />

            {loading ? (
              <LoadingState message='Loading details...' size='sm' className='py-4' />
            ) : (
              <IntegrationSpecificListingSettings
                includeTradera={false}
                withSectionDivider={false}
              />
            )}
          </>
        )}

        <ExportLogsPanel logs={exportLogs} isOpen={logsOpen} onToggle={setLogsOpen} />
      </div>
    </FormModal>
  );
}

export function MassListProductModal(props: MassListProductModalProps): React.JSX.Element | null {
  const { isOpen, integrationId, connectionId, item: productIds, onClose, onSuccess } = props;

  if (!productIds || !isOpen) return null;

  return (
    <ListingSettingsModalProvider
      initialIntegrationId={integrationId}
      initialConnectionId={connectionId}
    >
      <MassListProductModalViewProvider
        value={{
          productIds,
          integrationId,
          connectionId,
          onClose,
          onSuccess: onSuccess ?? (() => {}),
        }}
      >
        <MassListProductModalContent />
      </MassListProductModalViewProvider>
    </ListingSettingsModalProvider>
  );
}

export default MassListProductModal;
