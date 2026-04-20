'use client';

import type { JSX } from 'react';
import { Badge, Card } from '@/shared/ui/primitives.public';
import { KangurAdminStatusCard } from '@/features/kangur/admin/components/KangurAdminStatusCard';

interface DocumentationStatusPanelProps {
  adminDocsEnabled: boolean;
  tooltipsEnabled: boolean;
  titleId: string;
  descriptionId: string;
}

export function DocumentationStatusPanel({
  adminDocsEnabled,
  tooltipsEnabled,
  titleId,
  descriptionId,
}: DocumentationStatusPanelProps): JSX.Element {
  return (
    <div className='space-y-4 xl:sticky xl:top-24 xl:self-start'>
      <KangurAdminStatusCard
        title='Status'
        sticky={false}
        statusBadge={
          <Badge variant={adminDocsEnabled ? 'secondary' : 'outline'}>
            {adminDocsEnabled ? 'Tooltips active' : 'Tooltips off'}
          </Badge>
        }
        items={[
          {
            label: 'Docs tooltips',
            value: (
              <Badge variant={tooltipsEnabled ? 'secondary' : 'outline'}>
                {tooltipsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            ),
          },
          {
            label: 'Admin tooltips',
            value: (
              <Badge variant={adminDocsEnabled ? 'secondary' : 'outline'}>
                {adminDocsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            ),
          },
          {
            label: 'Surface',
            value: <Badge variant='outline'>Documentation</Badge>,
          },
        ]}
      />
      <Card
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        variant='subtle'
        padding='md'
        className='rounded-2xl border-border/60 bg-card/40 text-sm text-muted-foreground shadow-sm'
      >
        <div className='flex items-center gap-2'>
          <h2 id={titleId} className='text-base font-semibold text-foreground'>
            Documentation workspace
          </h2>
          <Badge variant='outline'>Shared surface</Badge>
        </div>
        <p id={descriptionId} className='mt-2 max-w-3xl text-sm font-normal text-muted-foreground'>
          Use this page to review the source guides behind Kangur tooltip content without
          mixing the documentation browser into the settings form.
        </p>
      </Card>
    </div>
  );
}
