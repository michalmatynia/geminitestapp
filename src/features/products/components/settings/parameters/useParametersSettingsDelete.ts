import { useCallback } from 'react';

import {
  useDeleteParameterMutation,
  useDeleteParametersMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { Toast } from '@/shared/contracts/ui/base';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { getParameterNoun } from './ParametersSettings.utils';

export type ParametersDeleteController = {
  deletePending: boolean;
  handleConfirmDelete: () => Promise<void>;
};

export function useParametersSettingsDelete({
  selectedCatalogId,
  onRefresh,
  getDeletionIds,
  clearSelection,
  clearPendingDeletion,
  toast,
}: {
  selectedCatalogId: string | null;
  onRefresh: () => void;
  getDeletionIds: () => string[];
  clearSelection: () => void;
  clearPendingDeletion: () => void;
  toast: Toast;
}): ParametersDeleteController {
  const deleteParametersMutation = useDeleteParametersMutation();
  const deleteParameterMutation = useDeleteParameterMutation();
  const deletePending = deleteParameterMutation.isPending || deleteParametersMutation.isPending;

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    const ids = getDeletionIds();
    if (ids.length === 0) return;

    try {
      if (ids.length === 1) {
        const [id] = ids;
        if (id === undefined) return;
        await deleteParameterMutation.mutateAsync({ id, catalogId: selectedCatalogId });
        toast('Parameter deleted.', { variant: 'success' });
      } else {
        await deleteParametersMutation.mutateAsync({ parameterIds: ids, catalogId: selectedCatalogId });
        toast(`Deleted ${ids.length} ${getParameterNoun(ids.length)}.`, { variant: 'success' });
      }
      onRefresh();
      clearSelection();
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to delete parameter(s).';
      toast(message, { variant: 'error' });
    } finally {
      clearPendingDeletion();
    }
  }, [
    clearPendingDeletion,
    clearSelection,
    deleteParameterMutation,
    deleteParametersMutation,
    getDeletionIds,
    onRefresh,
    selectedCatalogId,
    toast,
  ]);

  return {
    deletePending,
    handleConfirmDelete,
  };
}
