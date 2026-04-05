'use client';

import React from 'react';

import { useListingSelection } from '@/features/integrations/context/ListingSettingsContext';

import { BaseListingSettings } from './BaseListingSettings';
import { TraderaListingSettings } from './TraderaListingSettings';

type IntegrationSpecificListingSettingsProps = {
  includeTradera?: boolean;
  withSectionDivider?: boolean;
};

function ListingSettingsSection({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <div className='pt-4 border-t border-border'>{children}</div>;
}

export function IntegrationSpecificListingSettings({
  includeTradera = true,
  withSectionDivider = true,
}: IntegrationSpecificListingSettingsProps): React.JSX.Element | null {
  const { isBaseComIntegration, isTraderaIntegration, selectedConnectionId } = useListingSelection();

  if (!selectedConnectionId) {
    return null;
  }

  const renderSetting = (content: React.ReactNode): React.ReactNode =>
    withSectionDivider ? <ListingSettingsSection>{content}</ListingSettingsSection> : content;

  return (
    <>
      {isBaseComIntegration && renderSetting(<BaseListingSettings />)}
      {includeTradera && isTraderaIntegration && renderSetting(<TraderaListingSettings />)}
    </>
  );
}
