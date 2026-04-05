'use client';

import { Badge, Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

import {
  getFilemakerOrganizationById,
  getFilemakerPersonById,
} from '../../settings';
import { formatTimestamp } from '../filemaker-page-utils';
import type {
  FilemakerDatabase,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttempt,
  FilemakerEmailCampaignDeliveryStatus,
} from '../../types';

interface RunDeliveryLogSectionProps {
  deliveries: FilemakerEmailCampaignDelivery[];
  attemptsByDeliveryId: Map<string, FilemakerEmailCampaignDeliveryAttempt[]>;
  database: FilemakerDatabase;
  retryableDeliveryIds: Set<string>;
  exhaustedRetryDeliveryIds: Set<string>;
  handleRetryDelivery: (deliveryId: string) => Promise<void>;
  isUpdatePending: boolean;
  deliveryStatusLabels: Record<FilemakerEmailCampaignDeliveryStatus, string>;
}

const resolveRecipientLabel = (
  database: FilemakerDatabase,
  delivery: FilemakerEmailCampaignDelivery
): string => {
  if (delivery.partyKind === 'person') {
    const person = getFilemakerPersonById(database, delivery.partyId);
    if (!person) return delivery.partyId;
    return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || person.id;
  }

  const organization = getFilemakerOrganizationById(database, delivery.partyId);
  return organization?.name || organization?.id || delivery.partyId;
};

export function RunDeliveryLogSection({
  deliveries,
  attemptsByDeliveryId,
  database,
  retryableDeliveryIds,
  exhaustedRetryDeliveryIds,
  handleRetryDelivery,
  isUpdatePending,
  deliveryStatusLabels,
}: RunDeliveryLogSectionProps): React.JSX.Element {
  return (
    <FormSection title='Delivery Log' className='space-y-4 p-4'>
      {deliveries.length === 0 ? (
        <div className='text-sm text-gray-500'>No recipients identified for this run yet.</div>
      ) : (
        <div className='space-y-3'>
          {deliveries.map((delivery) => {
            const attempts = attemptsByDeliveryId.get(delivery.id) ?? [];
            const latestAttempt = attempts[0] ?? null;
            const isRetryable = retryableDeliveryIds.has(delivery.id);
            const isExhausted = exhaustedRetryDeliveryIds.has(delivery.id);
            const recipientLabel = resolveRecipientLabel(database, delivery);
            const latestAttemptError =
              latestAttempt?.errorMessage?.trim() || latestAttempt?.providerMessage?.trim() || null;

            return (
              <div
                key={delivery.id}
                className='space-y-3 rounded-md border border-border/60 bg-card/25 p-3 text-sm'
              >
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='flex items-center gap-2 font-medium text-white'>
                      <span className='truncate'>{delivery.emailAddress}</span>
                      <Badge variant='outline' className='shrink-0 text-[10px]'>
                        {deliveryStatusLabels[delivery.status] ?? delivery.status}
                      </Badge>
                    </div>
                    <div className='text-[11px] text-gray-400'>
                      {recipientLabel} • {delivery.partyKind} • Attempts: {attempts.length}
                    </div>
                  </div>

                  {isRetryable ? (
                    <Button
                      type='button'
                      size='xs'
                      variant='outline'
                      disabled={isUpdatePending}
                      onClick={() => {
                        void handleRetryDelivery(delivery.id);
                      }}
                    >
                      Retry Now
                    </Button>
                  ) : null}

                  {isExhausted ? (
                    <Badge
                      variant='secondary'
                      className='border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-400'
                    >
                      Retries Exhausted
                    </Badge>
                  ) : null}
                </div>

                {latestAttempt ? (
                  <div className='rounded border border-border/40 bg-card/40 p-2 text-[11px]'>
                    <div className='flex items-center justify-between text-gray-400'>
                      <span>
                        Latest attempt:{' '}
                        {formatTimestamp(latestAttempt.attemptedAt ?? latestAttempt.createdAt)}
                      </span>
                      <span className='font-mono uppercase'>
                        {latestAttempt.provider ?? 'unknown'}
                      </span>
                    </div>
                    {latestAttemptError ? (
                      <div className='mt-1 break-all font-mono text-rose-300'>
                        {latestAttemptError}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}
