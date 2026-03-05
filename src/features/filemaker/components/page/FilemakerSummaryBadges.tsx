'use client';

import React from 'react';
import { Badge } from '@/shared/ui';
import { useAdminFilemakerPageStateContext } from '../../context/AdminFilemakerPageContext';

export function FilemakerSummaryBadges(): React.JSX.Element {
  const { database } = useAdminFilemakerPageStateContext();

  return (
    <div className='flex flex-wrap gap-2'>
      <Badge variant='outline' className='text-[10px]'>
        Persons: {database.persons.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Organizations: {database.organizations.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Events: {database.events.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Phone Numbers: {database.phoneNumbers.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Phone Links: {database.phoneNumberLinks.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Emails: {database.emails.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Email Links: {database.emailLinks.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Event-Organization Links: {database.eventOrganizationLinks.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Addresses: {database.addresses.length}
      </Badge>
    </div>
  );
}
