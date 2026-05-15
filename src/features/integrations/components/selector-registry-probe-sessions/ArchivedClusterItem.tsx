'use client';

import React from 'react';
import type {
  SelectorRegistryProbeSessionCluster,
} from '@/shared/contracts/integrations/selector-registry';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';
import { ArchivedSessionCard } from './ArchivedSessionCard';

export type ArchivedClusterItemProps = {
  cluster: SelectorRegistryProbeSessionCluster;
  isPending: boolean;
  onRestoreTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
  onRejectTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
  onPromoteAndArchiveTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
  onRestoreSession: (id: string) => Promise<void>;
  onRejectSession: (id: string) => Promise<void>;
  onPromoteAndArchiveSession: (id: string) => Promise<void>;
};

function ArchivedClusterHeader(props: { 
  cluster: SelectorRegistryProbeSessionCluster; 
  isPending: boolean;
  onRestoreTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
  onRejectTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
  onPromoteAndArchiveTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
}): React.JSX.Element {
  const { cluster, isPending, onRestoreTemplate, onRejectTemplate, onPromoteAndArchiveTemplate } = props;
  const sessionIds = cluster.sessions.map((s) => s.id);

  return (
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <div className='space-y-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <h4 className='text-sm font-semibold'>{cluster.label}</h4>
          <Badge variant='outline'>{cluster.sessionCount} sessions</Badge>
          <Badge variant='outline'>{cluster.suggestionCount} suggestions</Badge>
          {cluster.roleSignature.map((role) => (
            <Badge key={`archived:${cluster.clusterKey}:${role}`} variant='secondary'>
              {formatSelectorRegistryRoleLabel(role) ?? role}
            </Badge>
          ))}
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <Button type='button' size='sm' variant='outline' disabled={isPending} onClick={() => { void onRestoreTemplate(cluster.clusterKey, sessionIds); }}>
          Restore Template
        </Button>
        <Button type='button' size='sm' variant='outline' disabled={isPending} onClick={() => { void onRejectTemplate(cluster.clusterKey, sessionIds); }}>
          Reject Template
        </Button>
        <Button type='button' size='sm' variant='outline' disabled={isPending} onClick={() => { void onPromoteAndArchiveTemplate(cluster.clusterKey, sessionIds); }}>
          Promote And Archive Template
        </Button>
      </div>
    </div>
  );
}

export function ArchivedClusterItem(props: ArchivedClusterItemProps): React.JSX.Element {
  const { cluster, isPending, onRestoreSession, onRejectSession, onPromoteAndArchiveSession } = props;

  return (
    <div className='space-y-4 rounded-md border border-border/70 bg-background/50 p-4'>
      <ArchivedClusterHeader {...props} />
      <div className='space-y-3'>
        {cluster.sessions.map((session) => (
          <ArchivedSessionCard
            key={`archived:${session.id}`}
            session={session}
            isPending={isPending}
            onRestoreSession={onRestoreSession}
            onRejectSession={onRejectSession}
            onPromoteAndArchiveSession={onPromoteAndArchiveSession}
          />
        ))}
      </div>
    </div>
  );
}
