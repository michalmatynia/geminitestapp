'use client';

import { Suspense } from 'react';

import { IntegrationList } from '@/features/integrations/components/connections/IntegrationList';
import { IntegrationModal } from '@/features/integrations/components/connections/IntegrationModal';
import { IntegrationsProvider, useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { LoadingState } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';


function IntegrationsContent(): React.JSX.Element {
  const {
    activeIntegration,
    isModalOpen,
    connectionToDelete,
    setConnectionToDelete,
    handleConfirmDeleteConnection,
  } = useIntegrationsContext();

  return (
    <div className='container mx-auto py-10'>
      <ConfirmModal
        isOpen={!!connectionToDelete}
        onClose={() => setConnectionToDelete(null)}
        onConfirm={handleConfirmDeleteConnection}
        title='Delete Connection'
        message={`Are you sure you want to delete connection "${connectionToDelete?.name}"? This cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />
      <IntegrationList />

      {isModalOpen && activeIntegration && (
        <IntegrationModal />
      )}
    </div>
  );
}

export default function IntegrationsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingState message='Loading integrations...' className='h-screen' />}>
      <IntegrationsProvider>
        <IntegrationsContent />
      </IntegrationsProvider>
    </Suspense>
  );
}
