import React from 'react';
import type {
  SelectorRegistryProbeSessionCluster,
} from '@/shared/contracts/integrations/selector-registry';
import {
  Badge,
} from '@/shared/ui/primitives.public';
import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';

export type ProbeClusterSectionProps = {
  resolvedClusters: SelectorRegistryProbeSessionCluster[];
};

/**
 * Renders the active probe session clusters.
 */
export const ProbeClusterSection = ({
  resolvedClusters,
}: ProbeClusterSectionProps): React.JSX.Element => {
  return (
    <div className='space-y-4'>
      {resolvedClusters.map((cluster) => (
        <div
          key={`active:${cluster.clusterKey}`}
          className='space-y-4 rounded-md border border-border/70 bg-background/50 p-4'
        >
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h4 className='text-sm font-semibold'>{cluster.label}</h4>
                <Badge variant='outline'>{cluster.sessionCount} sessions</Badge>
                <Badge variant='outline'>{cluster.suggestionCount} suggestions</Badge>
                {cluster.roleSignature.map((role) => (
                  <Badge key={`active:${cluster.clusterKey}:${role}`} variant='secondary'>
                    {formatSelectorRegistryRoleLabel(role) ?? role}
                  </Badge>
                ))}
              </div>
              <div className='text-xs text-muted-foreground'>
                Active template history grouped by normalized path and role signature.
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
