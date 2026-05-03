import type { ComponentProps } from 'react';
import type * as ProductIntegrationsAdapter from '@/features/integrations/product-integrations-adapter';
import type * as TriggerButtonBarModule from '@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar';

export type ProductTriggerButtonBarProps = ComponentProps<
  typeof TriggerButtonBarModule.TriggerButtonBar
>;

export type ProductIntegrationsAdapterModule = typeof ProductIntegrationsAdapter;

let productIntegrationsAdapterPromise: Promise<ProductIntegrationsAdapterModule> | null = null;

export const loadProductIntegrationsAdapter =
  (): Promise<ProductIntegrationsAdapterModule> => {
    productIntegrationsAdapterPromise ??= import('@/features/integrations/product-integrations-adapter');
    return productIntegrationsAdapterPromise;
  };
