'use client';

import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  fetchPreferredBaseConnection,
  integrationSelectionQueryKeys,
} from '@/shared/lib/product-integrations-adapter';
import { useGenericExportToBaseMutation } from '@/shared/lib/product-integrations-adapter';
import type { ProductWithImages } from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
import { invalidateProductListingsAndBadges } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { AppModal, Button, useToast } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { getMarketplaceButtonClass } from '../product-column-utils';

const INTEGRATION_SELECTION_STALE_TIME_MS = 5 * 60 * 1000;
const defaultExportInventoryQueryKey = QUERY_KEYS.integrations.defaultExportInventory();
const oneClickExportInFlight = new Set<string>();

type QuickExportContext = {
  connectionId: string;
  inventoryId: string;
  templateId: string;
};

type SkuCheckResponse = {
  sku?: string;
  exists?: boolean;
  existingProductId?: string | null;
};

type ExistingSkuDecisionState = QuickExportContext & {
  sku: string;
  existingProductId: string | null;
};

export function BaseQuickExportButton(props: {
  product: ProductWithImages;
  status: string;
  prefetchListings: () => void;
  showMarketplaceBadge: boolean;
  onOpenIntegrations?: (() => void) | undefined;
}): React.JSX.Element {
  const { product, status, prefetchListings, showMarketplaceBadge, onOpenIntegrations } = props;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const quickExportMutation = useGenericExportToBaseMutation();
  const quickExportLockRef = useRef(false);
  const [quickExportLocked, setQuickExportLocked] = useState(false);
  const [existingSkuDecision, setExistingSkuDecision] = useState<ExistingSkuDecisionState | null>(
    null
  );
  const [linkExistingPending, setLinkExistingPending] = useState(false);

  const resolveQuickExportContext = async (): Promise<QuickExportContext | null> => {
    try {
      const [preferredConnection, defaultInventory] = await Promise.all([
        fetchQueryV2<{ connectionId?: string | null }>(queryClient, {
          queryKey: normalizeQueryKey(integrationSelectionQueryKeys.defaultConnection),
          queryFn: () => fetchPreferredBaseConnection(),
          staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
          meta: {
            source: 'products.columns.buttons.BaseQuickExport.resolveContext.preferredConnection',
            operation: 'detail',
            resource: 'integrations.default-connection',
            domain: 'integrations',
            queryKey: normalizeQueryKey(integrationSelectionQueryKeys.defaultConnection),
            tags: ['integrations', 'default-connection', 'fetch'],
            description: 'Loads integrations default connection.'},
        })(),
        fetchQueryV2<{ inventoryId?: string | null }>(queryClient, {
          queryKey: normalizeQueryKey(defaultExportInventoryQueryKey),
          queryFn: () =>
            api.get<{ inventoryId?: string | null }>(
              '/api/v2/integrations/exports/base/default-inventory'
            ),
          staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
          meta: {
            source: 'products.columns.buttons.BaseQuickExport.resolveContext.defaultInventory',
            operation: 'detail',
            resource: 'integrations.default-inventory',
            domain: 'integrations',
            queryKey: normalizeQueryKey(defaultExportInventoryQueryKey),
            tags: ['integrations', 'default-inventory', 'fetch'],
            description: 'Loads integrations default inventory.'},
        })(),
      ]);

      const connectionId = preferredConnection?.connectionId?.trim() || '';
      const inventoryId = defaultInventory?.inventoryId?.trim() || '';

      if (!connectionId) {
        toast('Set a default Base.com connection first.', { variant: 'error' });
        return null;
      }

      if (!inventoryId) {
        toast(
          'Specific Base.com inventory is not configured. Open Export Settings and set inventory.',
          { variant: 'error' }
        );
        return null;
      }

      const inventoriesResponse = await api.post<{
        inventories?: Array<{ inventory_id?: string | number; id?: string | number }>;
      }>('/api/v2/integrations/imports/base', {
        action: 'inventories',
        connectionId,
      });

      const availableInventoryIds = new Set(
        (Array.isArray(inventoriesResponse.inventories) ? inventoriesResponse.inventories : [])
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

      if (availableInventoryIds.size > 0 && !availableInventoryIds.has(inventoryId)) {
        toast(
          'Configured Base.com inventory is not available for this connection. Open Export Settings and select a valid inventory.',
          { variant: 'error' }
        );
        return null;
      }

      const scopedTemplate = await api.get<{ templateId?: string | null }>(
        `/api/v2/integrations/exports/base/active-template?connectionId=${encodeURIComponent(connectionId)}&inventoryId=${encodeURIComponent(inventoryId)}`
      );
      const templateId = scopedTemplate?.templateId?.trim() || '';

      return {
        connectionId,
        inventoryId,
        templateId,
      };
    } catch {
      toast('Failed to load Base.com export defaults.', { variant: 'error' });
      return null;
    }
  };

  const runQuickExportMutation = async (context: QuickExportContext): Promise<void> => {
    const payload: {
      productId: string;
      connectionId: string;
      inventoryId: string;
      templateId?: string;
      requestId?: string;
    } = {
      productId: product.id,
      connectionId: context.connectionId,
      inventoryId: context.inventoryId,
      requestId: `one-click:${product.id}:${context.connectionId}:${context.inventoryId}:${Math.floor(Date.now() / 30000)}`,
    };

    if (context.templateId) {
      payload.templateId = context.templateId;
    }

    try {
      await quickExportMutation.mutateAsync(payload);
      prefetchListings();
      void invalidateProductListingsAndBadges(queryClient, product.id);
      toast('Base.com export started.', { variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export to Base.com.';
      toast(message, { variant: 'error' });
    }
  };

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
      const context = await resolveQuickExportContext();
      if (!context) return;

      if (!showMarketplaceBadge) {
        const sku = (product.sku ?? '').trim();
        if (sku) {
          let skuCheck: SkuCheckResponse;
          try {
            skuCheck = await api.post<SkuCheckResponse>(
              `/api/v2/integrations/products/${product.id}/base/sku-check`,
              {
                connectionId: context.connectionId,
                inventoryId: context.inventoryId,
              }
            );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to verify SKU in Base.com. Export was not started.';
            toast(message, { variant: 'error' });
            return;
          }

          if (skuCheck.exists) {
            setExistingSkuDecision({
              ...context,
              sku: (skuCheck.sku ?? sku).trim() || sku,
              existingProductId: skuCheck.existingProductId?.trim() || null,
            });
            return;
          }
        }
      }

      await runQuickExportMutation(context);
    } finally {
      quickExportLockRef.current = false;
      oneClickExportInFlight.delete(product.id);
      setQuickExportLocked(false);
    }
  };

  const handleCloseDecisionModal = (): void => {
    if (linkExistingPending) return;
    setExistingSkuDecision(null);
  };

  const handleSetupNewConnection = (): void => {
    setExistingSkuDecision(null);
    if (onOpenIntegrations) {
      onOpenIntegrations();
      return;
    }
    toast('Open integrations to set up a new Base.com connection.', {
      variant: 'info',
    });
  };

  const handleLinkExistingProduct = async (): Promise<void> => {
    if (!existingSkuDecision) return;
    if (linkExistingPending) return;

    const externalListingId = existingSkuDecision.existingProductId?.trim() || '';
    if (!externalListingId) {
      toast('Existing Base.com product ID is missing. Use "Set up new connection" instead.', {
        variant: 'error',
      });
      return;
    }

    setLinkExistingPending(true);
    try {
      await api.post(`/api/v2/integrations/products/${product.id}/base/link-existing`, {
        connectionId: existingSkuDecision.connectionId,
        inventoryId: existingSkuDecision.inventoryId,
        externalListingId,
      });

      prefetchListings();
      await invalidateProductListingsAndBadges(queryClient, product.id);
      setExistingSkuDecision(null);
      toast('Linked to existing Base.com product.', { variant: 'success' });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to link product to existing Base.com listing.';
      toast(message, { variant: 'error' });
    } finally {
      setLinkExistingPending(false);
    }
  };

  const label = showMarketplaceBadge
    ? `One-click re-export to Base.com (${status}).`
    : 'One-click export to Base.com';

  const quickExportPending = quickExportMutation.isPending || quickExportLocked;

  return (
    <>
      <Button
        type='button'
        disabled={quickExportPending}
        onClick={(): void => {
          void runQuickExport();
        }}
        onMouseEnter={prefetchListings}
        onFocus={prefetchListings}
        variant='ghost'
        size='icon'
        aria-label={label}
        title={label}
        className={cn(
          'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
          !showMarketplaceBadge && quickExportPending && 'cursor-not-allowed opacity-60',
          getMarketplaceButtonClass(status, showMarketplaceBadge, 'base')
        )}
      >
        <span
          aria-hidden='true'
          className='text-[9px] font-black uppercase leading-none tracking-tight'
        >
          {quickExportPending ? '...' : 'BL'}
        </span>
      </Button>

      <AppModal
        open={Boolean(existingSkuDecision)}
        onOpenChange={(open) => {
          if (!open) handleCloseDecisionModal();
        }}
        onClose={handleCloseDecisionModal}
        title='SKU already exists in Base.com'
        subtitle='Choose whether to link this product or start a new connection flow.'
        size='sm'
      >
        <div className='space-y-4'>
          <p className='text-sm text-gray-300'>
            SKU <span className='font-mono text-white'>{existingSkuDecision?.sku ?? '—'}</span>{' '}
            already exists in the selected Base.com inventory.
          </p>

          <div className='rounded-md border border-border/60 bg-card/40 p-3 text-xs text-gray-300'>
            Existing Base product ID:{' '}
            <span className='font-mono text-white'>
              {existingSkuDecision?.existingProductId ?? 'Unavailable'}
            </span>
          </div>

          {!existingSkuDecision?.existingProductId && (
            <p className='text-xs text-amber-300'>
              Could not resolve existing Base.com product ID. Linking is disabled. Use "Set up new
              connection".
            </p>
          )}

          <div className='flex items-center justify-end gap-2 border-t border-border/60 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={handleCloseDecisionModal}
              disabled={linkExistingPending}
            >
              Cancel
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={handleSetupNewConnection}
              disabled={linkExistingPending}
            >
              Set up new connection
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                void handleLinkExistingProduct();
              }}
              disabled={linkExistingPending || !existingSkuDecision?.existingProductId}
            >
              {linkExistingPending ? 'Linking...' : 'Link existing product'}
            </Button>
          </div>
        </div>
      </AppModal>
    </>
  );
}
