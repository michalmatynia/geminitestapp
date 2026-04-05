'use client';

import React, { type Dispatch, type SetStateAction } from 'react';

import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import { IntegrationSelector } from '@/shared/ui/forms-and-actions.public';

import { IntegrationSelectionEmptyState } from './IntegrationSelectionEmptyState';
import { IntegrationSelectionLoadingState } from './IntegrationSelectionLoadingState';

type ConnectedIntegrationSelectorProps = {
  integrations: IntegrationWithConnections[];
  loading: boolean;
  selectedIntegrationId: string;
  selectedConnectionId: string;
  setSelectedIntegrationId: Dispatch<SetStateAction<string>>;
  setSelectedConnectionId: Dispatch<SetStateAction<string>>;
  emptyStateVariant: 'alert-link' | 'card-link';
  emptyStateMessage: string;
  emptyStateSetupLabel: string;
  loadingVariant: 'inline-text' | 'loading-state';
  loadingClassName?: string;
  loadingContainerClassName?: string;
  loadingSize?: 'xs' | 'sm' | 'md' | 'lg';
};

export function ConnectedIntegrationSelector(
  props: ConnectedIntegrationSelectorProps
): React.JSX.Element {
  const {
    integrations,
    loading,
    selectedIntegrationId,
    selectedConnectionId,
    setSelectedIntegrationId,
    setSelectedConnectionId,
    emptyStateVariant,
    emptyStateMessage,
    emptyStateSetupLabel,
    loadingVariant,
    loadingClassName,
    loadingContainerClassName,
    loadingSize,
  } = props;

  if (loading) {
    return (
      <IntegrationSelectionLoadingState
        variant={loadingVariant}
        className={loadingClassName}
        containerClassName={loadingContainerClassName}
        size={loadingSize}
      />
    );
  }

  if (integrations.length === 0) {
    return (
      <IntegrationSelectionEmptyState
        variant={emptyStateVariant}
        message={emptyStateMessage}
        setupLabel={emptyStateSetupLabel}
      />
    );
  }

  return (
    <IntegrationSelector
      integrations={integrations}
      selectedIntegrationId={selectedIntegrationId}
      onIntegrationChange={setSelectedIntegrationId}
      selectedConnectionId={selectedConnectionId}
      onConnectionChange={setSelectedConnectionId}
    />
  );
}
