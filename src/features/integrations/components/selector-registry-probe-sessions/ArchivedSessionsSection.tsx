import React from 'react';
import type {
  SelectorRegistryProbeSession,
  SelectorRegistryProbeSessionCluster,
} from '@/shared/contracts/integrations/selector-registry';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';
import { SelectorRegistryProbeSuggestionBadges } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-badges';
import {
  getSelectorRegistryProbeSuggestionEvidenceText,
  getSelectorRegistryProbeSuggestionPrimaryPageLabel,
  getSelectorRegistryProbeSuggestionTextPreview,
} from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-formatting';
import { SelectorRegistryProbeSuggestionCandidateDetails } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-candidates';

const formatTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

export const ArchivedSessionsSection = ({
  archivedClusters,
  archivedSessions,
  restoreMutation,
  onRestoreSession,
  onRestoreTemplate,
  onRejectSession,
  onRejectTemplate,
  onPromoteAndArchiveSession,
  onPromoteAndArchiveTemplate,
}: {
  archivedClusters: SelectorRegistryProbeSessionCluster[];
  archivedSessions: SelectorRegistryProbeSession[];
  restoreMutation: any;
  onRestoreSession: (id: string) => Promise<void>;
  onRestoreTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
  onRejectSession: (id: string) => Promise<void>;
  onRejectTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
  onPromoteAndArchiveSession: (id: string) => Promise<void>;
  onPromoteAndArchiveTemplate: (clusterKey: string, sessionIds: string[]) => Promise<void>;
}): React.JSX.Element => {
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
          <div
            key={`archived:${cluster.clusterKey}`}
            className='space-y-4 rounded-md border border-border/70 bg-background/50 p-4'
          >
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
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={restoreMutation.isPending}
                  onClick={() => onRestoreTemplate(cluster.clusterKey, cluster.sessions.map((s) => s.id))}
                >
                  Restore Template
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={restoreMutation.isPending}
                  onClick={() => onRejectTemplate(cluster.clusterKey, cluster.sessions.map((s) => s.id))}
                >
                  Reject Template
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={restoreMutation.isPending}
                  onClick={() => onPromoteAndArchiveTemplate(cluster.clusterKey, cluster.sessions.map((s) => s.id))}
                >
                  Promote And Archive Template
                </Button>
              </div>
            </div>
            <div className='space-y-3'>
              {cluster.sessions.map((session) => (
                <div
                  key={`archived:${session.id}`}
                  className='space-y-3 rounded-md border border-border/60 bg-muted/10 p-4'
                >
                  <div className='space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge variant='outline'>{session.profile}</Badge>
                      <Badge variant='outline'>{session.scannedPages} pages</Badge>
                      <Badge variant='outline'>{session.suggestionCount} suggestions</Badge>
                      <Badge variant='secondary'>
                        Archived {formatTimestamp(session.archivedAt ?? session.updatedAt)}
                      </Badge>
                    </div>
                    <div className='text-sm font-medium'>{session.sourceTitle ?? session.sourceUrl}</div>
                    <div className='text-xs text-muted-foreground'>{session.sourceUrl}</div>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      disabled={restoreMutation.isPending}
                      onClick={() => onRestoreSession(session.id)}
                    >
                      Restore Session
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      disabled={restoreMutation.isPending}
                      onClick={() => onRejectSession(session.id)}
                    >
                      Reject Session
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      disabled={restoreMutation.isPending}
                      onClick={() => onPromoteAndArchiveSession(session.id)}
                    >
                      Promote And Archive Session
                    </Button>
                  </div>
                  <div className='space-y-3'>
                    {session.suggestions.map((suggestion) => (
                      <div
                        key={`archived:${session.id}:${suggestion.suggestionId}`}
                        className='space-y-2 rounded-md border border-border/60 bg-background/40 p-3'
                      >
                        <SelectorRegistryProbeSuggestionBadges
                          role={suggestion.classificationRole}
                          confidence={suggestion.confidence}
                          tag={suggestion.tag}
                          draftTargetHints={suggestion.draftTargetHints}
                          baseKey={`archived:${session.id}:${suggestion.suggestionId}`}
                        />
                        <div className='text-sm font-medium'>{getSelectorRegistryProbeSuggestionTextPreview(suggestion as any)}</div>
                        <div className='text-xs text-muted-foreground'>{getSelectorRegistryProbeSuggestionEvidenceText(suggestion as any)}</div>
                        <div className='space-y-1 text-xs text-muted-foreground'>
                          <div>{getSelectorRegistryProbeSuggestionPrimaryPageLabel(suggestion as any)}</div>
                          <SelectorRegistryProbeSuggestionCandidateDetails suggestion={suggestion as any} />
                          <div>Archived probe suggestion. Review history only until restored.</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
