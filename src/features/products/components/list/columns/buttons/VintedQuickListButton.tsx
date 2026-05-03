'use client';

import { Check } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils/ui-utils';

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
    <Button
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
      variant='ghost'
      size='icon'
      disabled={model.disableQuickListAction}
      aria-label={model.resolvedLabel}
      title={model.title}
      className={cn(
        'relative size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
        model.isProcessingOrQueued && 'animate-pulse',
        model.resolvedToneClass,
        model.disabledInteractionClass
      )}
    >
      {model.showCheckmark ? (
        <Check className='h-3 w-3' aria-hidden='true' />
      ) : (
        <span
          aria-hidden='true'
          className='text-[10px] font-black uppercase leading-none tracking-tight'
        >
          V+
        </span>
      )}
      {model.isFailureState ? (
        <span
          aria-hidden='true'
          className='absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-rose-500'
        />
      ) : null}
    </Button>
  );
}
