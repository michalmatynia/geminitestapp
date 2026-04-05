'use client';

import { GaugeIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, type JSX, useCallback, useContext, useState } from 'react';

import { KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO } from '@/features/kangur/ai-tutor/page-coverage-manifest';
import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import {
  useKangurKnowledgeGraphStatus,
  useKangurObservabilitySummary,
} from '@/features/kangur/observability/hooks';
import type { KangurKnowledgeGraphPreviewResponse, KangurObservabilityRange, KangurObservabilitySummary } from '@/shared/contracts/kangur-observability';
import { kangurKnowledgeGraphPreviewResponseSchema, kangurKnowledgeGraphSyncResponseSchema, kangurObservabilityRangeSchema } from '@/shared/contracts/kangur-observability';
import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/features/kangur/shared/contracts/kangur-knowledge-graph';
import { api } from '@/shared/lib/api-client';
import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';
import {
  Alert,
  Badge,
  Breadcrumbs,
  Button,
  CompactEmptyState,
  LoadingState,
  SegmentedControl,
  StatusBadge,
} from '@/features/kangur/shared/ui';
import { KANGUR_GRID_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';

import {
  KnowledgeGraphObservabilityProvider,
  type KnowledgeGraphPreviewDraft,
  type KnowledgeGraphPreviewReplayCandidate,
} from './components/observability/KnowledgeGraphObservabilityContext';
import {
  createKnowledgeGraphPreviewDraft,
  buildKnowledgeGraphPreviewReplayCandidates,
  isKnowledgeGraphPreviewFocusKindAllowed,
  buildKnowledgeGraphPreviewRequest,
  createKnowledgeGraphPreviewDraftFromCoverageEntry,
  clearKnowledgeGraphPreviewDraftContext,
} from './components/observability/utils';
import { SummaryContent } from './components/observability/SummaryContent';
import { formatDateTime, formatNumber } from './components/observability/utils';
import { KangurAdminStatusCard } from './components/KangurAdminStatusCard';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { withKangurClientError } from '@/features/kangur/observability/client';


const RANGE_OPTIONS: Array<LabeledOptionDto<KangurObservabilityRange>> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

export const buildSystemLogsHref = (input: {
  query?: string;
  source?: string;
  from?: string | null | undefined;
  to?: string | null | undefined;
}): string => {
  const params = new URLSearchParams();
  if (input.query) params.set('query', input.query);
  if (input.source) params.set('source', input.source);
  if (input.from) params.set('from', input.from);
  if (input.to) params.set('to', input.to);
  const query = params.toString();
  return query ? `/admin/system/logs?${query}` : '/admin/system/logs';
};

export const ObservabilitySummaryContext = createContext<{
  range: KangurObservabilityRange;
  summary: KangurObservabilitySummary;
} | null>(null);

export const useObservabilitySummaryContext = () => {
  const value = useContext(ObservabilitySummaryContext);
  if (!value) {
    throw new Error('Observability summary context is unavailable.');
  }
  return value;
};

export function AdminKangurObservabilityPage(): JSX.Element {
  const { enabled: adminDocsEnabled } = useKangurDocsTooltips('admin');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsedRange = kangurObservabilityRangeSchema.safeParse(searchParams.get('range'));
  const range: KangurObservabilityRange = parsedRange.success ? parsedRange.data : '24h';
  const summaryQuery = useKangurObservabilitySummary(range);
  const summary = summaryQuery.data;
  const knowledgeGraphStatusQuery = useKangurKnowledgeGraphStatus(
    summary?.knowledgeGraphStatus.graphKey ?? KANGUR_KNOWLEDGE_GRAPH_KEY
  );
  const knowledgeGraphStatus = knowledgeGraphStatusQuery.data ?? summary?.knowledgeGraphStatus;
  const [isKnowledgeGraphSyncing, setIsKnowledgeGraphSyncing] = useState(false);
  const [knowledgeGraphSyncFeedback, setKnowledgeGraphSyncFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [knowledgeGraphPreviewDraft, setKnowledgeGraphPreviewDraft] =
    useState<KnowledgeGraphPreviewDraft>(createKnowledgeGraphPreviewDraft);
  const [knowledgeGraphPreviewResult, setKnowledgeGraphPreviewResult] =
    useState<KangurKnowledgeGraphPreviewResponse | null>(null);
  const [knowledgeGraphPreviewError, setKnowledgeGraphPreviewError] = useState<string | null>(null);
  const [isKnowledgeGraphPreviewRunning, setIsKnowledgeGraphPreviewRunning] = useState(false);
  const headerLogsHref = buildSystemLogsHref({
    query: 'kangur.',
    from: summary?.window.from,
    to: summary?.window.to,
  });
  const summaryKnowledgeGraphStatus = summary?.knowledgeGraphStatus;
  const summaryKnowledgeGraphLocale =
    summaryKnowledgeGraphStatus?.mode === 'status' ? summaryKnowledgeGraphStatus.locale : null;
  const knowledgeGraphPreviewReplayCandidates = buildKnowledgeGraphPreviewReplayCandidates(
    summary?.analytics.recent ?? []
  );
  const breadcrumbs = [
    { label: 'Admin', href: '/admin' },
    { label: 'Kangur', href: '/admin/kangur' },
    { label: 'Observability' },
  ];
  const updateKnowledgeGraphPreviewDraft = useCallback(
    (field: keyof KnowledgeGraphPreviewDraft, value: string): void => {
      setKnowledgeGraphPreviewDraft((current) => {
        const nextDraft = {
          ...current,
          [field]: value,
        };

        if (field !== 'replayEventId' && current.replayEventId) {
          nextDraft.replayEventId = '';
        }

        if (
          field === 'surface' &&
          !isKnowledgeGraphPreviewFocusKindAllowed(value, nextDraft.focusKind)
        ) {
          nextDraft.focusKind = '';
        }

        return nextDraft;
      });
    },
    []
  );
  const runKnowledgeGraphPreviewForDraft = useCallback(
    async (draft: KnowledgeGraphPreviewDraft): Promise<void> => {
      setIsKnowledgeGraphPreviewRunning(true);
      setKnowledgeGraphPreviewError(null);

      const previewResult = await withKangurClientError(
        {
          source: 'kangur.admin.observability',
          action: 'preview-knowledge-graph',
          description: 'Runs a knowledge graph preview request for the admin observability panel.',
          context: {
            locale:
              (knowledgeGraphStatus?.mode === 'status' ? knowledgeGraphStatus.locale : null) ??
              summaryKnowledgeGraphLocale ??
              'pl',
          },
        },
        async () => {
          const payload = buildKnowledgeGraphPreviewRequest({
            draft,
            locale:
              (knowledgeGraphStatus?.mode === 'status' ? knowledgeGraphStatus.locale : null) ??
              summaryKnowledgeGraphLocale ??
              'pl',
          });
          const response = await api.post(
            '/api/kangur/ai-tutor/knowledge-graph/preview',
            payload,
            { timeout: 120000 }
          );
          const parsed = kangurKnowledgeGraphPreviewResponseSchema.safeParse(response);

          if (!parsed.success) {
            throw new Error('Invalid knowledge graph preview response');
          }

          return parsed.data;
        },
        {
          fallback: null,
          onError: (error) => {
            setKnowledgeGraphPreviewResult(null);
            setKnowledgeGraphPreviewError(
              error instanceof Error
                ? error.message
                : 'Failed to run the knowledge graph preview.'
            );
          },
        }
      );

      if (previewResult) {
        setKnowledgeGraphPreviewResult(previewResult);
      }
      setIsKnowledgeGraphPreviewRunning(false);
    },
    [knowledgeGraphStatus, summaryKnowledgeGraphLocale]
  );
  const applyKnowledgeGraphPreviewReplayEvent = useCallback(
    (eventId: string): void => {
      if (!eventId) {
        setKnowledgeGraphPreviewDraft((current) => ({
          ...current,
          replayEventId: '',
        }));
        return;
      }

      const candidate = knowledgeGraphPreviewReplayCandidates.find(
        (replayCandidate: KnowledgeGraphPreviewReplayCandidate) => replayCandidate.id === eventId
      );
      if (!candidate) {
        setKnowledgeGraphPreviewDraft((current) => ({
          ...current,
          replayEventId: '',
        }));
        return;
      }

      setKnowledgeGraphPreviewDraft(candidate.draft);
      void runKnowledgeGraphPreviewForDraft(candidate.draft);
    },
    [knowledgeGraphPreviewReplayCandidates, runKnowledgeGraphPreviewForDraft]
  );
  const replayAnalyticsEventInKnowledgeGraphPreview = useCallback(
    (eventId: string): void => {
      document
        .getElementById('knowledge-graph-query-preview')
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      applyKnowledgeGraphPreviewReplayEvent(eventId);
    },
    [applyKnowledgeGraphPreviewReplayEvent]
  );
  const applyKnowledgeGraphPreviewPreset = useCallback((entryId: string): void => {
    const entry = KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.find(
      (candidate) => candidate.id === entryId
    );
    if (!entry) {
      return;
    }

    setKnowledgeGraphPreviewDraft(createKnowledgeGraphPreviewDraftFromCoverageEntry(entry));
  }, []);
  const clearKnowledgeGraphPreviewContext = useCallback((): void => {
    setKnowledgeGraphPreviewDraft((current) => clearKnowledgeGraphPreviewDraftContext(current));
  }, []);
  const refreshKnowledgeGraphStatus = useCallback((): void => {
    void knowledgeGraphStatusQuery.refetch();
  }, [knowledgeGraphStatusQuery]);
  const syncKnowledgeGraph = useCallback((): void => {
    void (async () => {
      if (knowledgeGraphStatus?.mode !== 'status') {
        return;
      }

      setIsKnowledgeGraphSyncing(true);
      setKnowledgeGraphSyncFeedback(null);
      const syncResult = await withKangurClientError(
        {
          source: 'kangur.admin.observability',
          action: 'sync-knowledge-graph',
          description: 'Triggers a knowledge graph sync from the admin observability panel.',
          context: {
            locale: knowledgeGraphStatus.locale ?? summaryKnowledgeGraphLocale ?? 'pl',
          },
        },
        async () => {
          const withEmbeddings =
            knowledgeGraphStatus.embeddingNodeCount > 0 || knowledgeGraphStatus.vectorIndexPresent;
          const response = await api.post(
            '/api/kangur/knowledge-graph/sync',
            {
              locale: knowledgeGraphStatus.locale ?? summaryKnowledgeGraphLocale ?? 'pl',
              withEmbeddings,
            },
            { timeout: 120000 }
          );
          const parsed = kangurKnowledgeGraphSyncResponseSchema.safeParse(response);

          if (!parsed.success) {
            throw new Error('Invalid Kangur knowledge graph sync response');
          }

          return parsed.data;
        },
        {
          fallback: null,
          onError: (error) => {
            setKnowledgeGraphSyncFeedback({
              tone: 'error',
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to sync the Kangur knowledge graph.',
            });
          },
        }
      );

      if (syncResult) {
        setKnowledgeGraphSyncFeedback({
          tone: 'success',
          message: `Synced ${new Intl.NumberFormat().format(syncResult.sync.nodeCount)} nodes and ${new Intl.NumberFormat().format(syncResult.sync.edgeCount)} edges${syncResult.sync.withEmbeddings ? ' with embeddings preserved.' : '.'}`,
        });
        void summaryQuery.refetch();
        void knowledgeGraphStatusQuery.refetch();
      }

      setIsKnowledgeGraphSyncing(false);
    })();
  }, [knowledgeGraphStatus, knowledgeGraphStatusQuery, summaryKnowledgeGraphLocale, summaryQuery]);
  const runKnowledgeGraphPreview = useCallback((): void => {
    void runKnowledgeGraphPreviewForDraft(knowledgeGraphPreviewDraft);
  }, [knowledgeGraphPreviewDraft, runKnowledgeGraphPreviewForDraft]);
  const handleRangeChange = useCallback(
    (nextRange: KangurObservabilityRange): void => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set('range', nextRange);
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <KangurAdminContentShell
      title='Kangur Observability'
      description={
        <div className='flex flex-wrap items-center gap-3'>
          <AdminFavoriteBreadcrumbRow>
            <Breadcrumbs items={breadcrumbs} className='mt-0' />
          </AdminFavoriteBreadcrumbRow>
          <span className='hidden h-4 w-px bg-white/12 md:block' />
          <span className='text-xs text-slate-300/80'>
            Monitor Kangur-specific alerts, route health, client telemetry, and recent server activity.
          </span>
        </div>
      }
      breadcrumbs={breadcrumbs}
      headerLayout='stacked'
      className='mx-0 max-w-none px-0 py-0'
      panelVariant='flat'
      panelClassName='rounded-none'
      showBreadcrumbs={false}
      refresh={{
        onRefresh: (): void => {
          void summaryQuery.refetch();
          void knowledgeGraphStatusQuery.refetch();
        },
        isRefreshing: summaryQuery.isFetching || knowledgeGraphStatusQuery.isFetching,
      }}
      headerActions={
        <>
          <div
            className='flex items-center gap-2 text-xs text-gray-400'
            data-doc-id='admin_observability_range'
          >
            <GaugeIcon className='size-3.5' />
            <span>Range</span>
          </div>
          <SegmentedControl
            options={RANGE_OPTIONS}
            value={range}
            onChange={handleRangeChange}
            size='sm'
            ariaLabel='Observability time range'
          />
          <Button asChild variant='outline' size='sm'>
            <Link href={headerLogsHref} data-doc-id='admin_observability_quick_links'>
              Logs
            </Link>
          </Button>
        </>
      }
    >
      <div id='kangur-admin-observability-page' className='space-y-8'>
        <KangurDocsTooltipEnhancer
          enabled={adminDocsEnabled}
          rootId='kangur-admin-observability-page'
        />
        {summaryQuery.error ? <Alert variant='error'>{summaryQuery.error.message}</Alert> : null}

        {summaryQuery.isLoading && !summary ? (
          <LoadingState message='Loading observability...' className='min-h-[320px]' />
        ) : !summary || !knowledgeGraphStatus ? (
          <CompactEmptyState
            title='No observability summary available'
            description='The Kangur summary endpoint did not return data for this window.'
            action={
              <Button variant='outline' onClick={() => void summaryQuery.refetch()}>
                Refresh
              </Button>
            }
           />
        ) : (
          <ObservabilitySummaryContext.Provider value={{ range, summary }}>
            <KnowledgeGraphObservabilityProvider
              value={{
                knowledgeGraphStatus,
                knowledgeGraphStatusIsRefreshing: knowledgeGraphStatusQuery.isFetching,
                knowledgeGraphIsSyncing: isKnowledgeGraphSyncing,
                knowledgeGraphSyncFeedback,
                knowledgeGraphStatusError: knowledgeGraphStatusQuery.error,
                knowledgeGraphPreviewDraft,
                knowledgeGraphPreviewResult,
                knowledgeGraphPreviewError,
                knowledgeGraphPreviewIsRunning: isKnowledgeGraphPreviewRunning,
                knowledgeGraphPreviewReplayCandidates,
                updateKnowledgeGraphPreviewDraft,
                applyKnowledgeGraphPreviewReplayEvent,
                replayAnalyticsEventInKnowledgeGraphPreview,
                applyKnowledgeGraphPreviewPreset,
                clearKnowledgeGraphPreviewContext,
                runKnowledgeGraphPreview,
                refreshKnowledgeGraphStatus,
                syncKnowledgeGraph,
              }}
            >
              <div
                className={`${KANGUR_GRID_ROOMY_CLASSNAME} xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]`}
              >
                <SummaryContent />
                <KangurAdminStatusCard
                  title='Status'
                  statusBadge={<StatusBadge status={summary.overallStatus} size='sm' />}
                  items={[
                    {
                      label: 'Range',
                      value: <Badge variant='outline'>{range}</Badge>,
                    },
                    {
                      label: 'Window',
                      value: (
                        <div className='text-right text-foreground'>
                          <div>{formatDateTime(summary.window.from)}</div>
                          <div className='text-xs text-muted-foreground/80'>
                            {formatDateTime(summary.window.to)}
                          </div>
                        </div>
                      ),
                    },
                    {
                      label: 'Generated',
                      value: (
                        <span className='text-foreground font-semibold'>
                          {formatDateTime(summary.generatedAt)}
                        </span>
                      ),
                    },
                    {
                      label: 'Events',
                      value: (
                        <span className='text-foreground font-semibold'>
                          {formatNumber(summary.analytics.totals.events)}
                        </span>
                      ),
                    },
                    {
                      label: 'Server logs',
                      value: (
                        <span className='text-foreground font-semibold'>
                          {formatNumber(summary.serverLogs.metrics?.total ?? 0)}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </KnowledgeGraphObservabilityProvider>
          </ObservabilitySummaryContext.Provider>
        )}
      </div>
    </KangurAdminContentShell>
  );
}
