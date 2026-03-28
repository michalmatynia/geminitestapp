'use client';

import React from 'react';
import { Badge, Button, FormSection } from '@/shared/ui';
import { formatTimestamp } from '../filemaker-page-utils';
import type {
  FilemakerEmailCampaignDelivery,
} from '../../types';

interface RunDeliveryLogSectionProps {
  deliveries: FilemakerEmailCampaignDelivery[];
  attemptsByDeliveryId: Map<string, any[]>;
  database: any;
  retryableDeliveryIds: Set<string>;
  exhaustedRetryDeliveryIds: Set<string>;
  handleRetryDelivery: (deliveryId: string) => Promise<void>;
  isUpdatePending: boolean;
  DELIVERY_STATUS_LABELS: Record<string, string>;
}

export const RunDeliveryLogSection = ({
  deliveries,
  attemptsByDeliveryId,
  database,
  retryableDeliveryIds,
  exhaustedRetryDeliveryIds,
  handleRetryDelivery,
  isUpdatePending,
  DELIVERY_STATUS_LABELS,
}: RunDeliveryLogSectionProps) => (
  <FormSection title='Delivery Log' className='space-y-4 p-4'>
    {deliveries.length === 0 ? (
      <div className='text-sm text-gray-500'>No recipients identified for this run yet.</div>
    ) : (
      <div className='space-y-3'>
        {deliveries.map((delivery) => {
          const person = delivery.personId ? database.persons[delivery.personId] : null;
          const org = delivery.organizationId ? database.organizations[delivery.organizationId] : null;
          const attempts = attemptsByDeliveryId.get(delivery.id) ?? [];
          const latestAttempt = attempts[0];
          const isRetryable = retryableDeliveryIds.has(delivery.id);
          const isExhausted = exhaustedRetryDeliveryIds.has(delivery.id);

          return (
            <div
              key={delivery.id}
              className='space-y-3 rounded-md border border-border/60 bg-card/25 p-3 text-sm'
            >
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex items-center gap-2 font-medium text-white'>
                    <span className='truncate'>{delivery.recipientEmail}</span>
                    <Badge variant='outline' className='text-[10px] shrink-0'>
                      {DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status}
                    </Badge>
                  </div>
                  <div className='text-[11px] text-gray-400'>
                    {person?.name || org?.name || 'Unknown recipient'} • Attempts: {attempts.length}
                  </div>
                </div>
                {isRetryable && (
                  <Button
                    type='button'
                    size='xs'
                    variant='outline'
                    disabled={isUpdatePending}
                    onClick={() => void handleRetryDelivery(delivery.id)}
                  >
                    Retry Now
                  </Button>
                )}
                {isExhausted && (
                  <Badge variant='secondary' className='text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20'>
                    Retries Exhausted
                  </Badge>
                )}
              </div>
              {latestAttempt && (
                <div className='rounded border border-border/40 bg-card/40 p-2 text-[11px]'>
                  <div className='flex items-center justify-between text-gray-400'>
                    <span>Latest attempt: {formatTimestamp(latestAttempt.attemptedAt || latestAttempt.createdAt)}</span>
                    <span className='font-mono uppercase'>{latestAttempt.provider}</span>
                  </div>
                  {latestAttempt.error && (
                    <div className='mt-1 font-mono text-rose-300 break-all'>{latestAttempt.error}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </FormSection>
);
