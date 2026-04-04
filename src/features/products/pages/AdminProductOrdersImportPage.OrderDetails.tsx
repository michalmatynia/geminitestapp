'use client';

import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

import type { BaseOrderImportPreviewItem } from '@/shared/contracts/products';
import {
  formatOrderDate,
  formatOrderTotal,
  formatItemsTotal,
  OrderChangeSummaryItem,
} from './AdminProductOrdersImportPage.utils';

interface OrderDetailsProps {
  order: BaseOrderImportPreviewItem;
  changeSummary: OrderChangeSummaryItem[];
  isPreviewStale: boolean;
  isImportPending: boolean;
  isQuickImportPending: boolean;
  onImport: (orders: BaseOrderImportPreviewItem[]) => void;
}

export const OrderDetails = React.memo(function OrderDetails({
  order,
  changeSummary,
  isPreviewStale,
  isImportPending,
  isQuickImportPending,
  onImport,
}: OrderDetailsProps) {
  return (
    <div className='rounded-xl border border-border/60 bg-card/10 p-4'>
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div className='space-y-4'>
          <div className='flex items-center justify-between gap-4'>
            <div className='space-y-1'>
              <h4 className='text-sm font-semibold text-white'>Order Items</h4>
              <p className='text-xs text-gray-400'>
                {order.lineItems.length} unique items across {formatItemsTotal(order)} units.
              </p>
            </div>
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={() => onImport([order])}
              disabled={isImportPending || isQuickImportPending || isPreviewStale}
              loading={isImportPending}
            >
              Import this order
            </Button>
          </div>
          <div className='max-h-[300px] overflow-y-auto rounded-lg border border-border/40 bg-black/20'>
            <table className='min-w-full text-left text-[11px]'>
              <thead className='sticky top-0 bg-gray-900/90 text-gray-500 uppercase tracking-wider'>
                <tr>
                  <th className='px-3 py-2'>SKU</th>
                  <th className='px-3 py-2'>Product</th>
                  <th className='px-3 py-2 text-right'>Qty</th>
                  <th className='px-3 py-2 text-right'>Price</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/20'>
                {order.lineItems.map((item, idx) => (
                  <tr key={`${item.sku}:${idx}`} className='hover:bg-white/5'>
                    <td className='px-3 py-2 font-mono text-gray-400'>{item.sku ?? '—'}</td>
                    <td className='px-3 py-2 text-gray-200 line-clamp-1'>{item.name ?? '—'}</td>
                    <td className='px-3 py-2 text-right text-gray-300'>{item.quantity}</td>
                    <td className='px-3 py-2 text-right text-gray-300'>
                      {formatOrderTotal(item.unitPriceGross, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className='space-y-4'>
          <div className='space-y-2 rounded-lg border border-border/60 bg-black/20 px-3 py-3 text-xs text-gray-300'>
            <div className='flex items-center justify-between gap-3'>
              <span>Order ID</span>
              <span className='font-mono text-gray-100'>{order.baseOrderId}</span>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <span>Total</span>
              <span className='text-right text-gray-100'>
                {formatOrderTotal(order.totalGross, order.currency)}
              </span>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <span>Items total</span>
              <span className='text-right text-gray-100'>{formatItemsTotal(order)}</span>
            </div>
          </div>
          <div className='space-y-2 rounded-lg border border-border/60 bg-black/20 px-3 py-3 text-xs text-gray-300'>
            <div className='flex items-center justify-between gap-3'>
              <span>Status</span>
              <span className='text-right text-gray-100'>
                {order.externalStatusName ?? order.externalStatusId ?? 'Unknown'}
              </span>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <span>Created</span>
              <span className='text-right text-gray-100'>{formatOrderDate(order.orderCreatedAt)}</span>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <span>Updated</span>
              <span className='text-right text-gray-100'>{formatOrderDate(order.orderUpdatedAt)}</span>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <span>Last import</span>
              <span className='text-right text-gray-100'>{formatOrderDate(order.lastImportedAt)}</span>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <span>Delivery</span>
              <span className='text-right text-gray-100'>{order.deliveryMethod ?? '—'}</span>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <span>Payment</span>
              <span className='text-right text-gray-100'>{order.paymentMethod ?? '—'}</span>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <span>Source</span>
              <span className='text-right text-gray-100'>{order.source ?? '—'}</span>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <span>Fingerprint</span>
              <span className='max-w-[14rem] truncate text-right font-mono text-[10px] text-gray-400'>
                {order.fingerprint}
              </span>
            </div>
          </div>
          {changeSummary.length > 0 ? (
            <div className='space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-3 text-xs text-blue-100/90'>
              <div className='text-xs uppercase tracking-[0.18em] text-blue-200/80'>
                Change Summary
              </div>
              <div className='flex flex-wrap gap-2'>
                {changeSummary.map((change) => (
                  <Badge key={change.key} variant='info'>
                    {change.label}
                  </Badge>
                ))}
              </div>
              <div className='space-y-2'>
                {changeSummary.map((change) => (
                  <div
                    key={`${change.key}:detail`}
                    className='flex items-start justify-between gap-3 rounded-md border border-blue-400/20 bg-blue-500/5 px-2 py-2'
                  >
                    <span className='text-blue-200/80'>{change.label.replace(' changed', '')}</span>
                    <span className='text-right text-blue-50'>
                      {change.previous} {'->'} {change.current}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {order.previousImport ? (
            <div className='space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-xs text-amber-100/90'>
              <div className='text-xs uppercase tracking-[0.18em] text-amber-200/80'>
                Previous Import
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Status</span>
                <span className='text-right text-amber-50'>
                  {order.previousImport.externalStatusName ??
                    order.previousImport.externalStatusId ??
                    'Unknown'}
                </span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Total</span>
                <span className='text-right text-amber-50'>
                  {formatOrderTotal(order.previousImport.totalGross, order.previousImport.currency)}
                </span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Items total</span>
                <span className='text-right text-amber-50'>
                  {formatItemsTotal(order.previousImport)}
                </span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Updated</span>
                <span className='text-right text-amber-50'>
                  {formatOrderDate(order.previousImport.orderUpdatedAt)}
                </span>
              </div>
              <div className='flex items-center justify-between gap-3'>
                <span>Imported at</span>
                <span className='text-right text-amber-50'>
                  {formatOrderDate(order.previousImport.lastImportedAt)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
OrderDetails.displayName = 'OrderDetails';
