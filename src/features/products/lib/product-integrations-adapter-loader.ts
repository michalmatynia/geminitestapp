import type { ComponentProps } from 'react';

export type ProductTriggerButtonBarProps = ComponentProps<
  typeof import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar').TriggerButtonBar
>;

export type ProductIntegrationsAdapterModule =
  typeof import('@/features/integrations/public');

let productIntegrationsAdapterPromise: Promise<ProductIntegrationsAdapterModule> | null = null;

export const loadProductIntegrationsAdapter =
  (): Promise<ProductIntegrationsAdapterModule> => {
    if (!productIntegrationsAdapterPromise) {
      productIntegrationsAdapterPromise = import('@/features/integrations/public');
    }
    return productIntegrationsAdapterPromise;
  };
