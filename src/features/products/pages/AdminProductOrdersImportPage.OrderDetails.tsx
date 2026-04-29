'use client';

import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

import type { BaseOrderImportPreviewItem } from '@/shared/contracts/products/orders-import';
import {
  formatOrderDate,
  formatOrderTotal,
  formatItemsTotal,
  type OrderChangeSummaryItem,
} from './AdminProductOrdersImportPage.utils';

import { useOrdersImportContext } from './AdminProductOrdersImportPage.context';

interface OrderDetailsProps {
  order: BaseOrderImportPreviewItem;
  onImport: (orders: BaseOrderImportPreviewItem[]) => void;
}

type OrderLineItem = BaseOrderImportPreviewItem['lineItems'][number];

const EMPTY_CHANGE_SUMMARY: OrderChangeSummaryItem[] = [];

function OrderItemRow({
  currency,
  index,
  item,
}: {
  currency: string;
  index: number;
  item: OrderLineItem;
}): React.JSX.Element {
  return (
    <tr key={`${item.sku}:${index}`} className='hover:bg-white/5'>
      <td className='px-3 py-2 font-mono text-gray-400'>{item.sku ?? '—'}</td>
      <td className='px-3 py-2 text-gray-200 line-clamp-1'>{item.name}</td>
      <td className='px-3 py-2 text-right text-gray-300'>{item.quantity}</td>
      <td className='px-3 py-2 text-right text-gray-300'>
        {formatOrderTotal(item.unitPriceGross, currency)}
      </td>
    </tr>
  );
}

function DetailRow({
  label,
  value,
  valueClassName = 'text-right text-gray-100',
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}): React.JSX.Element {
  return (
    <div className='flex items-center justify-between gap-3'>
      <span>{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

function OrderItemsPanel({
  disabled,
  isImportPending,
  onImport,
  order,
}: {
  disabled: boolean;
  isImportPending: boolean;
  onImport: (orders: BaseOrderImportPreviewItem[]) => void;
  order: BaseOrderImportPreviewItem;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-4'>
        <div className='space-y-1'>
          <h4 className='text-sm font-semibold text-white'>Order Items</h4>
          <p className='text-xs text-gray-400'>
            {order.lineItems.length} unique items across {formatItemsTotal(order)} units.
          </p>
        </div>
        <Button type='button' size='xs' variant='outline' onClick={() => onImport([order])} disabled={disabled} loading={isImportPending}>
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
            {order.lineItems.map((item, index) => (
              <OrderItemRow key={`${item.sku}:${index}`} item={item} index={index} currency={order.currency} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderMetadataPanel({ order }: { order: BaseOrderImportPreviewItem }): React.JSX.Element {
  return (
    <>
      <div className='space-y-2 rounded-lg border border-border/60 bg-black/20 px-3 py-3 text-xs text-gray-300'>
        <DetailRow label='Order ID' value={order.baseOrderId} valueClassName='font-mono text-gray-100' />
        <DetailRow label='Total' value={formatOrderTotal(order.totalGross, order.currency)} />
        <DetailRow label='Items total' value={formatItemsTotal(order)} />
      </div>
      <div className='space-y-2 rounded-lg border border-border/60 bg-black/20 px-3 py-3 text-xs text-gray-300'>
        <DetailRow label='Status' value={order.externalStatusName ?? order.externalStatusId ?? 'Unknown'} />
        <DetailRow label='Created' value={formatOrderDate(order.orderCreatedAt)} />
        <DetailRow label='Updated' value={formatOrderDate(order.orderUpdatedAt)} />
        <DetailRow label='Last import' value={formatOrderDate(order.lastImportedAt)} />
        <DetailRow label='Delivery' value={order.deliveryMethod ?? '—'} />
        <DetailRow label='Payment' value={order.paymentMethod ?? '—'} />
        <DetailRow label='Source' value={order.source ?? '—'} />
        <DetailRow
          label='Fingerprint'
          value={order.fingerprint}
          valueClassName='max-w-[14rem] truncate text-right font-mono text-[10px] text-gray-400'
        />
      </div>
    </>
  );
}

function ChangeSummaryPanel({
  changeSummary,
}: {
  changeSummary: OrderChangeSummaryItem[];
}): React.JSX.Element | null {
  if (changeSummary.length === 0) return null;

  return (
    <div className='space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-3 text-xs text-blue-100/90'>
      <div className='text-xs uppercase tracking-[0.18em] text-blue-200/80'>Change Summary</div>
      <div className='flex flex-wrap gap-2'>
        {changeSummary.map((change) => (
          <Badge key={change.key} variant='info'>{change.label}</Badge>
        ))}
      </div>
      <div className='space-y-2'>
        {changeSummary.map((change) => (
          <div key={`${change.key}:detail`} className='flex items-start justify-between gap-3 rounded-md border border-blue-400/20 bg-blue-500/5 px-2 py-2'>
            <span className='text-blue-200/80'>{change.label.replace(' changed', '')}</span>
            <span className='text-right text-blue-50'>{change.previous} {'->'} {change.current}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviousImportPanel({ order }: { order: BaseOrderImportPreviewItem }): React.JSX.Element | null {
  const previousImport = order.previousImport;
  if (previousImport === null || previousImport === undefined) return null;

  return (
    <div className='space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-xs text-amber-100/90'>
      <div className='text-xs uppercase tracking-[0.18em] text-amber-200/80'>Previous Import</div>
      <DetailRow label='Status' value={previousImport.externalStatusName ?? previousImport.externalStatusId ?? 'Unknown'} valueClassName='text-right text-amber-50' />
      <DetailRow label='Total' value={formatOrderTotal(previousImport.totalGross, previousImport.currency)} valueClassName='text-right text-amber-50' />
      <DetailRow label='Items total' value={formatItemsTotal(previousImport)} valueClassName='text-right text-amber-50' />
      <DetailRow label='Updated' value={formatOrderDate(previousImport.orderUpdatedAt)} valueClassName='text-right text-amber-50' />
      <DetailRow label='Imported at' value={formatOrderDate(previousImport.lastImportedAt)} valueClassName='text-right text-amber-50' />
    </div>
  );
}

export const OrderDetails = React.memo(({
  order,
  onImport,
}: OrderDetailsProps): React.JSX.Element => {
  const { isPreviewStale, importMutation, quickImportMutation } = useOrdersImportContext();
  const isImportPending = importMutation.isPending;
  const isQuickImportPending = quickImportMutation.isPending;
  const disabled = isImportPending || isQuickImportPending || isPreviewStale;

  return (
    <div className='rounded-xl border border-border/60 bg-card/10 p-4'>
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <OrderItemsPanel disabled={disabled} isImportPending={isImportPending} onImport={onImport} order={order} />
        <div className='space-y-4'>
          <OrderMetadataPanel order={order} />
          <ChangeSummaryPanel changeSummary={EMPTY_CHANGE_SUMMARY} />
          <PreviousImportPanel order={order} />
        </div>
      </div>
    </div>
  );
});
OrderDetails.displayName = 'OrderDetails';
