import { useMemo } from 'react';

import { useToast } from '@/shared/ui/toast';

import {
  LINKABLE_SELECTOR_TYPES,
  SELECTOR_TYPES_REQUIRING_OPTIONS,
} from './ParametersSettings.constants';
import type {
  ParametersSettingsController,
  ParametersSettingsProps,
} from './ParametersSettings.types';
import { buildCatalogOptions } from './ParametersSettings.utils';
import { useParametersSettingsDelete } from './useParametersSettingsDelete';
import { useParametersSettingsModal } from './useParametersSettingsModal';
import { useParametersSettingsSelection } from './useParametersSettingsSelection';

export function useParametersSettingsController(
  props: ParametersSettingsProps
): ParametersSettingsController {
  const { toast } = useToast();
  const selection = useParametersSettingsSelection({
    parameters: props.parameters,
    selectedCatalogId: props.selectedCatalogId,
    toast,
  });
  const modal = useParametersSettingsModal({
    selectedCatalogId: props.selectedCatalogId,
    onRefresh: props.onRefresh,
    toast,
  });
  const deletion = useParametersSettingsDelete({
    selectedCatalogId: props.selectedCatalogId,
    onRefresh: props.onRefresh,
    getDeletionIds: selection.getDeletionIds,
    clearSelection: selection.clearSelection,
    clearPendingDeletion: selection.clearPendingDeletion,
    toast,
  });
  const selectedCatalog = props.catalogs.find((catalog) => catalog.id === props.selectedCatalogId);
  const catalogOptions = useMemo(() => buildCatalogOptions(props.catalogs), [props.catalogs]);

  return {
    ...props,
    selectedCatalogName: selectedCatalog?.name ?? null,
    catalogOptions,
    ...selection,
    ...modal,
    ...deletion,
    selectorNeedsOptions: SELECTOR_TYPES_REQUIRING_OPTIONS.has(modal.formData.selectorType),
    selectorSupportsLinking: LINKABLE_SELECTOR_TYPES.has(modal.formData.selectorType),
  };
}
