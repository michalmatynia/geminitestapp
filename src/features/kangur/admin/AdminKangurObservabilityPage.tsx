'use client';

import { GaugeIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, type JSX, useCallback, useContext, useState } from 'react';

import {
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO,
} from '@/features/kangur/ai-tutor-page-coverage-manifest';
import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import {
  useKangurKnowledgeGraphStatus,
  useKangurObservabilitySummary,
} from '@/features/kangur/observability/hooks';
import type {
  KangurKnowledgeGraphPreviewResponse,
  KangurObservabilityRange,
  KangurObservabilitySummary,
} from '@/shared/contracts';
import {
  kangurKnowledgeGraphPreviewResponseSchema,
  kangurKnowledgeGraphSyncResponseSchema,
  kangurObservabilityRangeSchema,
} from '@/shared/contracts';
import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/shared/contracts/kangur-knowledge-graph';
import { api } from '@/shared/lib/api-client';
import {
  Alert,
  Button,
  EmptyState,
  LoadingState,
  SegmentedControl,
} from '@/shared/ui';

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

const RANGE_OPTIONS: Array<{ value: KangurObservabilityRange; label: string }> = [
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
  const [knowledgeGraphPreviewDraft, setKnowledgeGraphPreviewDraft] = useState<KnowledgeGraphPreviewDraft>(
    createKnowledgeGraphPreviewDraft
  );
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

      try {
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

        setKnowledgeGraphPreviewResult(parsed.data);
      } catch (error) {
        setKnowledgeGraphPreviewResult(null);
        setKnowledgeGraphPreviewError(
          error instanceof Error ? error.message : 'Failed to run the knowledge graph preview.'
        );
      } finally {
        setIsKnowledgeGraphPreviewRunning(false);
      }
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
    const entry = KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.find((e: any) => e.id === entryId);
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
  const syncKnowledgeGraph = useCallback(async (): Promise<void> => {
    if (knowledgeGraphStatus?.mode !== 'status') {
      return;
    }

    setIsKnowledgeGraphSyncing(true);
    setKnowledgeGraphSyncFeedback(null);

    try {
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

      setKnowledgeGraphSyncFeedback({
        tone: 'success',
        message: `Synced ${new Intl.NumberFormat().format(parsed.data.sync.nodeCount)} nodes and ${new Intl.NumberFormat().format(parsed.data.sync.edgeCount)} edges${parsed.data.sync.withEmbeddings ? ' with embeddings preserved.' : '.'}`,
      });
      void summaryQuery.refetch();
      void knowledgeGraphStatusQuery.refetch();
    } catch (error) {
      setKnowledgeGraphSyncFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to sync the Kangur knowledge graph.',
      });
    } finally {
      setIsKnowledgeGraphSyncing(false);
    }
  }, [knowledgeGraphStatus, knowledgeGraphStatusQuery, summaryKnowledgeGraphLocale, summaryQuery]);
  const runKnowledgeGraphPreview = useCallback(async (): Promise<void> => {
    await runKnowledgeGraphPreviewForDraft(knowledgeGraphPreviewDraft);
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
      description='Monitor Kangur-specific alerts, route health, client telemetry, and recent server activity.'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Observability' },
      ]}
      refresh={{
        onRefresh: (): void => {
          void summaryQuery.refetch();
          void knowledgeGraphStatusQuery.refetch();
        },
        isRefreshing: summaryQuery.isFetching || knowledgeGraphStatusQuery.isFetching,
      }}
      headerActions={
        <div className='flex flex-wrap items-center gap-3'>
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
        </div>
      }
    >
      <div id='kangur-admin-observability-page' className='space-y-6'>
        <KangurDocsTooltipEnhancer
          enabled={adminDocsEnabled}
          rootId='kangur-admin-observability-page'
        />
        {summaryQuery.error ? <Alert variant='error'>{summaryQuery.error.message}</Alert> : null}

        {summaryQuery.isLoading && !summary ? (
          <LoadingState message='Loading Kangur observability...' className='min-h-[320px]' />
        ) : !summary || !knowledgeGraphStatus ? (
          <EmptyState
            title='No observability summary available'
            description='The Kangur summary endpoint did not return data for this window.'
            variant='compact'
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
              <SummaryContent />
            </KnowledgeGraphObservabilityProvider>
          </ObservabilitySummaryContext.Provider>
        )}
      </div>
    </KangurAdminContentShell>
  );
}
