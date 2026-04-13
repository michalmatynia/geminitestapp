'use client';

import React from 'react';

import { FormSection } from '@/shared/ui/forms-and-actions.public';

import { IntegrationSelectionLoadingState } from './IntegrationSelectionLoadingState';
import { IntegrationSelectorFields } from './IntegrationSelectorFields';
import {
  IntegrationSelectorCopyStrategy,
  useIntegrationSelectorProps,
} from './hooks/useIntegrationSelectorProps';

type ConnectedIntegrationFieldsSectionProps = {
  title: string;
  variant?: 'default' | 'compact' | 'subtle' | 'subtle-compact' | 'glass';
  className?: string;
  strategy?: IntegrationSelectorCopyStrategy;
  loadingVariant?: 'inline-text' | 'loading-state';
  loadingClassName?: string;
  loadingSize?: 'xs' | 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
};

export function ConnectedIntegrationFieldsSection(
  props: ConnectedIntegrationFieldsSectionProps
): React.JSX.Element {
  const {
    title,
    variant,
    className,
    strategy = 'list',
    loadingVariant = 'inline-text',
    loadingClassName,
    loadingSize,
    footer,
  } = props;

  const { loading } = useIntegrationSelectorProps(strategy);

  return (
    <FormSection title={title} variant={variant} className={className}>
      {loading ? (
        <IntegrationSelectionLoadingState
          variant={loadingVariant}
          className={loadingClassName}
          size={loadingSize}
        />
      ) : (
        <>
          <IntegrationSelectorFields strategy={strategy} />
          {footer ?? null}
        </>
      )}
    </FormSection>
  );
}
