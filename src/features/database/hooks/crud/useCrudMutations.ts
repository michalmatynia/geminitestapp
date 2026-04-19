import { useCallback, useState } from 'react';
import type { CrudResult, CrudRequest } from '@/shared/contracts/database';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { useCrudMutation } from '../useDatabaseQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export interface UseCrudMutationsReturn {
  mutationError: string | null;
  setMutationError: (err: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (msg: string | null) => void;
  crudMutation: MutationResult<CrudResult, CrudRequest>;
  handleAdd: (selectedTable: string, data: Record<string, unknown>, onSuccess: () => void) => void;
  handleEdit: (selectedTable: string, row: Record<string, unknown>, data: Record<string, unknown>, onSuccess: () => void) => void;
  handleDelete: (selectedTable: string, row: Record<string, unknown>, onSuccess: () => void) => void;
}

const getPrimaryKey = (row: Record<string, unknown>): Record<string, unknown> =>
  row['_id'] !== undefined ? { _id: row['_id'] } : { ...row };

const createMutationHandler = (
  setSuccess: (m: string | null) => void,
  setError: (e: string | null) => void,
  msg: string,
  onSuccess: () => void
): { onSuccess: (res: CrudResult) => void; onError: (err: Error) => void } => ({
  onSuccess: (res: CrudResult) => {
    const error = res.error ?? '';
    if (error.length > 0) {
      setError(error);
    } else {
      setSuccess(msg);
      onSuccess();
    }
  },
  onError: (err: Error) => {
    logClientError(err, { context: { source: 'useCrudMutations', action: 'mutate' } });
    setError(err.message);
  },
});

export function useCrudMutations(): UseCrudMutationsReturn {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const crudMutation = useCrudMutation();

  const handleAdd = useCallback((selectedTable: string, data: Record<string, unknown>, onSuccess: () => void): void => {
    setSuccessMessage(null);
    setMutationError(null);
    crudMutation.mutate(
      { collection: selectedTable, operation: 'create', provider: 'mongodb', data },
      createMutationHandler(setSuccessMessage, setMutationError, 'Record created successfully', onSuccess)
    );
  }, [crudMutation]);

  const handleEdit = useCallback((selectedTable: string, row: Record<string, unknown>, data: Record<string, unknown>, onSuccess: () => void): void => {
    setSuccessMessage(null);
    setMutationError(null);
    crudMutation.mutate(
      { collection: selectedTable, operation: 'update', provider: 'mongodb', data, filter: getPrimaryKey(row) },
      createMutationHandler(setSuccessMessage, setMutationError, 'Record updated successfully', onSuccess)
    );
  }, [crudMutation]);

  const handleDelete = useCallback((selectedTable: string, row: Record<string, unknown>, onSuccess: () => void): void => {
    setSuccessMessage(null);
    setMutationError(null);
    crudMutation.mutate(
      { collection: selectedTable, operation: 'deleteOne', provider: 'mongodb', filter: getPrimaryKey(row) },
      createMutationHandler(setSuccessMessage, setMutationError, 'Record deleted successfully', onSuccess)
    );
  }, [crudMutation]);

  return { mutationError, setMutationError, successMessage, setSuccessMessage, crudMutation, handleAdd, handleEdit, handleDelete };
}
