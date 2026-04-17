// ProductListRowRuntimeStore: external, lightweight snapshot store used by
// row-level consumers. It composes badge ID sets, badge-status maps, queued
// product IDs and run-status maps into per-row snapshots. Snapshots are cached
// and shallow-compared using specialized equality helpers so that
// useSyncExternalStore consumers only re-render when a meaningful change
// occurs. The store exposes subscribe/getSnapshot/setState for external use by
// the ProductListProvider.
import type { ProductListContextType, ProductListRowRuntimeContextType } from '../ProductListContext.types';
import { resolveProductAiRunFeedbackForList } from '@/features/products/lib/product-ai-run-feedback';

export type ProductListRowRuntimeStoreState = Pick<
  ProductListContextType,
  | 'integrationBadgeIds'
  | 'integrationBadgeStatuses'
  | 'traderaBadgeIds'
  | 'traderaBadgeStatuses'
  | 'playwrightProgrammableBadgeIds'
  | 'playwrightProgrammableBadgeStatuses'
  | 'vintedBadgeIds'
  | 'vintedBadgeStatuses'
  | 'queuedProductIds'
  | 'productAiRunStatusByProductId'
  | 'productScanRunStatusByProductId'
>;

export type ProductListRowRuntimeStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: (
    productId: string,
    baseProductId: string | null | undefined
  ) => ProductListRowRuntimeContextType;
  setState: (nextState: ProductListRowRuntimeStoreState) => void;
};

export const EMPTY_PRODUCT_LIST_ROW_RUNTIME_SNAPSHOT: ProductListRowRuntimeContextType = Object.freeze({
  showMarketplaceBadge: false,
  integrationStatus: 'not_started',
  showTraderaBadge: false,
  traderaStatus: 'not_started',
  showVintedBadge: false,
  vintedStatus: 'not_started',
  showPlaywrightProgrammableBadge: false,
  playwrightProgrammableStatus: 'not_started',
  productAiRunFeedback: null,
  productScanRunFeedback: null,
});

const areProductAiRunFeedbacksEqual = (
  left: ProductListRowRuntimeContextType['productAiRunFeedback'],
  right: ProductListRowRuntimeContextType['productAiRunFeedback']
): boolean => {
  if (left === right) return true;
  if (left === null) return false;
  if (right === null) return false;

  return [
    left.runId === right.runId,
    left.status === right.status,
    left.updatedAt === right.updatedAt,
    left.label === right.label,
    left.variant === right.variant,
    left.badgeClassName === right.badgeClassName,
  ].every((isEqual) => isEqual);
};

const areProductScanRunFeedbacksEqual = (
  left: ProductListRowRuntimeContextType['productScanRunFeedback'],
  right: ProductListRowRuntimeContextType['productScanRunFeedback']
): boolean => {
  if (left === right) return true;
  if (left === null) return false;
  if (right === null) return false;

  return [
    left.scanId === right.scanId,
    left.status === right.status,
    left.updatedAt === right.updatedAt,
    left.label === right.label,
    left.variant === right.variant,
    left.badgeClassName === right.badgeClassName,
  ].every((isEqual) => isEqual);
};

const areProductListRowRuntimeSnapshotsEqual = (
  left: ProductListRowRuntimeContextType,
  right: ProductListRowRuntimeContextType
): boolean =>
  [
    left.showMarketplaceBadge === right.showMarketplaceBadge,
    left.integrationStatus === right.integrationStatus,
    left.showTraderaBadge === right.showTraderaBadge,
    left.traderaStatus === right.traderaStatus,
    left.showVintedBadge === right.showVintedBadge,
    left.vintedStatus === right.vintedStatus,
    left.showPlaywrightProgrammableBadge === right.showPlaywrightProgrammableBadge,
    left.playwrightProgrammableStatus === right.playwrightProgrammableStatus,
    areProductAiRunFeedbacksEqual(left.productAiRunFeedback, right.productAiRunFeedback),
    areProductScanRunFeedbacksEqual(left.productScanRunFeedback, right.productScanRunFeedback),
  ].every((isEqual) => isEqual);

