import { Badge, Button } from '@/shared/ui/primitives.public';
import { Trash2 } from 'lucide-react';
import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';
import type { SelectorRegistryProbeSessionCluster } from '@/shared/contracts/integrations/selector-registry';
import type React from 'react';

type CarryForwardSource = {
  selectedKey: string;
};

type ClusterSectionProps = {
  cluster: SelectorRegistryProbeSessionCluster;
  isReadOnly: boolean;
  onPromoteReady: () => Promise<void>;
  onPromoteAndArchive: () => Promise<void>;
  onReject: () => Promise<void>;
  isPromoting: boolean;
  isArchiving: boolean;
  isRejecting: boolean;
  canArchive: boolean;
  clusterReadyCount: number;
  carryForwardSourcesByRole: Map<string, CarryForwardSource>;
};

type ClusterSectionActionsProps = Pick<
  ClusterSectionProps,
  | 'canArchive'
  | 'clusterReadyCount'
  | 'isArchiving'
  | 'isPromoting'
  | 'isReadOnly'
  | 'isRejecting'
  | 'onPromoteAndArchive'
  | 'onPromoteReady'
  | 'onReject'
>;

function ClusterCarryForwardBadges({
  carryForwardSourcesByRole,
  clusterKey,
}: {
  carryForwardSourcesByRole: Map<string, CarryForwardSource>;
  clusterKey: string;
}): React.JSX.Element | null {
  if (carryForwardSourcesByRole.size === 0) return null;
  return (
    <div className='flex flex-wrap gap-2 pt-1'>
      {Array.from(carryForwardSourcesByRole.entries()).map(([role, source]) => (
        <Badge key={`${clusterKey}:carry-forward:${role}`} variant='outline'>
          Carry-forward active for {role} {'->'} {source.selectedKey}
        </Badge>
      ))}
    </div>
  );
}

function ClusterSectionActions({
  canArchive,
  clusterReadyCount,
  isArchiving,
  isPromoting,
  isReadOnly,
  isRejecting,
  onPromoteAndArchive,
  onPromoteReady,
  onReject,
}: ClusterSectionActionsProps): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        type='button'
        size='sm'
        variant='outline'
        disabled={isReadOnly || clusterReadyCount === 0 || isPromoting}
        loading={isPromoting}
        loadingText='Promoting'
        onClick={() => {
          void onPromoteReady();
        }}
      >
        Promote Ready In Template
      </Button>
      <Button
        type='button'
        size='sm'
        variant='outline'
        disabled={isReadOnly || !canArchive || isArchiving}
        loading={isArchiving}
        loadingText='Archiving'
        onClick={() => {
          void onPromoteAndArchive();
        }}
      >
        Promote And Archive Template
      </Button>
      <Button
        type='button'
        size='sm'
        variant='outline'
        loading={isRejecting}
        loadingText='Rejecting'
        onClick={() => {
          void onReject();
        }}
      >
        {!isRejecting && <Trash2 className='mr-2 size-4' />}
        Reject Template
      </Button>
    </div>
  );
}

export function ClusterSection({
  cluster,
  isReadOnly,
  onPromoteReady,
  onPromoteAndArchive,
  onReject,
  isPromoting,
  isArchiving,
  isRejecting,
  canArchive,
  clusterReadyCount,
  carryForwardSourcesByRole,
}: ClusterSectionProps): React.JSX.Element {
  return (
    <div className='space-y-4 rounded-lg border border-border bg-background/40 p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-sm font-semibold'>{cluster.label}</h3>
            <Badge variant='outline'>{cluster.sessionCount} sessions</Badge>
            <Badge variant='outline'>{cluster.suggestionCount} suggestions</Badge>
            <Badge variant='outline'>{clusterReadyCount} ready</Badge>
            {cluster.roleSignature.map((role) => (
              <Badge key={`${cluster.clusterKey}:${role}`} variant='secondary'>
                {formatSelectorRegistryRoleLabel(role) ?? role}
              </Badge>
            ))}
          </div>
          <div className='text-xs text-muted-foreground'>
            Grouped by normalized path template and suggestion-role signature.
          </div>
          <ClusterCarryForwardBadges
            carryForwardSourcesByRole={carryForwardSourcesByRole}
            clusterKey={cluster.clusterKey}
          />
        </div>
        <ClusterSectionActions
          canArchive={canArchive}
          clusterReadyCount={clusterReadyCount}
          isArchiving={isArchiving}
          isPromoting={isPromoting}
          isReadOnly={isReadOnly}
          isRejecting={isRejecting}
          onPromoteAndArchive={onPromoteAndArchive}
          onPromoteReady={onPromoteReady}
          onReject={onReject}
        />
      </div>
    </div>
  );
}
