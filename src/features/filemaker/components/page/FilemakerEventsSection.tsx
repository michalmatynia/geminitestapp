'use client';

import { CalendarDays } from 'lucide-react';
import React from 'react';

import { FilemakerEntityCardsSection } from '../shared/FilemakerEntityCardsSection';
import { useAdminFilemakerPageContext } from '../../context/AdminFilemakerPageContext';
import { formatFilemakerAddress } from '../../settings';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

import type { FilemakerEvent } from '../../types';

export function FilemakerEventsSection(): React.JSX.Element {
  const { database, openCreateEvent, handleStartEditEvent, handleDeleteEvent, updateSetting } =
    useAdminFilemakerPageContext();

  return (
    <FilemakerEntityCardsSection
      title='Events'
      addLabel='Add Event'
      emptyTitle='No events'
      emptyDescription='No events added yet.'
      items={database.events}
      renderMain={(event: FilemakerEvent) => (
        <>
          <div className='flex items-center gap-2 text-sm font-semibold text-white'>
            <CalendarDays className='size-3.5 text-amber-200' />
            {event.eventName}
          </div>
          <div className='text-[11px] text-gray-400'>{formatFilemakerAddress(event)}</div>
        </>
      )}
      renderMeta={(event: FilemakerEvent) => (
        <div className='text-[10px] text-gray-600'>Updated: {formatTimestamp(event.updatedAt)}</div>
      )}
      onAdd={openCreateEvent}
      onEdit={handleStartEditEvent}
      onDelete={(event: FilemakerEvent): void => {
        void handleDeleteEvent(event.id);
      }}
      isPending={updateSetting.isPending}
    />
  );
}
