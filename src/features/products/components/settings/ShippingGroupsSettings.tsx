'use client';

import type React from 'react';

import { useShippingGroupsSettingsController } from './ShippingGroupsSettings.controller';
import { ShippingGroupsSettingsView } from './ShippingGroupsSettings.view';

export function ShippingGroupsSettings(): React.JSX.Element {
  const viewProps = useShippingGroupsSettingsController();
  return <ShippingGroupsSettingsView {...viewProps} />;
}
