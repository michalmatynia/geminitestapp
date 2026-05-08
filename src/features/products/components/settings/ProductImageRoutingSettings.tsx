'use client';

import React from 'react';

import {
  ProductImageRouteSections,
  ProductImageServingSections,
  ProductStudioSections,
} from './ProductImageRoutingSettings.sections';
import {
  useProductImageRoutingSettingsController,
  useProductImageServingSettingsController,
  useProductStudioSettingsController,
} from './ProductImageRoutingSettings.controller';

export function ProductImageServingSettings(): React.JSX.Element {
  const controller = useProductImageServingSettingsController();
  return <ProductImageServingSections controller={controller} />;
}

export function ProductStudioSettings(): React.JSX.Element {
  const controller = useProductStudioSettingsController();
  return <ProductStudioSections controller={controller} />;
}

export function ProductImageRoutingSettings(): React.JSX.Element {
  const controller = useProductImageRoutingSettingsController();
  return <ProductImageRouteSections controller={controller} />;
}
