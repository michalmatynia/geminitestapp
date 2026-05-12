import type { useTraderaListingActionForRuntimeKey } from '@/features/integrations/components/listings/hooks/useTraderaListingAction';
import type { PersistedTraderaQuickListFeedback } from '@/features/integrations/utils/traderaQuickListFeedback';
import type { useCustomFields } from '@/features/products/hooks/useProductMetadataQueries';
import type { PlaywrightRelistBrowserMode } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { hasProductMarketplaceExclusionSelection } from '@/shared/lib/products/utils/marketplace-exclusions';

import { getMarketplaceButtonClass, PROCESSING_STATUSES } from '../product-column-utils';
import { PRODUCT_LIST_MARKETPLACE_DISABLED_INTERACTION_CLASS } from './ProductListMarketplaceButton';
import {
  resolveTraderaQuickListButtonView,
  type TraderaQuickListButtonViewModel,
} from './traderaQuickListButtonView';

export const TRADERA_ACTION_SETTINGS_PENDING_MESSAGE =
  'Tradera listing action settings are still loading or saving. Retry in a moment.';

type TraderaQuickListRuntimeView = {
  feedback: {
    hasServerStatus: boolean;
    normalizedTraderaStatus: string;
    serverStatusInFlight: boolean;
  };
  effectiveLocalFeedback: PersistedTraderaQuickListFeedback | null;
  effectiveLocalFeedbackStatus: string | null;
  isClosedTraderaStatus: boolean;
};

type TraderaQuickListResolvedViewInput = {
  customFieldDefinitions: ReturnType<typeof useCustomFields>['data'];
  product: ProductWithImages;
  runtime: TraderaQuickListRuntimeView;
  submitting: boolean;
  traderaStatus: string;
};

type TraderaQuickListDisplayStateInput = {
  actionSettingsPending: boolean;
  isTraderaMarketplaceExcluded: boolean;
  resolvedView: TraderaQuickListButtonViewModel;
  runtime: TraderaQuickListRuntimeView;
};

type TraderaQuickListDisplayState = {
  disabledInteractionClass: string | false;
  disableQuickListAction: boolean;
  isWorkerRunning: boolean;
  resolvedToneClass: string;
  shouldPrefetchListings: boolean;
  title: string;
};

export type TraderaQuickListResolvedViewState = {
  isTraderaMarketplaceExcluded: boolean;
  resolvedView: TraderaQuickListButtonViewModel;
};

export const resolveQuickListActionSettingsPending = (
  quickListAction: ReturnType<typeof useTraderaListingActionForRuntimeKey>
): boolean =>
  quickListAction.loading === true ||
  quickListAction.saving === true ||
  quickListAction.hasUnsavedChanges === true;

export const resolveTraderaBrowserMode = (
  quickListAction: ReturnType<typeof useTraderaListingActionForRuntimeKey>
): PlaywrightRelistBrowserMode => (quickListAction.headless ? 'headless' : 'headed');

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const resolveTraderaQuickListResolvedView = ({
  customFieldDefinitions,
  product,
  runtime,
  submitting,
  traderaStatus,
}: TraderaQuickListResolvedViewInput): TraderaQuickListResolvedViewState => {
  const isTraderaMarketplaceExcluded = hasProductMarketplaceExclusionSelection({
    customFieldDefinitions,
    customFieldValues: product.customFields,
    marketplaceLabelOrAlias: 'Tradera',
  });
  return {
    isTraderaMarketplaceExcluded,
    resolvedView: resolveTraderaQuickListButtonView({
      normalizedTraderaStatus: runtime.feedback.normalizedTraderaStatus,
      localFeedbackStatus: runtime.effectiveLocalFeedbackStatus,
      localFeedback: runtime.effectiveLocalFeedback,
      submitting,
      hasServerStatus: runtime.feedback.hasServerStatus,
      serverStatusInFlight: runtime.feedback.serverStatusInFlight,
      isTraderaMarketplaceExcluded,
      traderaStatus,
      isClosedTraderaStatus: runtime.isClosedTraderaStatus,
    }),
  };
};

const isTraderaQuickListWorkerRunning = ({
  resolvedView,
  runtime,
}: Pick<TraderaQuickListDisplayStateInput, 'resolvedView' | 'runtime'>): boolean => {
  const serverWorkerRunning =
    PROCESSING_STATUSES.has(runtime.feedback.normalizedTraderaStatus) &&
    PROCESSING_STATUSES.has(resolvedView.resolvedButtonStatus);
  const queuedWorkerRunning =
    resolvedView.resolvedButtonStatus === 'queued' &&
    hasText(runtime.effectiveLocalFeedback?.runId);
  return serverWorkerRunning || queuedWorkerRunning;
};

const resolveDisabledInteractionClass = (
  resolvedView: TraderaQuickListButtonViewModel,
  disableForActionSettings: boolean
): string | false => {
  if (resolvedView.disabledInteractionClass !== false) return resolvedView.disabledInteractionClass;
  if (disableForActionSettings) return PRODUCT_LIST_MARKETPLACE_DISABLED_INTERACTION_CLASS;
  return false;
};

const resolveWorkerToneClass = ({
  isTraderaMarketplaceExcluded,
  isWorkerRunning,
  resolvedView,
}: Pick<
  TraderaQuickListDisplayStateInput,
  'isTraderaMarketplaceExcluded' | 'resolvedView'
> & {
  isWorkerRunning: boolean;
}): string => {
  if (isWorkerRunning && !isTraderaMarketplaceExcluded) {
    return getMarketplaceButtonClass('queued', true, 'tradera');
  }
  return resolvedView.resolvedToneClass;
};

export const resolveTraderaQuickListDisplayState = ({
  actionSettingsPending,
  isTraderaMarketplaceExcluded,
  resolvedView,
  runtime,
}: TraderaQuickListDisplayStateInput): TraderaQuickListDisplayState => {
  const isWorkerRunning = isTraderaQuickListWorkerRunning({ resolvedView, runtime });
  const disableForActionSettings = actionSettingsPending && !resolvedView.isFailureState;
  return {
    disabledInteractionClass: resolveDisabledInteractionClass(
      resolvedView,
      disableForActionSettings
    ),
    disableQuickListAction: resolvedView.disableQuickListAction || disableForActionSettings,
    isWorkerRunning,
    resolvedToneClass: resolveWorkerToneClass({
      isTraderaMarketplaceExcluded,
      isWorkerRunning,
      resolvedView,
    }),
    shouldPrefetchListings: resolvedView.shouldPrefetchListings && !disableForActionSettings,
    title: disableForActionSettings ? TRADERA_ACTION_SETTINGS_PENDING_MESSAGE : resolvedView.title,
  };
};
