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
});

const areProductAiRunFeedbacksEqual = (
  left: ProductListRowRuntimeContextType['productAiRunFeedback'],
  right: ProductListRowRuntimeContextType['productAiRunFeedback']
): boolean => {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    left.runId === right.runId &&
    left.status === right.status &&
    left.updatedAt === right.updatedAt &&
    left.label === right.label &&
    left.variant === right.variant &&
    left.badgeClassName === right.badgeClassName
  );
};

const areProductListRowRuntimeSnapshotsEqual = (
  left: ProductListRowRuntimeContextType,
  right: ProductListRowRuntimeContextType
): boolean =>
  left.showMarketplaceBadge === right.showMarketplaceBadge &&
  left.integrationStatus === right.integrationStatus &&
  left.showTraderaBadge === right.showTraderaBadge &&
  left.traderaStatus === right.traderaStatus &&
  left.showPlaywrightProgrammableBadge === right.showPlaywrightProgrammableBadge &&
  left.playwrightProgrammableStatus === right.playwrightProgrammableStatus &&
  areProductAiRunFeedbacksEqual(left.productAiRunFeedback, right.productAiRunFeedback);

const areProductListRowRuntimeStoreStatesEqual = (
  left: ProductListRowRuntimeStoreState,
  right: ProductListRowRuntimeStoreState
): boolean =>
  left.integrationBadgeIds === right.integrationBadgeIds &&
  left.integrationBadgeStatuses === right.integrationBadgeStatuses &&
  left.traderaBadgeIds === right.traderaBadgeIds &&
  left.traderaBadgeStatuses === right.traderaBadgeStatuses &&
  left.playwrightProgrammableBadgeIds === right.playwrightProgrammableBadgeIds &&
  left.playwrightProgrammableBadgeStatuses === right.playwrightProgrammableBadgeStatuses &&
  left.queuedProductIds === right.queuedProductIds &&
  left.productAiRunStatusByProductId === right.productAiRunStatusByProductId;

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
      baseProductId: string | null | undefined
    ): ProductListRowRuntimeContextType => {
      if (!productId) return EMPTY_PRODUCT_LIST_ROW_RUNTIME_SNAPSHOT;

      const normalizedBaseProductId =
        typeof baseProductId === 'string' && baseProductId.trim().length > 0
          ? baseProductId.trim()
          : '';
      const cacheKey = `${productId}::${normalizedBaseProductId}`;

      const nextSnapshot: ProductListRowRuntimeContextType = {
        showMarketplaceBadge:
          state.integrationBadgeIds.has(productId) || normalizedBaseProductId.length > 0,
        integrationStatus:
          state.integrationBadgeStatuses.get(productId) ??
          (normalizedBaseProductId.length > 0 ? 'active' : 'not_started'),
        showTraderaBadge: state.traderaBadgeIds.has(productId),
        traderaStatus: state.traderaBadgeStatuses.get(productId) ?? 'not_started',
        showVintedBadge: state.vintedBadgeIds.has(productId),
        vintedStatus: state.vintedBadgeStatuses.get(productId) ?? 'not_started',
        showPlaywrightProgrammableBadge: state.playwrightProgrammableBadgeIds.has(productId),
        playwrightProgrammableStatus:
          state.playwrightProgrammableBadgeStatuses.get(productId) ?? 'not_started',
        productAiRunFeedback: resolveProductAiRunFeedbackForList({
          productId,
          queuedProductIds: state.queuedProductIds,
          productAiRunStatusByProductId: state.productAiRunStatusByProductId,
        }),
      };

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