const areProductListRowRuntimeStoreStatesEqual = (
  left: ProductListRowRuntimeStoreState,
  right: ProductListRowRuntimeStoreState
): boolean =>
  [
    left.integrationBadgeIds === right.integrationBadgeIds,
    left.integrationBadgeStatuses === right.integrationBadgeStatuses,
    left.traderaBadgeIds === right.traderaBadgeIds,
    left.traderaBadgeStatuses === right.traderaBadgeStatuses,
    left.vintedBadgeIds === right.vintedBadgeIds,
    left.vintedBadgeStatuses === right.vintedBadgeStatuses,
    left.playwrightProgrammableBadgeIds === right.playwrightProgrammableBadgeIds,
    left.playwrightProgrammableBadgeStatuses === right.playwrightProgrammableBadgeStatuses,
    left.queuedProductIds === right.queuedProductIds,
    left.productAiRunStatusByProductId === right.productAiRunStatusByProductId,
    left.productScanRunStatusByProductId === right.productScanRunStatusByProductId,
  ].every((isEqual) => isEqual);

const resolveRowRuntimeStatus = (
  statuses: ReadonlyMap<string, string>,
  productId: string
): string => statuses.get(productId) ?? 'not_started';

const resolveProductScanRunFeedback = (
  state: ProductListRowRuntimeStoreState,
  productId: string
): ProductListRowRuntimeContextType['productScanRunFeedback'] =>
  state.productScanRunStatusByProductId?.get(productId) ?? null;

const createProductListRowRuntimeSnapshot = (
  state: ProductListRowRuntimeStoreState,
  productId: string
): ProductListRowRuntimeContextType => ({
  showMarketplaceBadge: state.integrationBadgeIds.has(productId),
  integrationStatus: resolveRowRuntimeStatus(state.integrationBadgeStatuses, productId),
  showTraderaBadge: state.traderaBadgeIds.has(productId),
  traderaStatus: resolveRowRuntimeStatus(state.traderaBadgeStatuses, productId),
  showVintedBadge: state.vintedBadgeIds.has(productId),
  vintedStatus: resolveRowRuntimeStatus(state.vintedBadgeStatuses, productId),
  showPlaywrightProgrammableBadge: state.playwrightProgrammableBadgeIds.has(productId),
  playwrightProgrammableStatus: resolveRowRuntimeStatus(
    state.playwrightProgrammableBadgeStatuses,
    productId
  ),
  productAiRunFeedback: resolveProductAiRunFeedbackForList({
    productId,
    queuedProductIds: state.queuedProductIds,
    productAiRunStatusByProductId: state.productAiRunStatusByProductId,
  }),
  productScanRunFeedback: resolveProductScanRunFeedback(state, productId),
});

export const createProductListRowRuntimeStore = (
  initialState: ProductListRowRuntimeStoreState
): ProductListRowRuntimeStore => {
  let state = initialState;
  const listeners = new Set<() => void>();
  const snapshotCache = new Map<string, ProductListRowRuntimeContextType>();

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: (
      productId: string,
      _baseProductId: string | null | undefined
    ): ProductListRowRuntimeContextType => {
      if (productId.length === 0) return EMPTY_PRODUCT_LIST_ROW_RUNTIME_SNAPSHOT;

      const cacheKey = productId;

      const nextSnapshot = createProductListRowRuntimeSnapshot(state, productId);

      const cachedSnapshot = snapshotCache.get(cacheKey);
      if (cachedSnapshot && areProductListRowRuntimeSnapshotsEqual(cachedSnapshot, nextSnapshot)) {
        return cachedSnapshot;
      }

      snapshotCache.set(cacheKey, nextSnapshot);
      return nextSnapshot;
    },
    setState: (nextState: ProductListRowRuntimeStoreState) => {
      if (areProductListRowRuntimeStoreStatesEqual(state, nextState)) return;
      state = nextState;
      listeners.forEach((listener) => listener());
    },
  };
};
