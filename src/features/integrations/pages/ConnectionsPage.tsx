'use client';

import { Suspense, useEffect, useState } from 'react';

import { IntegrationList } from '@/features/integrations/components/connections/IntegrationList';
import { IntegrationModal } from '@/features/integrations/components/connections/IntegrationModal';
import {
  IntegrationsProvider,
  useIntegrationsContext,
} from '@/features/integrations/context/IntegrationsContext';
import { LoadingState } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

function IntegrationsContent(): React.JSX.Element {
  const {
    activeIntegration,
    isModalOpen,
    connectionToDelete,
    setConnectionToDelete,
    handleConfirmDeleteConnection,
  } = useIntegrationsContext();
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (connectionToDelete) return;
    setDeletePassword('');
    setIsDeleting(false);
  }, [connectionToDelete]);

  const handleCloseDeleteModal = (): void => {
    if (isDeleting) return;
    setConnectionToDelete(null);
    setDeletePassword('');
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!connectionToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const deleted = await handleConfirmDeleteConnection(deletePassword);
      if (deleted) {
        setDeletePassword('');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className='container mx-auto py-10'>
      <ConfirmModal
        isOpen={Boolean(connectionToDelete)}
        onClose={handleCloseDeleteModal}
        title='Delete connection'
        subtitle={connectionToDelete ? `Delete "${connectionToDelete.name}"` : undefined}
        message='This action is permanent and will also remove all related product synchronizations and listing links.'
        confirmText='Delete connection'
        isDangerous={true}
        loading={isDeleting}
        confirmPassword={deletePassword}
        onConfirmPasswordChange={setDeletePassword}
        onConfirm={handleDeleteConfirm}
      />
      <IntegrationList />

      {isModalOpen && activeIntegration && <IntegrationModal />}
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
