'use client';

import React from 'react';

import { ProductListMarketplaceQuickButton } from './ProductListMarketplaceButton';
import {
  useTraderaQuickListButtonModel,
  type TraderaQuickListButtonProps,
} from './useTraderaQuickListButtonModel';

export function TraderaQuickListButton(
  props: TraderaQuickListButtonProps
): React.JSX.Element | null {
  const model = useTraderaQuickListButtonModel(props);
  if (!model.shouldRender) return null;

  return (
    <ProductListMarketplaceQuickButton
      type='button'
      onClick={() => {
        if (model.isTraderaMarketplaceExcluded) return;
        if (model.isFailureState && props.onOpenIntegrations) {
          props.onOpenIntegrations(model.recoveryContext);
          return;
        }
        model.handleClick();
      }}
      onMouseEnter={model.shouldPrefetchListings ? model.prefetchListings : undefined}
      onFocus={model.shouldPrefetchListings ? model.prefetchListings : undefined}
      disabled={model.disableQuickListAction}
      aria-label={model.resolvedLabel}
      title={model.title}
      disabledInteractionClass={model.disabledInteractionClass}
      isPulsing={model.isWorkerRunning}
      toneClass={model.resolvedToneClass}
      label='T+'
      showCheckmark={model.showCheckmark}
      showFailureDot={model.isFailureState}
    />
  );
}
