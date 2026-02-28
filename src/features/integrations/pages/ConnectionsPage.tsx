'use client';

import { Suspense, useEffect, useState } from 'react';

import { IntegrationList } from '@/features/integrations/components/connections/IntegrationList';
import { IntegrationModal } from '@/features/integrations/components/connections/IntegrationModal';
import {
  IntegrationsProvider,
  useIntegrationsContext,
} from '@/features/integrations/context/IntegrationsContext';
import { Button, DetailModal, Input, LoadingState } from '@/shared/ui';

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
      <DetailModal
        isOpen={Boolean(connectionToDelete)}
        onClose={handleCloseDeleteModal}
        title='Delete connection'
        subtitle={connectionToDelete ? `Delete "${connectionToDelete.name}"` : undefined}
        size='sm'
        footer={
          <div className='flex justify-end gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={handleCloseDeleteModal}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={() => {
                void handleDeleteConfirm();
              }}
              disabled={isDeleting || !deletePassword.trim()}
            >
              {isDeleting ? 'Deleting...' : 'Delete connection'}
            </Button>
          </div>
        }
      >
        <div className='space-y-3'>
          <p className='text-sm text-red-300'>
            This action is permanent and will also remove all related product synchronizations and
            listing links.
          </p>
          <div className='space-y-1'>
            <label className='text-xs font-medium text-gray-300'>
              Confirm with your user password
            </label>
            <Input
              type='password'
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              placeholder='Enter your password'
              disabled={isDeleting}
              autoFocus
            />
          </div>
        </div>
      </DetailModal>
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
