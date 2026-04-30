'use client';

import React from 'react';

import { useShippingGroupsState } from './ShippingGroupsContext';
import { ShippingGroupListAlert } from './ShippingGroupListAlert';
import { ShippingGroupSettingsList } from './ShippingGroupSettingsList';

export function ShippingGroupList(): React.JSX.Element | null {
  const state = useShippingGroupsState();
  const hasSelectedCatalog =
    typeof state.selectedCatalogId === 'string' && state.selectedCatalogId.length > 0;

  if (!hasSelectedCatalog) return null;

  return (
    <div className='space-y-4'>
      <ShippingGroupListAlert state={state} />
      <ShippingGroupSettingsList state={state} />
    </div>
  );
}
