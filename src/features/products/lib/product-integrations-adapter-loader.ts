import type { ComponentProps } from 'react';

export type ProductTriggerButtonBarProps = ComponentProps<
  typeof import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar').TriggerButtonBar
>;

export type ProductIntegrationsAdapterModule =
  typeof import('@/shared/lib/product-integrations-adapter');

let productIntegrationsAdapterPromise: Promise<ProductIntegrationsAdapterModule> | null = null;

export const loadProductIntegrationsAdapter =
  (): Promise<ProductIntegrationsAdapterModule> => {
    if (!productIntegrationsAdapterPromise) {
      productIntegrationsAdapterPromise = import('@/shared/lib/product-integrations-adapter');
    }
    return productIntegrationsAdapterPromise;
  };
