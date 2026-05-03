import { CalendarDays, ExternalLink } from 'lucide-react';
import React, { startTransition } from 'react';

import { Badge, Button, Card } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import { formatFilemakerAddress } from '../../settings';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import type { FilemakerEvent } from '../../types';

type LinkedOrganizationEvent = FilemakerEvent & {
  eventStartDate?: string;
  legacyUuid?: string;
  organizationLinkCount?: number;
};

const formatOptionalValue = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'n/a';
};

export function OrganizationEventsSection(): React.JSX.Element {
  const { linkedEvents, router } = useAdminFilemakerOrganizationEditPageStateContext();

  return (
    <FormSection title='Linked Events' className='space-y-2 p-4'>
      {linkedEvents.length === 0 ? (
        <div className='text-xs text-gray-500'>No events linked yet.</div>
      ) : (
        <div className='grid gap-2'>
          {linkedEvents.map((event: FilemakerEvent) => {
            const linkedEvent = event as LinkedOrganizationEvent;
            return (
              <Card key={event.id} variant='subtle-compact' className='bg-card/20'>
                <div className='flex items-start justify-between gap-3 p-3'>
                  <div className='flex min-w-0 gap-2'>
                    <CalendarDays className='mt-0.5 size-3.5 shrink-0 text-blue-300' />
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-semibold text-white'>
                        {event.eventName}
                      </div>
                      <div className='truncate text-xs text-gray-300'>
                        {formatOptionalValue(linkedEvent.eventStartDate)} |{' '}
                        {formatFilemakerAddress(event)}
                      </div>
                      <div className='truncate text-[10px] text-gray-600'>
                        Legacy UUID: {formatOptionalValue(linkedEvent.legacyUuid)} | Updated:{' '}
                        {formatTimestamp(event.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <div className='flex shrink-0 items-center gap-2'>
                    {linkedEvent.organizationLinkCount !== undefined ? (
                      <Badge variant='outline' className='h-5 text-[10px]'>
                        {linkedEvent.organizationLinkCount}
                      </Badge>
                    ) : null}
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='size-7'
                      aria-label={`Open event ${event.eventName}`}
                      title={`Open event ${event.eventName}`}
                      onClick={(): void => {
                        startTransition(() => {
                          router.push(`/admin/filemaker/events/${encodeURIComponent(event.id)}`);
                        });
                      }}
                    >
                      <ExternalLink className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}
