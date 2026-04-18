'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  useArchiveSelectorRegistryProbeSessionMutation,
  useDeleteSelectorRegistryProbeSessionMutation,
  useSaveSelectorRegistryEntryMutation,
} from '@/features/integrations/hooks/useSelectorRegistry';
import type {
  SelectorRegistryEntry,
  SelectorRegistryNamespace,
  SelectorRegistryProbeSessionCluster,
  SelectorRegistryProbeSession,
} from '@/shared/contracts/integrations/selector-registry';
import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';
import {
  Badge,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@/shared/ui/primitives.public';
import { buildSelectorRegistryProbeSessionClusters } from './selectorRegistryProbeSessionClustering';

type Props = {
  namespace: SelectorRegistryNamespace;
  profile: string;
  sessions: SelectorRegistryProbeSession[];
  clusters?: SelectorRegistryProbeSessionCluster[];
  promotableEntries: SelectorRegistryEntry[];
  isReadOnly: boolean;
};

const formatConfidence = (confidence: number): string => `${Math.round(confidence * 100)}%`;

const formatTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

const readPromotableSelectorValue = (
  suggestion: SelectorRegistryProbeSession['suggestions'][number]
): string | null => suggestion.candidates.css ?? suggestion.candidates.xpath ?? null;

export function SelectorRegistryProbeSessionsSection({
  namespace,
  profile,
  sessions,
  clusters,
  promotableEntries,
  isReadOnly,
}: Props) {
  const { toast } = useToast();
  const saveMutation = useSaveSelectorRegistryEntryMutation();
  const archiveMutation = useArchiveSelectorRegistryProbeSessionMutation();
  const deleteMutation = useDeleteSelectorRegistryProbeSessionMutation();
  const [selectedKeys, setSelectedKeys] = useState<Record<string, string>>({});
  const [bulkPromotingSessionId, setBulkPromotingSessionId] = useState<string | null>(null);
  const [promotingAndArchivingSessionId, setPromotingAndArchivingSessionId] = useState<string | null>(null);
  const [rejectingSessionId, setRejectingSessionId] = useState<string | null>(null);
  const [bulkPromotingClusterKey, setBulkPromotingClusterKey] = useState<string | null>(null);
  const [promotingAndArchivingClusterKey, setPromotingAndArchivingClusterKey] = useState<string | null>(null);
  const [rejectingClusterKey, setRejectingClusterKey] = useState<string | null>(null);
  const resolvedClusters = useMemo(
    () => clusters ?? buildSelectorRegistryProbeSessionClusters(sessions),
    [clusters, sessions]
  );

  const suggestionIds = useMemo(
    () =>
      sessions.flatMap((session) =>
        session.suggestions.map((suggestion) => `${session.id}:${suggestion.suggestionId}`)
      ),
    [sessions]
  );

  useEffect(() => {
    if (suggestionIds.length === 0) {
      setSelectedKeys({});
      return;
    }

    setSelectedKeys((current) => {
      const next: Record<string, string> = {};
      for (const session of sessions) {
        for (const suggestion of session.suggestions) {
          const suggestionKey = `${session.id}:${suggestion.suggestionId}`;
          const matchingEntries = promotableEntries.filter(
            (entry) => entry.role === suggestion.classificationRole
          );
          next[suggestionKey] = current[suggestionKey] ?? matchingEntries[0]?.key ?? '';
        }
      }
      return next;
    });
  }, [promotableEntries, sessions, suggestionIds]);

  if (sessions.length === 0 && resolvedClusters.length === 0) {
    return null;
  }

  const storedSessionCount =
    sessions.length > 0
      ? sessions.length
      : resolvedClusters.reduce((sum, cluster) => sum + cluster.sessionCount, 0);

  const readReadySuggestions = (
    session: SelectorRegistryProbeSession
  ): Array<{
    suggestion: SelectorRegistryProbeSession['suggestions'][number];
    suggestionKey: string;
    selectedKey: string;
    selectorValue: string;
  }> =>
    session.suggestions.flatMap((suggestion) => {
      const suggestionKey = `${session.id}:${suggestion.suggestionId}`;
      const selectedKey = selectedKeys[suggestionKey] ?? '';
      const selectorValue = readPromotableSelectorValue(suggestion);
      if (selectorValue === null || selectedKey.trim().length === 0) {
        return [];
      }
      return [
        {
          suggestion,
          suggestionKey,
          selectedKey,
          selectorValue,
        },
      ];
    });

  const promoteSuggestionBatch = async (
    items: Array<{
      suggestion: SelectorRegistryProbeSession['suggestions'][number];
      selectedKey: string;
      selectorValue: string;
    }>
  ): Promise<number> => {
    let promotedCount = 0;
    for (const item of items) {
      await saveMutation.mutateAsync({
        namespace,
        profile,
        key: item.selectedKey,
        valueJson: JSON.stringify(item.selectorValue),
        role: item.suggestion.classificationRole,
      });
      promotedCount += 1;
    }
    return promotedCount;
  };

  const rejectSessionBatch = async (
    sessionIds: string[]
  ): Promise<number> => {
    let deletedCount = 0;
    for (const sessionId of sessionIds) {
      const response = await deleteMutation.mutateAsync({ id: sessionId });
      if (response.deleted) {
        deletedCount += 1;
      }
    }
    return deletedCount;
  };

  return (
    <section className='space-y-4 rounded-lg border border-border bg-card/40 p-4'>
      <div className='space-y-1'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-sm font-semibold'>Probe Sessions</h2>
          <div className='flex items-center gap-2'>
            <Badge variant='outline'>{resolvedClusters.length} templates</Badge>
            <Badge variant='outline'>{storedSessionCount} stored</Badge>
          </div>
        </div>
        <p className='text-sm text-muted-foreground'>
          Review persisted live-scripter DOM probe sessions and promote selected suggestions into
          the selector registry.
        </p>
      </div>

      <div className='space-y-4'>
        {resolvedClusters.map((cluster) => (
          <div
            key={cluster.clusterKey}
            className='space-y-4 rounded-lg border border-border bg-background/40 p-4'
          >
            {(() => {
              const clusterReadySuggestions = cluster.sessions.flatMap(readReadySuggestions);
              const clusterReadyCount = clusterReadySuggestions.length;
              const canArchiveCluster =
                cluster.suggestionCount > 0 && clusterReadyCount === cluster.suggestionCount;

              return (
                <div className='space-y-1'>
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
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        disabled={isReadOnly || clusterReadyCount === 0 || saveMutation.isPending}
                        loading={bulkPromotingClusterKey === cluster.clusterKey}
                        loadingText='Promoting'
                        onClick={async () => {
                          if (clusterReadyCount === 0) {
                            return;
                          }
                          setBulkPromotingClusterKey(cluster.clusterKey);
                          try {
                            const promotedCount = await promoteSuggestionBatch(clusterReadySuggestions);
                            toast(
                              `Promoted ${promotedCount} of ${clusterReadyCount} stored probe suggestion${clusterReadyCount === 1 ? '' : 's'} in this template.`,
                              { variant: 'success' }
                            );
                          } catch (error) {
                            toast(
                              error instanceof Error
                                ? error.message
                                : 'Cluster probe promotion could not be completed.',
                              { variant: 'error' }
                            );
                          } finally {
                            setBulkPromotingClusterKey(null);
                          }
                        }}
                      >
                        Promote Ready In Template
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        disabled={
                          isReadOnly ||
                          !canArchiveCluster ||
                          saveMutation.isPending ||
                          archiveMutation.isPending
                        }
                        loading={promotingAndArchivingClusterKey === cluster.clusterKey}
                        loadingText='Archiving'
                        onClick={async () => {
                          if (!canArchiveCluster) {
                            return;
                          }
                          setPromotingAndArchivingClusterKey(cluster.clusterKey);
                          try {
                            const promotedCount = await promoteSuggestionBatch(clusterReadySuggestions);
                            let archivedCount = 0;
                            for (const session of cluster.sessions) {
                              const response = await archiveMutation.mutateAsync({ id: session.id });
                              if (response.archived) {
                                archivedCount += 1;
                              }
                            }
                            toast(
                              archivedCount === cluster.sessionCount
                                ? `Promoted ${promotedCount} stored probe suggestion${promotedCount === 1 ? '' : 's'} and archived ${archivedCount} stored probe session${archivedCount === 1 ? '' : 's'} in this template.`
                                : `Promoted ${promotedCount} stored probe suggestion${promotedCount === 1 ? '' : 's'}, but only archived ${archivedCount} of ${cluster.sessionCount} stored probe sessions in this template.`,
                              {
                                variant:
                                  archivedCount === cluster.sessionCount ? 'success' : 'error',
                              }
                            );
                          } catch (error) {
                            toast(
                              error instanceof Error
                                ? error.message
                                : 'Template promotion and archive could not be completed.',
                              { variant: 'error' }
                            );
                          } finally {
                            setPromotingAndArchivingClusterKey(null);
                          }
                        }}
                      >
                        Promote And Archive Template
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        loading={rejectingClusterKey === cluster.clusterKey}
                        loadingText='Rejecting'
                        onClick={async () => {
                          setRejectingClusterKey(cluster.clusterKey);
                          try {
                            const deletedCount = await rejectSessionBatch(
                              cluster.sessions.map((session) => session.id)
                            );
                            toast(
                              `Rejected ${deletedCount} of ${cluster.sessionCount} stored probe session${cluster.sessionCount === 1 ? '' : 's'} in this template.`,
                              {
                                variant:
                                  deletedCount === cluster.sessionCount ? 'success' : 'error',
                              }
                            );
                          } catch (error) {
                            toast(
                              error instanceof Error
                                ? error.message
                                : 'Cluster probe rejection could not be completed.',
                              { variant: 'error' }
                            );
                          } finally {
                            setRejectingClusterKey(null);
                          }
                        }}
                      >
                        {rejectingClusterKey !== cluster.clusterKey ? (
                          <Trash2 className='mr-2 size-4' />
                        ) : null}
                        Reject Template
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className='space-y-4'>
              {cluster.sessions.map((session) => (
                <div
                  key={session.id}
                  className='space-y-3 rounded-md border border-border/70 bg-background/50 p-4'
                >
                  {(() => {
              const readySuggestions = readReadySuggestions(session);
              const readyCount = readySuggestions.length;
              const canArchiveSession =
                session.suggestionCount > 0 && readyCount === session.suggestionCount;

                  return (
                    <div className='space-y-3'>
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='space-y-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <Badge variant='outline'>{session.profile}</Badge>
                            <Badge variant='outline'>{session.scannedPages} pages</Badge>
                            <Badge variant='outline'>{session.suggestionCount} suggestions</Badge>
                            <Badge variant='outline'>{readyCount} ready</Badge>
                            <Badge variant='outline'>{formatTimestamp(session.createdAt)}</Badge>
                          </div>
                          <div className='text-sm font-medium'>
                            {session.sourceTitle ?? session.sourceUrl}
                          </div>
                          <div className='text-xs text-muted-foreground'>{session.sourceUrl}</div>
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={isReadOnly || readyCount === 0 || saveMutation.isPending}
                            loading={bulkPromotingSessionId === session.id}
                            loadingText='Promoting'
                            onClick={async () => {
                              if (readyCount === 0) {
                                return;
                              }
                              setBulkPromotingSessionId(session.id);
                              try {
                                const promotedCount = await promoteSuggestionBatch(readySuggestions);
                                toast(
                                  `Promoted ${promotedCount} of ${readyCount} stored probe suggestion${readyCount === 1 ? '' : 's'}.`,
                                  { variant: 'success' }
                                );
                              } catch (error) {
                                toast(
                                  error instanceof Error
                                    ? error.message
                                    : 'Bulk probe promotion could not be completed.',
                                  { variant: 'error' }
                                );
                              } finally {
                                setBulkPromotingSessionId(null);
                              }
                            }}
                          >
                            Promote All Matching
                          </Button>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={
                              isReadOnly ||
                              !canArchiveSession ||
                              saveMutation.isPending ||
                              archiveMutation.isPending
                            }
                            loading={promotingAndArchivingSessionId === session.id}
                            loadingText='Archiving'
                            onClick={async () => {
                              if (!canArchiveSession) {
                                return;
                              }
                              setPromotingAndArchivingSessionId(session.id);
                              try {
                                const promotedCount = await promoteSuggestionBatch(readySuggestions);
                                const archived = await archiveMutation.mutateAsync({ id: session.id });
                                toast(
                                  archived.archived
                                    ? `Promoted ${promotedCount} stored probe suggestion${promotedCount === 1 ? '' : 's'} and archived the stored probe session.`
                                    : `Promoted ${promotedCount} stored probe suggestion${promotedCount === 1 ? '' : 's'}, but the stored probe session could not be archived.`,
                                  { variant: archived.archived ? 'success' : 'error' }
                                );
                              } catch (error) {
                                toast(
                                  error instanceof Error
                                    ? error.message
                                    : 'Session promotion and archive could not be completed.',
                                  { variant: 'error' }
                                );
                              } finally {
                                setPromotingAndArchivingSessionId(null);
                              }
                            }}
                          >
                            Promote And Archive Session
                          </Button>
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            loading={rejectingSessionId === session.id}
                            loadingText='Rejecting'
                            onClick={async () => {
                              setRejectingSessionId(session.id);
                              try {
                                const deletedCount = await rejectSessionBatch([session.id]);
                                toast(
                                  deletedCount === 1
                                    ? 'Rejected stored probe session.'
                                    : 'Probe session was already missing.',
                                  { variant: deletedCount === 1 ? 'success' : 'error' }
                                );
                              } catch (error) {
                                toast(
                                  error instanceof Error
                                    ? error.message
                                    : 'Probe session could not be rejected.',
                                  { variant: 'error' }
                                );
                              } finally {
                                setRejectingSessionId(null);
                              }
                            }}
                          >
                            {rejectingSessionId !== session.id ? <Trash2 className='mr-2 size-4' /> : null}
                            Reject Session
                          </Button>
                        </div>
                      </div>

                      <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                        {session.pages.map((pageSummary) => (
                          <Badge key={`${session.id}:${pageSummary.url}`} variant='outline'>
                            {pageSummary.title ?? pageSummary.url} ({pageSummary.suggestionCount})
                          </Badge>
                        ))}
                      </div>

                      <div className='space-y-3'>
                        {session.suggestions.map((suggestion) => {
                      const suggestionKey = `${session.id}:${suggestion.suggestionId}`;
                      const matchingEntries = promotableEntries.filter(
                        (entry) => entry.role === suggestion.classificationRole
                      );
                      const selectedKey = selectedKeys[suggestionKey] ?? '';
                      const selectorValue = readPromotableSelectorValue(suggestion);
                      const promoteDisabled =
                        isReadOnly ||
                        selectorValue === null ||
                        selectedKey.trim().length === 0 ||
                        saveMutation.isPending;

                          return (
                            <div
                              key={suggestionKey}
                              className='grid gap-3 rounded-md border border-border/60 bg-muted/10 p-3 lg:grid-cols-[minmax(0,1fr)_300px]'
                            >
                              <div className='space-y-2'>
                                <div className='flex flex-wrap items-center gap-2'>
                                  <Badge variant='secondary'>
                                    {formatSelectorRegistryRoleLabel(suggestion.classificationRole) ??
                                      suggestion.classificationRole}
                                  </Badge>
                                  <Badge variant='outline'>{formatConfidence(suggestion.confidence)}</Badge>
                                  <Badge variant='outline'>{suggestion.tag}</Badge>
                                  {suggestion.draftTargetHints.map((hint) => (
                                    <Badge key={`${suggestionKey}:${hint}`} variant='outline'>
                                      {hint}
                                    </Badge>
                                  ))}
                                </div>
                                <div className='text-sm font-medium'>
                                  {suggestion.textPreview ?? '(no visible text)'}
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  {suggestion.evidence.join(' ')}
                                </div>
                                <div className='space-y-1 text-xs text-muted-foreground'>
                                  <div>{suggestion.pageTitle ?? suggestion.pageUrl}</div>
                                  <div>{suggestion.pageUrl}</div>
                                  <div>
                                    CSS: {suggestion.candidates.css ?? 'Unavailable'} · XPath:{' '}
                                    {suggestion.candidates.xpath ?? 'Unavailable'}
                                  </div>
                                </div>
                              </div>

                              <div className='space-y-2'>
                                <Label htmlFor={`stored-probe-key-${suggestionKey}`}>Promote As</Label>
                                <Select
                                  value={selectedKey}
                                  onValueChange={(value) => {
                                    setSelectedKeys((current) => ({
                                      ...current,
                                      [suggestionKey]: value,
                                    }));
                                  }}
                                >
                                  <SelectTrigger id={`stored-probe-key-${suggestionKey}`}>
                                    <SelectValue
                                      placeholder={
                                        matchingEntries.length === 0
                                          ? 'No matching selector keys'
                                          : 'Choose a selector key'
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {matchingEntries.map((entry) => (
                                      <SelectItem key={entry.key} value={entry.key}>
                                        {entry.key}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Button
                                  type='button'
                                  size='sm'
                                  disabled={promoteDisabled}
                                  onClick={async () => {
                                    if (selectorValue === null || selectedKey.trim().length === 0) {
                                      return;
                                    }
                                    try {
                                      const promotedCount = await promoteSuggestionBatch([
                                        {
                                          suggestion,
                                          selectedKey,
                                          selectorValue,
                                        },
                                      ]);
                                      toast(
                                        promotedCount === 1
                                          ? 'Promoted stored probe suggestion.'
                                          : 'Probe suggestion could not be promoted.',
                                        { variant: promotedCount === 1 ? 'success' : 'error' }
                                      );
                                    } catch (error) {
                                      toast(
                                        error instanceof Error
                                          ? error.message
                                          : 'Probe suggestion could not be promoted.',
                                        { variant: 'error' }
                                      );
                                    }
                                  }}
                                >
                                  Promote To Registry
                                </Button>
                                {isReadOnly ? (
                                  <div className='text-xs text-muted-foreground'>
                                    This namespace is currently read-only.
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
