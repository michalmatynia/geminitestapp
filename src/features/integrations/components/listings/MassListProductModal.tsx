'use client';

import { useState } from 'react';

import {
  ListingSettingsProvider,
  useListingSettingsContext,
} from '@/features/integrations/context/ListingSettingsContext';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { FormModal, Alert, LoadingState } from '@/shared/ui';

import { BaseListingSettings } from './BaseListingSettings';
import { ExportLogViewer } from './ExportLogViewer';
import { useMassListForm } from './hooks/useMassListForm';
import { IntegrationAccountSummary } from './IntegrationAccountSummary';
import { MassListProductModalViewProvider, useMassListProductModalViewContext } from './mass-list-modal/context/MassListProductModalViewContext';
import { MassListProgressPanel } from './mass-list-modal/MassListProgressPanel';

interface MassListProductModalProps extends EntityModalProps<string[]> {
  integrationId: string;
  connectionId: string;
}

function MassListProductModalContent(): React.JSX.Element {
  const {
    productIds,
    onClose,
  } = useMassListProductModalViewContext();
  const [logsOpen, setLogsOpen] = useState(false);

  const {
    loadingIntegrations: loading,
    selectedIntegration,
    isBaseComIntegration,
  } = useListingSettingsContext();

  const {
    error,
    progress,
    exportLogs,
    handleSubmit,
    submitting,
  } = useMassListForm();

  return (
    <FormModal
      open={true}
      onClose={onClose}
      title={`List ${productIds.length} Products to ${selectedIntegration?.name || 'Marketplace'}`}
      onSave={(): void => { void handleSubmit(); }}
      isSaving={submitting}
      saveText={isBaseComIntegration ? 'Export to Base.com' : 'List Products'}
      cancelText='Cancel'
      size='md'
    >
      <div className='space-y-6'>
        {error && (
          <Alert variant='error'>
            {error}
          </Alert>
        )}

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
              <>
                {isBaseComIntegration && <BaseListingSettings />}
              </>
            )}
          </>
        )}

        {exportLogs.length > 0 && (
          <div className='mt-4 border-t border pt-4'>
            <ExportLogViewer
              logs={exportLogs}
              isOpen={logsOpen}
              onToggle={setLogsOpen}
            />
          </div>
        )}
      </div>
    </FormModal>
  );
}

export function MassListProductModal(props: MassListProductModalProps): React.JSX.Element | null {
  const {
    isOpen,
    integrationId,
    connectionId,
    item: productIds,
    onClose,
    onSuccess,
  } = props;

  if (!productIds || !isOpen) return null;

  return (
    <ListingSettingsProvider
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
    </ListingSettingsProvider>
  );
}

export default MassListProductModal;
