import type { ProductListStateReturn } from './useProductListState.types';
import type { ProductListValueInput } from './useProductListState.value.types';

const EMPTY_INTEGRATION_BADGE_IDS = new Set<string>();
const EMPTY_INTEGRATION_BADGE_STATUSES = new Map<string, string>();
const EMPTY_TRADERA_BADGE_IDS = new Set<string>();
const EMPTY_TRADERA_BADGE_STATUSES = new Map<string, string>();
const EMPTY_PLAYWRIGHT_PROGRAMMABLE_BADGE_IDS = new Set<string>();
const EMPTY_PLAYWRIGHT_PROGRAMMABLE_BADGE_STATUSES = new Map<string, string>();
const EMPTY_VINTED_BADGE_IDS = new Set<string>();
const EMPTY_VINTED_BADGE_STATUSES = new Map<string, string>();
const EMPTY_SCRAPED_SOURCE_BADGE_IDS = new Set<string>();
const EMPTY_SCRAPED_SOURCE_BADGE_STATUSES = new Map<string, string>();

export type ProductListRuntimeValue = Pick<
  ProductListStateReturn,
  | 'bulkDeletePending'
  | 'handleConfirmSingleDelete'
  | 'handleMassDelete'
  | 'integrationBadgeIds'
  | 'integrationBadgeStatuses'
  | 'isDebugOpen'
  | 'isMassDeleteConfirmOpen'
  | 'isMounted'
  | 'loadingGlobal'
  | 'onAddToMarketplace'
  | 'onDeleteSelected'
  | 'onSelectAllGlobal'
  | 'playwrightProgrammableBadgeIds'
  | 'playwrightProgrammableBadgeStatuses'
  | 'productAiRunStatusByProductId'
  | 'productScanRunStatusByProductId'
  | 'productToDelete'
  | 'queuedProductIds'
  | 'rowRuntimeReady'
  | 'scrapedSourceBadgeIds'
  | 'scrapedSourceBadgeStatuses'
  | 'setIsMassDeleteConfirmOpen'
  | 'setProductToDelete'
  | 'setShowTriggerRunFeedback'
  | 'showTriggerRunFeedback'
  | 'traderaBadgeIds'
  | 'traderaBadgeStatuses'
  | 'triggerListingStatusHighlight'
  | 'vintedBadgeIds'
  | 'vintedBadgeStatuses'
>;

export const buildRuntimeValue = ({
  callbacks,
  data,
  modal,
  runtime,
}: ProductListValueInput): ProductListRuntimeValue => ({
  onSelectAllGlobal: callbacks.handleSelectAllVisibleProducts,
  loadingGlobal: modal.selection.loadingGlobalSelection,
  onDeleteSelected: callbacks.handleDeleteSelectedOpen,
  onAddToMarketplace: modal.modals.handleAddToMarketplace,
  integrationBadgeIds: EMPTY_INTEGRATION_BADGE_IDS,
  integrationBadgeStatuses: EMPTY_INTEGRATION_BADGE_STATUSES,
  traderaBadgeIds: EMPTY_TRADERA_BADGE_IDS,
  traderaBadgeStatuses: EMPTY_TRADERA_BADGE_STATUSES,
  playwrightProgrammableBadgeIds: EMPTY_PLAYWRIGHT_PROGRAMMABLE_BADGE_IDS,
  playwrightProgrammableBadgeStatuses: EMPTY_PLAYWRIGHT_PROGRAMMABLE_BADGE_STATUSES,
  vintedBadgeIds: EMPTY_VINTED_BADGE_IDS,
  vintedBadgeStatuses: EMPTY_VINTED_BADGE_STATUSES,
  scrapedSourceBadgeIds: EMPTY_SCRAPED_SOURCE_BADGE_IDS,
  scrapedSourceBadgeStatuses: EMPTY_SCRAPED_SOURCE_BADGE_STATUSES,
  queuedProductIds: data.queuedProductIds,
  productAiRunStatusByProductId: data.productAiRunStatusByProductId,
  productScanRunStatusByProductId: data.productScanRunStatusByProductId,
  showTriggerRunFeedback: data.showTriggerRunFeedback,
  setShowTriggerRunFeedback: callbacks.handleSetShowTriggerRunFeedback,
  isDebugOpen: runtime.isDebugOpen,
  isMounted: runtime.isMounted,
  rowRuntimeReady: runtime.rowRuntimeReady,
  triggerListingStatusHighlight: modal.highlights.triggerJobCompletionHighlight,
  productToDelete: modal.selection.productToDelete,
  setProductToDelete: modal.selection.setProductToDelete,
  isMassDeleteConfirmOpen: modal.selection.isMassDeleteConfirmOpen,
  setIsMassDeleteConfirmOpen: modal.selection.setIsMassDeleteConfirmOpen,
  handleMassDelete: modal.selection.handleMassDelete,
  handleConfirmSingleDelete: modal.selection.handleConfirmSingleDelete,
  bulkDeletePending: modal.selection.bulkDeletePending,
});
