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

interface RunDeliveryLogSectionData {
  deliveries: FilemakerEmailCampaignDelivery[];
  attemptsByDeliveryId: Map<string, FilemakerEmailCampaignDeliveryAttempt[]>;
  database: FilemakerDatabase;
  retryableDeliveryIds: Set<string>;
  exhaustedRetryDeliveryIds: Set<string>;
}

interface RunDeliveryLogSectionActions {
  handleRetryDelivery: (deliveryId: string) => Promise<void>;
  isUpdatePending: boolean;
}

interface RunDeliveryLogSectionProps {
  data: RunDeliveryLogSectionData;
  actions: RunDeliveryLogSectionActions;
  deliveryStatusLabels: Record<FilemakerEmailCampaignDeliveryStatus, string>;
}

const resolveRecipientLabel = (
  database: FilemakerDatabase,
  delivery: FilemakerEmailCampaignDelivery
): string => {
  if (delivery.partyKind === 'person') {
    const person = getFilemakerPersonById(database, delivery.partyId);
    if (person === null) return delivery.partyId;
    const fullName = [person.firstName, person.lastName]
      .filter((value) => value.length > 0)
      .join(' ')
      .trim();
    return fullName.length > 0 ? fullName : person.id;
  }

  const organization = getFilemakerOrganizationById(database, delivery.partyId);
  if (organization === null) return delivery.partyId;
  return organization.name.length > 0 ? organization.name : organization.id;
};

const getLatestAttemptError = (
  latestAttempt: FilemakerEmailCampaignDeliveryAttempt | null
): string | null => {
  if (latestAttempt === null) return null;
  const errorMessage = latestAttempt.errorMessage?.trim() ?? '';
  if (errorMessage.length > 0) return errorMessage;
  const providerMessage = latestAttempt.providerMessage?.trim() ?? '';
  return providerMessage.length > 0 ? providerMessage : null;
};

function RunDeliveryLogEntryHeader({
  attemptsCount,
  delivery,
  isExhausted,
  isRetryable,
  isUpdatePending,
  onRetry,
  recipientLabel,
  statusLabel,
}: {
  attemptsCount: number;
  delivery: FilemakerEmailCampaignDelivery;
  isExhausted: boolean;
  isRetryable: boolean;
  isUpdatePending: boolean;
  onRetry: () => void;
  recipientLabel: string;
  statusLabel: string;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-start justify-between gap-2'>
      <div className='min-w-0 flex-1 space-y-1'>
        <div className='flex items-center gap-2 font-medium text-white'>
          <span className='truncate'>{delivery.emailAddress}</span>
          <Badge variant='outline' className='shrink-0 text-[10px]'>
            {statusLabel}
          </Badge>
        </div>
        <div className='text-[11px] text-gray-400'>
          {recipientLabel} • {delivery.partyKind} • Attempts: {attemptsCount}
        </div>
      </div>

      {isRetryable ? (
        <Button
          type='button'
          size='xs'
          variant='outline'
          disabled={isUpdatePending}
          onClick={onRetry}
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
  );
}

function RunDeliveryLatestAttempt({
  latestAttempt,
  latestAttemptError,
}: {
  latestAttempt: FilemakerEmailCampaignDeliveryAttempt | null;
  latestAttemptError: string | null;
}): React.JSX.Element | null {
  if (latestAttempt === null) return null;

  return (
    <div className='rounded border border-border/40 bg-card/40 p-2 text-[11px]'>
      <div className='flex items-center justify-between text-gray-400'>
        <span>
          Latest attempt: {formatTimestamp(latestAttempt.attemptedAt ?? latestAttempt.createdAt)}
        </span>
        <span className='font-mono uppercase'>
          {latestAttempt.provider ?? 'unknown'}
        </span>
      </div>
      {latestAttemptError !== null ? (
        <div className='mt-1 break-all font-mono text-rose-300'>
          {latestAttemptError}
        </div>
      ) : null}
    </div>
  );
}

function RunDeliveryLogEntry({
  attempts,
  database,
  delivery,
  deliveryStatusLabels,
  exhaustedRetryDeliveryIds,
  handleRetryDelivery,
  isUpdatePending,
  retryableDeliveryIds,
}: {
  attempts: FilemakerEmailCampaignDeliveryAttempt[];
  database: FilemakerDatabase;
  delivery: FilemakerEmailCampaignDelivery;
  deliveryStatusLabels: Record<FilemakerEmailCampaignDeliveryStatus, string>;
  exhaustedRetryDeliveryIds: Set<string>;
  handleRetryDelivery: (deliveryId: string) => Promise<void>;
  isUpdatePending: boolean;
  retryableDeliveryIds: Set<string>;
}): React.JSX.Element {
  const latestAttempt = attempts[0] ?? null;
  const isRetryable = retryableDeliveryIds.has(delivery.id);
  const isExhausted = exhaustedRetryDeliveryIds.has(delivery.id);
  const recipientLabel = resolveRecipientLabel(database, delivery);
  const latestAttemptError = getLatestAttemptError(latestAttempt);

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-card/25 p-3 text-sm'>
      <RunDeliveryLogEntryHeader
        attemptsCount={attempts.length}
        delivery={delivery}
        isExhausted={isExhausted}
        isRetryable={isRetryable}
        isUpdatePending={isUpdatePending}
        onRetry={() => {
          void handleRetryDelivery(delivery.id);
        }}
        recipientLabel={recipientLabel}
        statusLabel={deliveryStatusLabels[delivery.status]}
      />
      <RunDeliveryLatestAttempt
        latestAttempt={latestAttempt}
        latestAttemptError={latestAttemptError}
      />
    </div>
  );
}

export function RunDeliveryLogSection({
  data,
  actions,
  deliveryStatusLabels,
}: RunDeliveryLogSectionProps): React.JSX.Element {
  const { deliveries, attemptsByDeliveryId, database, retryableDeliveryIds, exhaustedRetryDeliveryIds } = data;
  const { handleRetryDelivery, isUpdatePending } = actions;

  return (
    <FormSection title='Delivery Log' className='space-y-4 p-4'>
      {deliveries.length === 0 ? (
        <div className='text-sm text-gray-500'>No recipients identified for this run yet.</div>
      ) : (
        <div className='space-y-3'>
          {deliveries.map((delivery) => (
            <RunDeliveryLogEntry
              key={delivery.id}
              attempts={attemptsByDeliveryId.get(delivery.id) ?? []}
              database={database}
              delivery={delivery}
              deliveryStatusLabels={deliveryStatusLabels}
              exhaustedRetryDeliveryIds={exhaustedRetryDeliveryIds}
              handleRetryDelivery={handleRetryDelivery}
              isUpdatePending={isUpdatePending}
              retryableDeliveryIds={retryableDeliveryIds}
            />
          ))}
        </div>
      )}
    </FormSection>
  );
}
