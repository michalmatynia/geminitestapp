'use client';

import {
  useProductListFiltersContext,
  useProductListSelectionContext,
} from '@/features/products/context/ProductListContext';
import { useToast } from '@/shared/ui/toast';

import { useProductSelectionBulkController } from './ProductSelectionActions.bulk';
import { useProductSelectionDialogController } from './ProductSelectionActions.dialogs';
import { useProductSelectionPresetController } from './ProductSelectionActions.presets';
import { useProductSelectionBaseController } from './ProductSelectionActions.selection';
import type { ProductSelectionActionsController } from './ProductSelectionActions.types';
import { useProductScrapeProfileRuntimeRun } from './useProductScrapeProfileRuntimeRun';

export const useProductSelectionActionsController = (): ProductSelectionActionsController => {
  const selectionContext = useProductListSelectionContext();
  const filtersContext = useProductListFiltersContext();
  const { toast } = useToast();
  const selection = useProductSelectionBaseController(selectionContext);
  const dialogs = useProductSelectionDialogController();
  const scrapeProfilesRuntime = useProductScrapeProfileRuntimeRun();
  const presets = useProductSelectionPresetController({
    activeAdvancedFilterPresetId: filtersContext.activeAdvancedFilterPresetId,
    advancedFilter: filtersContext.advancedFilter,
    advancedFilterPresets: filtersContext.advancedFilterPresets,
    setAdvancedFilterPresets: filtersContext.setAdvancedFilterPresets,
    setAdvancedFilterState: filtersContext.setAdvancedFilterState,
    toast,
  });
  const bulk = useProductSelectionBulkController({
    clearParsedMatchProductIds: filtersContext.clearParsedMatchProductIds,
    dialogs,
    selection,
    setParsedMatchProductIds: filtersContext.setParsedMatchProductIds,
    toast,
  });

  return {
    bulk,
    dialogs,
    includeArchived: filtersContext.includeArchived,
    parsedMatchProductIds: filtersContext.parsedMatchProductIds,
    presets,
    scrapeProfilesRuntime,
    selection,
  };
};
