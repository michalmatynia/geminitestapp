'use client';

import { SkullIcon } from 'lucide-react';
import React from 'react';

import { AdminAiPathsBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { Badge } from '@/shared/ui/primitives.public';
import { ListPanel } from '@/shared/ui/navigation-and-layout.public';

import { JobQueuePanel } from '../components/job-queue-panel';

export function AdminAiPathsDeadLetterPage(): React.JSX.Element {
  return (
    <div className='space-y-6'>
      <ListPanel
        variant='flat'
        className='[&>div:first-child]:mb-3'
        header={
          <AdminTitleBreadcrumbHeader
            title={<h1 className='text-3xl font-bold tracking-tight text-white'>Dead Letter Queue</h1>}
            breadcrumb={
              <AdminAiPathsBreadcrumbs
                parent={{ label: 'Queue', href: '/admin/ai-paths/queue' }}
                current='Dead Letter'
              />
            }
            actions={
              <Badge variant='destructive' className='gap-1.5'>
                <SkullIcon className='size-3.5' />
                Failed Runs
              </Badge>
            }
          />
        }
      >
        <JobQueuePanel
          visibility='global'
          isActive
        />
      </ListPanel>
    </div>
  );
}
