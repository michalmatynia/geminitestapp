'use client';

import React from 'react';

import { ProductImageRouteSections } from './ProductImageRoutingSettings.sections';
import { useProductImageRoutingSettingsController } from './ProductImageRoutingSettings.controller';

export function ProductImageRoutingSettings(): React.JSX.Element {
  const controller = useProductImageRoutingSettingsController();
  return <ProductImageRouteSections controller={controller} />;
}
