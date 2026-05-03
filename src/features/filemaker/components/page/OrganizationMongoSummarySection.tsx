'use client';

import React from 'react';

import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { Badge } from '@/shared/ui/primitives.public';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import type { FilemakerPartySnapshotCounts } from '../../filemaker-party-snapshot.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

type CountItem = {
  key: keyof FilemakerPartySnapshotCounts;
  label: string;
};

const COUNT_ITEMS: CountItem[] = [
  { key: 'addresses', label: 'Addresses' },
  { key: 'persons', label: 'Persons' },
  { key: 'events', label: 'Events' },
  { key: 'emails', label: 'Emails' },
  { key: 'websites', label: 'Websites' },
  { key: 'contactLogs', label: 'Contact Logs' },
  { key: 'demands', label: 'Demand' },
  { key: 'harvestProfiles', label: 'Harvest' },
];

function CountBadge(props: {
  count: number;
  label: string;
}): React.JSX.Element {
  return (
    <Badge variant='outline' className='justify-between gap-2 text-[10px]'>
      <span>{props.label}</span>
      <span className='font-mono'>{props.count.toLocaleString()}</span>
    </Badge>
  );
}

export function OrganizationMongoSummarySection(): React.JSX.Element | null {
  const { relationshipSummary } = useAdminFilemakerOrganizationEditPageStateContext();
  if (relationshipSummary === null) return null;

  return (
    <FormSection title='Mongo Relationship Snapshot' className='space-y-3 p-4'>
      <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
        {COUNT_ITEMS.map((item: CountItem) => (
          <CountBadge
            key={item.key}
            label={item.label}
            count={relationshipSummary.counts[item.key]}
          />
        ))}
      </div>
      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Total: {relationshipSummary.counts.total.toLocaleString()}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Rebuilt: {formatTimestamp(relationshipSummary.rebuiltAt)}
        </Badge>
        {relationshipSummary.latestContactLogAt === undefined ? null : (
          <Badge variant='outline' className='text-[10px]'>
            Latest Contact: {formatTimestamp(relationshipSummary.latestContactLogAt)}
          </Badge>
        )}
      </div>
    </FormSection>
  );
}
