'use client';

import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  useArchiveSelectorRegistryProbeSessionMutation,
  useDeleteSelectorRegistryProbeSessionMutation,
  useRestoreSelectorRegistryProbeSessionMutation,
  useSaveSelectorRegistryEntryMutation,
} from '@/features/integrations/hooks/useSelectorRegistry';
import type {
  SelectorRegistryEntry,
  SelectorRegistryNamespace,
  SelectorRegistryProbeSessionCluster,
  SelectorRegistryProbeSession,
} from '@/shared/contracts/integrations/selector-registry';
import {
  applySelectorRegistryProbeCarryForwardDefaults,
  applySelectorRegistryProbeCarryForwardManualSelection,
  buildSelectorRegistryProbeCarryForwardDefaultKeysByRole,
  buildSelectorRegistryProbeEntriesByRole,
  buildSelectorRegistryProbeCarryForwardInheritedCounts,
  buildSelectorRegistryProbeCarryForwardItems,
  buildSelectorRegistryProbeCarryForwardSources,
  isSelectorRegistryProbeCarryForwardInherited,
} from '@/shared/lib/browser-execution/selector-registry-probe-carry-forward';
import { formatSelectorRegistryRoleLabel } from '@/shared/lib/browser-execution/selector-registry-roles';
import { SelectorRegistryProbeSuggestionBadges } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-badges';
import {
  getSelectorRegistryProbeSuggestionEvidenceText,
  getSelectorRegistryProbeSuggestionPrimaryPageLabel,
  getSelectorRegistryProbeSuggestionSecondaryPageLabel,
  getSelectorRegistryProbeSuggestionTextPreview,
} from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-formatting';
import { SelectorRegistryProbeSuggestionCandidateDetails } from '@/shared/lib/browser-execution/selector-registry-probe-suggestion-candidates';
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
  showArchived: boolean;
  onShowArchivedChange: (next: boolean) => void;
};

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
  showArchived,
  onShowArchivedChange,
}: Props) {
  const { toast } = useToast();
  const saveMutation = useSaveSelectorRegistryEntryMutation();
  const archiveMutation = useArchiveSelectorRegistryProbeSessionMutation();
  const restoreMutation = useRestoreSelectorRegistryProbeSessionMutation();
  const deleteMutation = useDeleteSelectorRegistryProbeSessionMutation();
  const [selectedKeys, setSelectedKeys] = useState<Record<string, string>>({});
  const [manuallySelectedKeys, setManuallySelectedKeys] = useState<Record<string, boolean>>({});
  const [bulkPromotingSessionId, setBulkPromotingSessionId] = useState<string | null>(null);
  const [promotingAndArchivingSessionId, setPromotingAndArchivingSessionId] = useState<string | null>(null);
  const [rejectingSessionId, setRejectingSessionId] = useState<string | null>(null);
  const [restoringSessionId, setRestoringSessionId] = useState<string | null>(null);
  const [bulkPromotingClusterKey, setBulkPromotingClusterKey] = useState<string | null>(null);
  const [promotingAndArchivingClusterKey, setPromotingAndArchivingClusterKey] = useState<string | null>(null);
  const [rejectingClusterKey, setRejectingClusterKey] = useState<string | null>(null);
  const [restoringClusterKey, setRestoringClusterKey] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const activeSessions = useMemo(
    () => sessions.filter((session) => session.archivedAt === null),
    [sessions]
  );
  const archivedSessions = useMemo(
    () => sessions.filter((session) => session.archivedAt !== null),
    [sessions]
  );
  const resolvedClusters = useMemo(
    () =>
      showArchived
        ? buildSelectorRegistryProbeSessionClusters(activeSessions)
        : clusters ?? buildSelectorRegistryProbeSessionClusters(activeSessions),
    [activeSessions, clusters, showArchived]
  );
  const archivedClusters = useMemo(
    () => buildSelectorRegistryProbeSessionClusters(archivedSessions),
    [archivedSessions]
  );
  const promotableEntriesByRole = useMemo(
    () => buildSelectorRegistryProbeEntriesByRole(promotableEntries),
    [promotableEntries]
  );
  const defaultKeysByRole = useMemo(
    () => buildSelectorRegistryProbeCarryForwardDefaultKeysByRole(promotableEntries),
    [promotableEntries]
  );

  const suggestionIds = useMemo(
    () =>
      activeSessions.flatMap((session) =>
        session.suggestions.map((suggestion) => `${session.id}:${suggestion.suggestionId}`)
      ),
    [activeSessions]
  );
  const activeSuggestionKeySet = useMemo(() => new Set(suggestionIds), [suggestionIds]);

  useEffect(() => {
    if (suggestionIds.length === 0) {
      setManuallySelectedKeys({});
      return;
    }

    setManuallySelectedKeys((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([suggestionKey]) => activeSuggestionKeySet.has(suggestionKey))
      );
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [activeSuggestionKeySet, suggestionIds]);

  useEffect(() => {
    if (suggestionIds.length === 0) {
      setSelectedKeys({});
      return;
    }

    setSelectedKeys((current) => {
      const next: Record<string, string> = {};

      for (const cluster of resolvedClusters) {
        Object.assign(
          next,
          applySelectorRegistryProbeCarryForwardDefaults({
            items: buildSelectorRegistryProbeCarryForwardItems({
              items: cluster.sessions.flatMap((session) =>
                session.suggestions.map((suggestion) => ({
                  sessionId: session.id,
                  suggestion,
                }))
              ),
              getItemId: (item) => `${item.sessionId}:${item.suggestion.suggestionId}`,
              getRole: (item) => item.suggestion.classificationRole,
              defaultKeysByRole,
            }),
            selectedKeys: current,
            manuallySelectedKeys,
          })
        );
      }
      return next;
    });
  }, [manuallySelectedKeys, promotableEntries, resolvedClusters, suggestionIds]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#probe-sessions') {
      return;
    }
    sectionRef.current?.scrollIntoView({ block: 'start' });
    sectionRef.current?.focus({ preventScroll: true });
  }, [activeSessions.length, archivedSessions.length, resolvedClusters.length, showArchived]);

  if (activeSessions.length === 0 && archivedSessions.length === 0 && resolvedClusters.length === 0) {
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

  const restoreSessionBatch = async (
    sessionIds: string[]
  ): Promise<number> => {
    let restoredCount = 0;
    for (const sessionId of sessionIds) {
      const response = await restoreMutation.mutateAsync({ id: sessionId });
      if (response.restored) {
        restoredCount += 1;
      }
    }
    return restoredCount;
  };

  return (
    <section
      id='probe-sessions'
      ref={sectionRef}
      tabIndex={-1}
      className='space-y-4 rounded-lg border border-border bg-card/40 p-4'
    >
      <div className='space-y-1'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-sm font-semibold'>Probe Sessions</h2>
          <div className='flex items-center gap-2'>
            <Badge variant='outline'>{resolvedClusters.length} templates</Badge>
            <Badge variant='outline'>{activeSessions.length} active</Badge>
            {showArchived ? (
              <Badge variant='outline'>{archivedSessions.length} archived</Badge>
            ) : null}
            <Badge variant='outline'>{storedSessionCount} stored</Badge>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => {
                onShowArchivedChange(!showArchived);
              }}
            >
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Button>
          </div>
        </div>
        <p className='text-sm text-muted-foreground'>
          Review persisted live-scripter DOM probe sessions and promote selected suggestions into
          the selector registry. Archived sessions stay read-only and only appear when explicitly
          requested.
        </p>
      </div>

      <div className='space-y-4'>
        {resolvedClusters.map((cluster) => {
          const clusterReadySuggestions = cluster.sessions.flatMap(readReadySuggestions);
          const clusterReadyCount = clusterReadySuggestions.length;
          const canArchiveCluster =
            cluster.suggestionCount > 0 && clusterReadyCount === cluster.suggestionCount;
          const clusterCarryForwardItems = buildSelectorRegistryProbeCarryForwardItems({
            items: cluster.sessions.flatMap((session) =>
              session.suggestions.map((suggestion) => ({
                sessionId: session.id,
                suggestion,
              }))
            ),
            getItemId: (item) => `${item.sessionId}:${item.suggestion.suggestionId}`,
            getRole: (item) => item.suggestion.classificationRole,
            defaultKeysByRole,
          });
          const carryForwardSourcesByRole = buildSelectorRegistryProbeCarryForwardSources({
            items: clusterCarryForwardItems,
            selectedKeys,
            manuallySelectedKeys,
          });
          const inheritedCountsBySuggestionKey =
            buildSelectorRegistryProbeCarryForwardInheritedCounts({
              items: clusterCarryForwardItems,
              selectedKeys,
              manuallySelectedKeys,
              carryForwardSourcesByRole,
            });

          return (
            <div
              key={cluster.clusterKey}
              className='space-y-4 rounded-lg border border-border bg-background/40 p-4'
            >
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
                      {carryForwardSourcesByRole.size > 0 ? (
                        <div className='flex flex-wrap gap-2 pt-1'>
                          {Array.from(carryForwardSourcesByRole.entries()).map(
                            ([role, source]) => (
                              <Badge
                                key={`${cluster.clusterKey}:carry-forward:${role}`}
                                variant='outline'
                              >
                                Carry-forward active for {role} -&gt; {source.selectedKey}
                              </Badge>
                            )
                          )}
                        </div>
                      ) : null}
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
                      const matchingEntries =
                        promotableEntriesByRole.get(suggestion.classificationRole) ?? [];
                      const selectedKey = selectedKeys[suggestionKey] ?? '';
                      const carryForwardSource = carryForwardSourcesByRole.get(
                        suggestion.classificationRole
                      );
                      const inheritedFromTemplate = isSelectorRegistryProbeCarryForwardInherited({
                        itemId: suggestionKey,
                        role: suggestion.classificationRole,
                        selectedKey,
                        manuallySelectedKeys,
                        carryForwardSourcesByRole,
                      });
                      const isCarryForwardSource =
                        (inheritedCountsBySuggestionKey[suggestionKey] ?? 0) > 0;
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
                                <SelectorRegistryProbeSuggestionBadges
                                  role={suggestion.classificationRole}
                                  confidence={suggestion.confidence}
                                  tag={suggestion.tag}
                                  draftTargetHints={suggestion.draftTargetHints}
                                  baseKey={suggestionKey}
                                  isCarryForwardSource={isCarryForwardSource}
                                />
                                <div className='text-sm font-medium'>
                                  {getSelectorRegistryProbeSuggestionTextPreview(suggestion)}
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  {getSelectorRegistryProbeSuggestionEvidenceText(suggestion)}
                                </div>
                                <div className='space-y-1 text-xs text-muted-foreground'>
                                  <div>{getSelectorRegistryProbeSuggestionPrimaryPageLabel(suggestion)}</div>
                                  {getSelectorRegistryProbeSuggestionSecondaryPageLabel(suggestion) ? (
                                    <div>{getSelectorRegistryProbeSuggestionSecondaryPageLabel(suggestion)}</div>
                                  ) : null}
                                  <SelectorRegistryProbeSuggestionCandidateDetails
                                    suggestion={suggestion}
                                  />
                                </div>
                              </div>

                              <div className='space-y-2'>
                                <Label htmlFor={`stored-probe-key-${suggestionKey}`}>Promote As</Label>
                                <Select
                                  value={selectedKey}
                                  onValueChange={(value) => {
                                    const nextState =
                                      applySelectorRegistryProbeCarryForwardManualSelection({
                                        items: clusterCarryForwardItems,
                                        selectedKeys,
                                        manuallySelectedKeys,
                                        itemId: suggestionKey,
                                        selectedKey: value,
                                      });
                                    setManuallySelectedKeys(nextState.manuallySelectedKeys);
                                    setSelectedKeys(nextState.selectedKeys);
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
                                {inheritedFromTemplate ? (
                                  <div className='text-xs text-muted-foreground'>
                                    Inherited from template: {carryForwardSource?.selectedKey}
                                  </div>
                                ) : null}

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
          );
        })}

        {showArchived && archivedClusters.length > 0 ? (
          <div className='space-y-4 rounded-lg border border-border/70 bg-muted/10 p-4'>
            <div className='space-y-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='text-sm font-semibold'>Archived Sessions</h3>
                <Badge variant='outline'>{archivedClusters.length} templates</Badge>
                <Badge variant='outline'>{archivedSessions.length} archived</Badge>
              </div>
              <div className='text-xs text-muted-foreground'>
                Archived probe sessions are kept for audit only and do not participate in active
                review actions.
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
                      <div className='text-xs text-muted-foreground'>
                        Archived template history grouped by normalized path and role signature.
                      </div>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        loading={restoringClusterKey === cluster.clusterKey}
                        loadingText='Restoring'
                        disabled={restoreMutation.isPending}
                        onClick={async () => {
                          setRestoringClusterKey(cluster.clusterKey);
                          try {
                            const restoredCount = await restoreSessionBatch(
                              cluster.sessions.map((session) => session.id)
                            );
                            toast(
                              restoredCount === cluster.sessionCount
                                ? `Restored ${restoredCount} archived probe session${restoredCount === 1 ? '' : 's'} in this template to active review.`
                                : `Restored ${restoredCount} of ${cluster.sessionCount} archived probe sessions in this template.`,
                              {
                                variant:
                                  restoredCount === cluster.sessionCount ? 'success' : 'error',
                              }
                            );
                          } catch (error) {
                            toast(
                              error instanceof Error
                                ? error.message
                                : 'Archived template could not be restored.',
                              { variant: 'error' }
                            );
                          } finally {
                            setRestoringClusterKey(null);
                          }
                        }}
                      >
                        Restore Template
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
                            loading={restoringSessionId === session.id}
                            loadingText='Restoring'
                            disabled={restoreMutation.isPending}
                            onClick={async () => {
                              setRestoringSessionId(session.id);
                              try {
                                const restored = await restoreMutation.mutateAsync({
                                  id: session.id,
                                });
                                toast(
                                  restored.restored
                                    ? 'Restored archived probe session to active review.'
                                    : 'Probe session was already active or missing.',
                                  { variant: restored.restored ? 'success' : 'error' }
                                );
                              } catch (error) {
                                toast(
                                  error instanceof Error
                                    ? error.message
                                    : 'Archived probe session could not be restored.',
                                  { variant: 'error' }
                                );
                              } finally {
                                setRestoringSessionId(null);
                              }
                            }}
                          >
                            Restore Session
                          </Button>
                        </div>

                        <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                          {session.pages.map((pageSummary) => (
                            <Badge key={`archived:${session.id}:${pageSummary.url}`} variant='outline'>
                              {pageSummary.title ?? pageSummary.url} ({pageSummary.suggestionCount})
                            </Badge>
                          ))}
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
                              <div className='text-sm font-medium'>
                                {getSelectorRegistryProbeSuggestionTextPreview(suggestion)}
                              </div>
                              <div className='text-xs text-muted-foreground'>
                                {getSelectorRegistryProbeSuggestionEvidenceText(suggestion)}
                              </div>
                              <div className='space-y-1 text-xs text-muted-foreground'>
                                <div>{getSelectorRegistryProbeSuggestionPrimaryPageLabel(suggestion)}</div>
                                {getSelectorRegistryProbeSuggestionSecondaryPageLabel(suggestion) ? (
                                  <div>{getSelectorRegistryProbeSuggestionSecondaryPageLabel(suggestion)}</div>
                                ) : null}
                                <SelectorRegistryProbeSuggestionCandidateDetails
                                  suggestion={suggestion}
                                />
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
        ) : null}
      </div>
    </section>
  );
}
