'use client';

import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { 
  fetchPreferredBaseConnection, 
  integrationSelectionQueryKeys 
} from '@/features/integrations/components/listings/hooks/useIntegrationSelection';
import { useGenericExportToBaseMutation } from '@/features/integrations/hooks/useProductListingMutations';
import { invalidateProductListings } from '@/shared/lib/query-invalidation';
import type { ProductWithImages } from '@/shared/contracts/products';
import { getMarketplaceButtonClass } from '../product-column-utils';

const INTEGRATION_SELECTION_STALE_TIME_MS = 5 * 60 * 1000;
const INTEGRATION_SELECTION_GC_TIME_MS = 30 * 60 * 1000;
const defaultExportInventoryQueryKey = QUERY_KEYS.integrations.defaultExportInventory();
const oneClickExportInFlight = new Set<string>();

export function BaseQuickExportButton({
  product,
  status,
  prefetchListings,
  showMarketplaceBadge,
  onOpenSettings,
}: {
  product: ProductWithImages;
  status: string;
  prefetchListings: () => void;
  showMarketplaceBadge: boolean;
  onOpenSettings?: (() => void) | undefined;
}): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const quickExportMutation = useGenericExportToBaseMutation();
  const quickExportLockRef = useRef(false);
  const [quickExportLocked, setQuickExportLocked] = useState(false);

  const runQuickExport = async (): Promise<void> => {
    if (
      quickExportLockRef.current ||
      quickExportMutation.isPending ||
      oneClickExportInFlight.has(product.id)
    ) {
      return;
    }
    quickExportLockRef.current = true;
    oneClickExportInFlight.add(product.id);
    setQuickExportLocked(true);

    try {
      let connectionId = '';
      let inventoryId = '';
      let templateId = '';
      try {
        const [preferredConnection, defaultInventory] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: integrationSelectionQueryKeys.defaultConnection,
            queryFn: fetchPreferredBaseConnection,
            staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
            gcTime: INTEGRATION_SELECTION_GC_TIME_MS,
          }),
          queryClient.fetchQuery({
            queryKey: defaultExportInventoryQueryKey,
            queryFn: () => api.get<{ inventoryId?: string | null }>('/api/integrations/exports/base/default-inventory'),
            staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
            gcTime: INTEGRATION_SELECTION_GC_TIME_MS,
          }),
        ]);
        connectionId = preferredConnection?.connectionId?.trim() || '';
        inventoryId = defaultInventory?.inventoryId?.trim() || '';
        if (!connectionId) {
          toast('Set a default Base.com connection first.', { variant: 'error' });
          return;
        }
        if (!inventoryId) {
          toast(
            'Specific Base.com inventory is not configured. Open Export Settings and set inventory.',
            { variant: 'error' }
          );
          return;
        }

        const inventoriesResponse = await api.post<{
          inventories?: Array<{ inventory_id?: string | number; id?: string | number }>;
        }>('/api/integrations/imports/base', {
          action: 'inventories',
          connectionId,
        });
        const availableInventoryIds = new Set(
          (Array.isArray(inventoriesResponse.inventories)
            ? inventoriesResponse.inventories
            : []
          )
            .map((entry) => {
              const rawId = entry.inventory_id ?? entry.id;
              if (typeof rawId === 'string') return rawId.trim();
              if (typeof rawId === 'number' && Number.isFinite(rawId)) {
                return String(rawId);
              }
              return '';
            })
            .filter((value) => value.length > 0)
        );
        if (
          availableInventoryIds.size > 0 &&
          !availableInventoryIds.has(inventoryId)
        ) {
          toast(
            'Configured Base.com inventory is not available for this connection. Open Export Settings and select a valid inventory.',
            { variant: 'error' }
          );
          return;
        }

        if (connectionId && inventoryId) {
          const scopedTemplate = await api.get<{ templateId?: string | null }>(
            `/api/integrations/exports/base/active-template?connectionId=${encodeURIComponent(connectionId)}&inventoryId=${encodeURIComponent(inventoryId)}`
          );
          templateId = scopedTemplate?.templateId?.trim() || '';
        }
      } catch {
        toast('Failed to load Base.com export defaults.', { variant: 'error' });
        return;
      }

      if (!connectionId) {
        toast('Set a default Base.com connection first.', { variant: 'error' });
        return;
      }

      if (!inventoryId) {
        toast(
          'Specific Base.com inventory is not configured. Open Export Settings and set inventory.',
          { variant: 'error' }
        );
        return;
      }

      const payload: {
        productId: string;
        connectionId: string;
        inventoryId: string;
        templateId?: string;
        requestId?: string;
      } = {
        productId: product.id,
        connectionId,
        inventoryId,
        requestId: `one-click:${product.id}:${connectionId}:${inventoryId}:${Math.floor(Date.now() / 30000)}`,
      };
      if (templateId) {
        payload.templateId = templateId;
      }

      try {
        await quickExportMutation.mutateAsync(payload);
        prefetchListings();
        void invalidateProductListings(queryClient, product.id);
        toast('Base.com export started.', { variant: 'success' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to export to Base.com.';
        toast(message, { variant: 'error' });
      }
    } finally {
      quickExportLockRef.current = false;
      oneClickExportInFlight.delete(product.id);
      setQuickExportLocked(false);
    }
  };

  const label = showMarketplaceBadge
    ? `Manage Base listing (${status}).`
    : 'One-click export to Base.com';
  const quickExportPending = quickExportMutation.isPending || quickExportLocked;

  return (
    <Button
      type='button'
      disabled={!showMarketplaceBadge && quickExportPending}
      onClick={
        showMarketplaceBadge && onOpenSettings
          ? onOpenSettings
          : (): void => {
            void runQuickExport();
          }
      }
      onMouseEnter={prefetchListings}
      onFocus={prefetchListings}
      variant='ghost'
      size='icon'
      aria-label={label}
      title={label}
      className={cn(
        'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
        (!showMarketplaceBadge && quickExportPending) && 'cursor-not-allowed opacity-60',
        getMarketplaceButtonClass(status, showMarketplaceBadge, 'base')
      )}
    >
      <span aria-hidden='true' className='text-[9px] font-black uppercase leading-none tracking-tight'>
        {quickExportPending ? '...' : 'BL'}
      </span>
    </Button>
  );
}
