'use client';

import { useToast } from '@/shared/ui/primitives.public';
import type { UseMutationResult } from '@tanstack/react-query';

type RestoreResponse = { restored: boolean };
type DeleteResponse = { deleted: boolean };

export type ProbeSessionActionsResult = {
  handleRestoreSession: (id: string) => Promise<void>;
  handleRestoreTemplate: (sessionIds: string[]) => Promise<void>;
  handleRejectSession: (id: string) => Promise<void>;
  handleRejectTemplate: (sessionIds: string[]) => Promise<void>;
};

function useRestoreActions(restoreMutation: UseMutationResult<RestoreResponse, Error, { id: string }>) {
  const { toast } = useToast();

  const handleRestoreSession = async (id: string): Promise<void> => {
    try {
      const restored = await restoreMutation.mutateAsync({ id });
      toast(
        restored.restored
          ? 'Restored archived probe session to active review.'
          : 'Probe session was already active or missing.',
        { variant: restored.restored ? 'success' : 'error' }
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Archived probe session could not be restored.', {
        variant: 'error',
      });
    }
  };

  const handleRestoreTemplate = async (sessionIds: string[]): Promise<void> => {
    try {
      const results = await Promise.allSettled(
        sessionIds.map((id) => restoreMutation.mutateAsync({ id }))
      );
      const restoredCount = results.filter((r) => r.status === 'fulfilled').length;
      toast(
        restoredCount === sessionIds.length
          ? `Restored ${restoredCount} archived probe session${restoredCount === 1 ? '' : 's'} to active review.`
          : `Restored ${restoredCount} of ${sessionIds.length} archived probe sessions.`,
        { variant: restoredCount === sessionIds.length ? 'success' : 'error' }
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Archived template could not be restored.', {
        variant: 'error',
      });
    }
  };

  return { handleRestoreSession, handleRestoreTemplate };
}

export function useProbeSessionActions(params: {
  restoreMutation: UseMutationResult<RestoreResponse, Error, { id: string }>;
  deleteMutation: UseMutationResult<DeleteResponse, Error, { id: string }>;
}): ProbeSessionActionsResult {
  const { toast } = useToast();
  const { restoreMutation, deleteMutation } = params;
  const { handleRestoreSession, handleRestoreTemplate } = useRestoreActions(restoreMutation);

  const handleRejectSession = async (id: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast('Rejected archived probe session.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not reject probe session.', {
        variant: 'error',
      });
    }
  };

  const handleRejectTemplate = async (sessionIds: string[]): Promise<void> => {
    try {
      await Promise.allSettled(sessionIds.map((id) => deleteMutation.mutateAsync({ id })));
      toast('Rejected archived probe template.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not reject probe template.', {
        variant: 'error',
      });
    }
  };

  return {
    handleRestoreSession,
    handleRestoreTemplate,
    handleRejectSession,
    handleRejectTemplate,
  };
}
