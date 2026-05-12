'use client';

import React from 'react';

import { ProductListMarketplaceQuickButton } from './ProductListMarketplaceButton';
import {
  useVintedQuickListButtonModel,
  type VintedQuickListButtonProps,
} from './useVintedQuickListButtonModel';

export function VintedQuickListButton(
  props: VintedQuickListButtonProps
): React.JSX.Element | null {
  const model = useVintedQuickListButtonModel(props);
  if (!model.shouldRender) return null;

  return (
    <ProductListMarketplaceQuickButton
      type='button'
      onClick={() => {
        if (model.isFailureState && props.onOpenIntegrations !== undefined) {
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
      isPulsing={model.isProcessingOrQueued}
      toneClass={model.resolvedToneClass}
      label='V+'
      showCheckmark={model.showCheckmark}
      showFailureDot={model.isFailureState}
    />
  );
}
