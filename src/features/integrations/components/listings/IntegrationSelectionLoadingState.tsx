'use client';

import React from 'react';

import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

import { resolveIntegrationSelectionLoadingMessage } from './product-listings-copy';

type IntegrationSelectionLoadingStateProps =
  | {
      variant: 'inline-text';
      className?: string;
    }
  | {
      variant: 'loading-state';
      className?: string;
      containerClassName?: string;
      size?: 'xs' | 'sm' | 'md' | 'lg';
    };

export function IntegrationSelectionLoadingState(
  props: IntegrationSelectionLoadingStateProps
): React.JSX.Element {
  const message = resolveIntegrationSelectionLoadingMessage();

  if (props.variant === 'inline-text') {
    return <p className={props.className}>{message}</p>;
  }

  const loading = <LoadingState message={message} size={props.size ?? 'sm'} className={props.className} />;

  return props.containerClassName ? <div className={props.containerClassName}>{loading}</div> : loading;
}
