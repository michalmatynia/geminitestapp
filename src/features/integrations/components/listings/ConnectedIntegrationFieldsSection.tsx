'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { FormSection } from '@/shared/ui';

import { IntegrationSelectionLoadingState } from './IntegrationSelectionLoadingState';
import { IntegrationSelectorFields } from './IntegrationSelectorFields';

type ConnectedIntegrationFieldsSectionProps = {
  title: string;
  variant?: 'default' | 'compact' | 'subtle' | 'subtle-compact' | 'glass';
  className?: string;
  loading: boolean;
  loadingVariant: 'inline-text' | 'loading-state';
  loadingClassName?: string;
  loadingSize?: 'xs' | 'sm' | 'md' | 'lg';
  marketplaceLabel: string;
  marketplacePlaceholder: string;
  selectedIntegrationId: string | null | undefined;
  onIntegrationChange: (value: string) => void;
  integrationOptions: Array<LabeledOptionDto<string>>;
  showAccountField: boolean;
  accountLabel: string;
  accountPlaceholder: string;
  selectedConnectionId: string | null | undefined;
  onConnectionChange: (value: string) => void;
  connectionOptions: Array<LabeledOptionDto<string>>;
  accountDescription?: string | null | undefined;
  footer?: React.ReactNode;
};

export function ConnectedIntegrationFieldsSection(
  props: ConnectedIntegrationFieldsSectionProps
): React.JSX.Element {
  const {
    title,
    variant,
    className,
    loading,
    loadingVariant,
    loadingClassName,
    loadingSize,
    marketplaceLabel,
    marketplacePlaceholder,
    selectedIntegrationId,
    onIntegrationChange,
    integrationOptions,
    showAccountField,
    accountLabel,
    accountPlaceholder,
    selectedConnectionId,
    onConnectionChange,
    connectionOptions,
    accountDescription,
    footer,
  } = props;

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
          <IntegrationSelectorFields
            marketplaceLabel={marketplaceLabel}
            marketplacePlaceholder={marketplacePlaceholder}
            selectedIntegrationId={selectedIntegrationId}
            onIntegrationChange={onIntegrationChange}
            integrationOptions={integrationOptions}
            showAccountField={showAccountField}
            accountLabel={accountLabel}
            accountPlaceholder={accountPlaceholder}
            selectedConnectionId={selectedConnectionId}
            onConnectionChange={onConnectionChange}
            connectionOptions={connectionOptions}
            accountDescription={accountDescription}
          />
          {footer ?? null}
        </>
      )}
    </FormSection>
  );
}
