'use client';

import React from 'react';
import type {
  SelectorRegistryProbeSession,
  SelectorRegistryProbeSessionCluster,
} from '@/shared/contracts/integrations/selector-registry';
import { Badge } from '@/shared/ui/primitives.public';
import { ArchivedClusterItem } from './ArchivedClusterItem';

export type ArchivedSessionsSectionProps = {
  archivedClusters: SelectorRegistryProbeSessionCluster[];
  archivedSessions: SelectorRegistryProbeSession[];
  isPending: boolean;
  onRestoreSession: (id: string) => Promise<void>;
  onRestoreTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
  onRejectSession: (id: string) => Promise<void>;
  onRejectTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
  onPromoteAndArchiveSession: (id: string) => Promise<void>;
  onPromoteAndArchiveTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
};

export function ArchivedSessionsSection(props: ArchivedSessionsSectionProps): React.JSX.Element {
  const { archivedClusters, archivedSessions, isPending, ...actions } = props;

  return (
    <div className='space-y-4 rounded-lg border border-border/70 bg-muted/10 p-4'>
      <div className='space-y-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <h3 className='text-sm font-semibold'>Archived Sessions</h3>
          <Badge variant='outline'>{archivedClusters.length} templates</Badge>
          <Badge variant='outline'>{archivedSessions.length} archived</Badge>
        </div>
        <div className='text-xs text-muted-foreground'>
          Archived probe sessions are kept for audit only and do not participate in active review actions.
        </div>
      </div>

      <div className='space-y-4'>
        {archivedClusters.map((cluster) => (
          <ArchivedClusterItem
            key={`archived:${cluster.clusterKey}`}
            cluster={cluster}
            isPending={isPending}
            {...actions}
          />
        ))}
      </div>
    </div>
  );
}
