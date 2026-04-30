import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { Toast } from '@/shared/contracts/ui/base';

import type { SelectAllChecked } from './ParametersSettings.types';
import { buildDeleteIds, getParameterSelectAllChecked } from './ParametersSettings.utils';

export type ParametersSelectionController = {
  hasVisibleParameters: boolean;
  selectAllChecked: SelectAllChecked;
  selectedCount: number;
  pendingDeleteCount: number;
  selectedParameterIds: Set<string>;
  parameterIdsToDelete: string[];
  updateSelection: (parameterId: string, checked: boolean) => void;
  handleToggleSelectAll: () => void;
  startDeleteSelection: () => void;
  startDeleteParameter: (parameter: ProductParameter) => void;
  clearSelection: () => void;
  clearPendingDeletion: () => void;
  getDeletionIds: () => string[];
};

type SelectionActionArgs = {
  visibleParameterIds: string[];
  isAllSelected: boolean;
  selectedParameterIds: Set<string>;
  parameterIdsToDelete: string[];
  setSelectedParameterIds: Dispatch<SetStateAction<Set<string>>>;
  setParameterIdsToDelete: Dispatch<SetStateAction<string[]>>;
  clearSelection: () => void;
  toast: Toast;
};

type SelectionActions = Pick<
  ParametersSelectionController,
  | 'updateSelection'
  | 'handleToggleSelectAll'
  | 'startDeleteSelection'
  | 'startDeleteParameter'
  | 'getDeletionIds'
>;

const useParameterSelectionEffects = ({
  visibleParameterIds,
  selectedCatalogId,
  clearSelection,
  clearPendingDeletion,
  setSelectedParameterIds,
}: {
  visibleParameterIds: string[];
  selectedCatalogId: string | null;
  clearSelection: () => void;
  clearPendingDeletion: () => void;
  setSelectedParameterIds: Dispatch<SetStateAction<Set<string>>>;
}): void => {
  useEffect(() => {
    setSelectedParameterIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleParameterIds.includes(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleParameterIds]);

  useEffect(() => {
    clearSelection();
    clearPendingDeletion();
  }, [clearPendingDeletion, clearSelection, selectedCatalogId]);
};

const useParameterSelectionActions = ({
  visibleParameterIds,
  isAllSelected,
  selectedParameterIds,
  parameterIdsToDelete,
  setSelectedParameterIds,
  setParameterIdsToDelete,
  clearSelection,
  toast,
}: SelectionActionArgs): SelectionActions => {
  const updateSelection = useCallback((parameterId: string, checked: boolean): void => {
    setSelectedParameterIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(parameterId);
      else next.delete(parameterId);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback((): void => {
    if (isAllSelected) {
      clearSelection();
      return;
    }
    setSelectedParameterIds(new Set(visibleParameterIds));
  }, [clearSelection, isAllSelected, visibleParameterIds]);

  const startDeleteSelection = useCallback((): void => {
    if (selectedParameterIds.size === 0) {
      toast('Please select at least one parameter to delete.', { variant: 'error' });
      return;
    }
    setParameterIdsToDelete(Array.from(selectedParameterIds));
  }, [selectedParameterIds, toast]);

  const startDeleteParameter = useCallback((parameter: ProductParameter): void => {
    setParameterIdsToDelete([parameter.id]);
  }, []);

  const getDeletionIds = useCallback(
    (): string[] => buildDeleteIds(parameterIdsToDelete),
    [parameterIdsToDelete]
  );

  return {
    updateSelection,
    handleToggleSelectAll,
    startDeleteSelection,
    startDeleteParameter,
    getDeletionIds,
  };
};

export function useParametersSettingsSelection({
  parameters,
  selectedCatalogId,
  toast,
}: {
  parameters: ProductParameter[];
  selectedCatalogId: string | null;
  toast: Toast;
}): ParametersSelectionController {
  const [selectedParameterIds, setSelectedParameterIds] = useState<Set<string>>(new Set());
  const [parameterIdsToDelete, setParameterIdsToDelete] = useState<string[]>([]);
  const visibleParameterIds = useMemo(() => parameters.map((parameter) => parameter.id), [parameters]);
  const hasVisibleParameters = visibleParameterIds.length > 0;
  const isAllSelected =
    hasVisibleParameters && selectedParameterIds.size === visibleParameterIds.length;
  const isIndeterminateSelection =
    selectedParameterIds.size > 0 && selectedParameterIds.size < visibleParameterIds.length;
  const pendingDeleteCount = useMemo(
    () => new Set(parameterIdsToDelete).size,
    [parameterIdsToDelete]
  );
  const clearSelection = useCallback((): void => {
    setSelectedParameterIds(new Set());
  }, []);
  const clearPendingDeletion = useCallback((): void => {
    setParameterIdsToDelete([]);
  }, []);
  useParameterSelectionEffects({
    visibleParameterIds,
    selectedCatalogId,
    clearSelection,
    clearPendingDeletion,
    setSelectedParameterIds,
  });
  const actions = useParameterSelectionActions({
    visibleParameterIds,
    isAllSelected,
    selectedParameterIds,
    parameterIdsToDelete,
    setSelectedParameterIds,
    setParameterIdsToDelete,
    clearSelection,
    toast,
  });

  return {
    hasVisibleParameters,
    selectAllChecked: getParameterSelectAllChecked({ isAllSelected, isIndeterminateSelection }),
    selectedCount: selectedParameterIds.size,
    pendingDeleteCount,
    selectedParameterIds,
    parameterIdsToDelete,
    ...actions,
    clearSelection,
    clearPendingDeletion,
  };
}
