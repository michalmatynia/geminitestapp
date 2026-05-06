/**
 * product-integrations-adapter.ts
 *
 * Public barrel for the product integrations feature. Re-exports all
 * components, hooks, and utilities needed by other features to interact with
 * marketplace integrations (Tradera, Vinted, Base, etc.).
 *
 * Key exports:
 *  - Modal components (ListProductModal, MassListProductModal, etc.)
 *  - Query hooks (fetchProductListings, fetchIntegrationsWithConnections)
 *  - Mutation hooks (useCreateListingMutation, useGenericExportToBaseMutation)
 *  - Operation hooks (useIntegrationOperations, useIntegrationModalOperations)
 *  - Type definitions (IntegrationWithConnections, etc.)
 *
 * This adapter layer isolates the integrations feature's internal structure
 * from its consumers, allowing refactoring without breaking imports.
 */
export type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';

export { default as ListProductModal } from './components/listings/ListProductModal';
export { default as MassListProductModal } from './components/listings/MassListProductModal';
export { ProductListingsModal } from './components/listings/ProductListingsModal';
export { TraderaStatusCheckModal } from './components/listings/TraderaStatusCheckModal';
export {
  fetchIntegrationsWithConnections,
  fetchPreferredBaseConnection,
  fetchPreferredTraderaConnection,
  fetchPreferredVintedConnection,
  integrationSelectionQueryKeys,
} from './components/listings/hooks/useIntegrationSelection';
export {
  fetchProductListings,
  isMissingProductListingsError,
  productListingsQueryKey,
} from './hooks/useListingQueries';
export {
  useGenericExportToBaseMutation,
  useCreateListingMutation,
  useLinkExistingTraderaListingMutation,
} from './hooks/useProductListingMutations';
export {
  useIntegrationListingBadges,
  useIntegrationModalOperations,
  useIntegrationOperations,
} from './hooks/useIntegrationOperations';
export {
  useDefaultExportConnection,
  useDefaultTraderaConnection,
  useIntegrationConnections,
  useIntegrations,
  useIntegrationsWithConnections,
} from './hooks/useIntegrationQueries';
export {
  type ResolvedTraderaBrowserConnection,
  type ResolvedTraderaQuickListContext,
  useTraderaQuickExportConnection,
} from './hooks/useTraderaQuickExportConnection';
export { useTraderaQuickExportFeedback } from './hooks/useTraderaQuickExportFeedback';
export { useTraderaQuickExportPolling } from './hooks/useTraderaQuickExportPolling';
export {
  type ResolvedVintedQuickListContext,
  useVintedQuickExportConnection,
} from './hooks/useVintedQuickExportConnection';
export { useVintedQuickExportFeedback } from './hooks/useVintedQuickExportFeedback';
export { useVintedQuickExportPolling } from './hooks/useVintedQuickExportPolling';
export {
  isBaseIntegrationSlug,
  isTraderaBrowserIntegrationSlug,
  isTraderaIntegrationSlug,
  isVintedIntegrationSlug,
} from './constants/slugs';
export {
  FAILURE_STATUSES,
  PENDING_STATUSES,
  PROCESSING_STATUSES,
  SUCCESS_STATUSES,
  normalizeMarketplaceStatus,
} from './utils/marketplace-status';
export { getBaseExportPreflightError } from './utils/baseExportPreflight';
export {
  createBaseRecoveryContext,
  createTraderaRecoveryContext,
  createVintedRecoveryContext,
  isTraderaQuickExportRecoveryContext,
  isVintedQuickExportRecoveryContext,
  resolveProductListingsIntegrationScope,
} from './utils/product-listings-recovery';
export {
  ensureTraderaBrowserSession,
  isTraderaBrowserAuthRequiredMessage,
  preflightTraderaQuickListSession,
} from './utils/tradera-browser-session';
export {
  readPersistedTraderaQuickListFeedback,
  persistTraderaQuickListFeedback,
} from './utils/traderaQuickListFeedback';
export { isVintedBrowserAuthRequiredMessage } from './utils/vinted-browser-messages';
export {
  ensureVintedBrowserSession,
  preflightVintedQuickListSession,
} from './utils/vinted-browser-session';
export {
  clearPersistedVintedQuickListFeedback,
  readPersistedVintedQuickListFeedback,
  persistVintedQuickListFeedback,
} from './utils/vintedQuickListFeedback';
