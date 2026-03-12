'use client';

import {
  ArrowUpRightIcon,
  AudioLinesIcon,
  BotIcon,
  GaugeIcon,
  LogInIcon,
  RefreshCwIcon,
  Repeat2Icon,
  ShieldAlertIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, type JSX, type ReactNode, useCallback, useContext, useState } from 'react';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import {
  useKangurKnowledgeGraphStatus,
  useKangurObservabilitySummary,
} from '@/features/kangur/observability/hooks';
import type {
  KangurAnalyticsCount,
  KangurKnowledgeGraphSemanticReadiness,
  KangurObservabilityAlert,
  KangurKnowledgeGraphStatusSnapshot,
  KangurObservabilityRange,
  KangurObservabilityStatus,
  KangurObservabilitySummary,
  KangurRouteHealth,
  KangurRouteMetrics,
} from '@/shared/contracts';
import {
  kangurKnowledgeGraphSyncResponseSchema,
  kangurObservabilityRangeSchema,
} from '@/shared/contracts';
import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/shared/contracts/kangur-knowledge-graph';
import { api } from '@/shared/lib/api-client';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  FormSection,
  LoadingState,
  MetadataItem,
  SegmentedControl,
  StatusBadge,
} from '@/shared/ui';

const RANGE_OPTIONS: Array<{ value: KangurObservabilityRange; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

const ROUTE_ENTRIES: Array<{
  key: keyof KangurRouteMetrics;
  label: string;
  description: string;
}> = [
  {
    key: 'authMeGet',
    label: 'Auth /me',
    description: 'Session hydration and learner context bootstrap.',
  },
  {
    key: 'learnerSignInPost',
    label: 'Learner Sign-in',
    description: 'Parent and learner credential handoff.',
  },
  {
    key: 'progressPatch',
    label: 'Progress Sync',
    description: 'Learner progress patches from the client runtime.',
  },
  {
    key: 'scoresPost',
    label: 'Score Create',
    description: 'Completed session and score persistence.',
  },
  {
    key: 'assignmentsPost',
    label: 'Assignment Create',
    description: 'Parent assignment creation and publishing.',
  },
  {
    key: 'learnersPost',
    label: 'Learner Create',
    description: 'Learner provisioning and ownership flows.',
  },
  {
    key: 'ttsPost',
    label: 'TTS Generate',
    description: 'Narration generation and fallback handling.',
  },
];

const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat().format(value);
};

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}%`;
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatDuration = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat().format(value)} ms`;
};

const formatKnowledgeGraphReadiness = (
  readiness: KangurKnowledgeGraphSemanticReadiness
): string => {
  switch (readiness) {
    case 'no_graph':
      return 'No graph';
    case 'no_semantic_text':
      return 'No semantic text';
    case 'metadata_only':
      return 'Metadata only';
    case 'embeddings_without_index':
      return 'Embeddings without index';
    case 'vector_index_pending':
      return 'Vector index pending';
    case 'vector_ready':
      return 'Vector ready';
    default:
      return readiness;
  }
};

const resolveKnowledgeGraphBadgeStatus = (
  status: KangurKnowledgeGraphStatusSnapshot
): 'ok' | 'warning' | 'critical' | 'insufficient_data' => {
  if (status.mode === 'disabled') {
    return 'insufficient_data';
  }

  if (status.mode === 'error') {
    return 'critical';
  }

  switch (status.semanticReadiness) {
    case 'vector_ready':
      return 'ok';
    case 'metadata_only':
    case 'embeddings_without_index':
    case 'vector_index_pending':
      return 'warning';
    case 'no_graph':
    case 'no_semantic_text':
      return 'critical';
    default:
      return 'insufficient_data';
  }
};

const describeKnowledgeGraphStatus = (
  status: Extract<KangurKnowledgeGraphStatusSnapshot, { mode: 'status' }>
): string => {
  switch (status.semanticReadiness) {
    case 'vector_ready':
      return 'Neo4j has semantic text, embeddings, and an online vector index for Kangur Tutor retrieval.';
    case 'vector_index_pending':
      return 'Embeddings are present, but the Neo4j vector index is still building or unavailable.';
    case 'embeddings_without_index':
      return 'Embeddings are stored on Kangur knowledge nodes, but the Neo4j vector index is missing.';
    case 'metadata_only':
      return 'The graph has semantic text but no embeddings yet, so Tutor retrieval is limited to metadata matching.';
    case 'no_semantic_text':
      return 'The graph is present, but semantic text has not been populated on Kangur knowledge nodes.';
    case 'no_graph':
      return 'Neo4j does not currently contain the Kangur knowledge graph snapshot.';
    default:
      return 'Kangur graph status is available.';
  }
};

const buildSystemLogsHref = (input: {
  query?: string;
  source?: string;
  from?: string;
  to?: string;
}): string => {
  const params = new URLSearchParams();
  if (input.query) params.set('query', input.query);
  if (input.source) params.set('source', input.source);
  if (input.from) params.set('from', input.from);
  if (input.to) params.set('to', input.to);
  const query = params.toString();
  return query ? `/admin/system/logs?${query}` : '/admin/system/logs';
};

const resolveObservabilityAlertVariant = (
  status: KangurObservabilityStatus
): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'ok':
      return 'success';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'error';
    case 'insufficient_data':
    default:
      return 'info';
  }
};

const formatKnowledgeGraphFreshnessValue = (
  alert: KangurObservabilityAlert | undefined
): string => {
  if (!alert) {
    return '—';
  }

  if (alert.status === 'ok') {
    return 'Current';
  }

  if (typeof alert.value === 'number' && Number.isFinite(alert.value)) {
    return `${alert.value.toFixed(1)} h lag`;
  }

  return alert.status === 'insufficient_data' ? 'Awaiting data' : 'Unknown';
};

const ObservabilitySummaryContext = createContext<{
  range: KangurObservabilityRange;
  summary: KangurObservabilitySummary;
} | null>(null);

const useObservabilitySummaryContext = () => {
  const value = useContext(ObservabilitySummaryContext);
  if (!value) {
    throw new Error('Observability summary context is unavailable.');
  }
  return value;
};

function MetricCard({
  title,
  value,
  hint,
  icon,
  alert,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  alert?: KangurObservabilityAlert | undefined;
}): JSX.Element {
  const alertStatus = alert?.status;

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-2'>
          <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400'>
            {icon}
            <span>{title}</span>
          </div>
          <div className='text-2xl font-semibold text-white'>{value}</div>
        </div>
        {alertStatus ? <StatusBadge status={alertStatus} /> : null}
      </div>
      <p className='mt-3 text-xs leading-relaxed text-gray-400'>{hint}</p>
    </Card>
  );
}

function RouteMetricCard({
  label,
  description,
  route,
}: {
  label: string;
  description: string;
  route: KangurRouteHealth;
}): JSX.Element {
  const metrics = route.metrics;
  const latency = route.latency;
  const errorCount = metrics?.levels.error ?? 0;
  const totalCount = metrics?.total ?? 0;
  const topPath = metrics?.topPaths[0]?.path ?? '—';
  const p95DurationMs = latency?.p95DurationMs ?? null;
  const slowThresholdMs = latency?.slowThresholdMs ?? null;
  const status =
    metrics === null && latency === null
      ? 'insufficient_data'
      : errorCount > 0
        ? 'warning'
        : p95DurationMs !== null && slowThresholdMs !== null && p95DurationMs >= slowThresholdMs * 2
          ? 'critical'
          : p95DurationMs !== null && slowThresholdMs !== null && p95DurationMs >= slowThresholdMs
            ? 'warning'
            : totalCount > 0 || (latency?.sampleSize ?? 0) > 0
              ? 'ok'
              : 'insufficient_data';

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-sm font-semibold text-white'>{label}</div>
          <p className='mt-1 text-xs leading-relaxed text-gray-400'>{description}</p>
        </div>
        <div className='flex items-center gap-2'>
          <StatusBadge status={status} />
          <Button asChild variant='ghost' size='sm'>
            <Link href={route.investigation.href}>
              Logs
              <ArrowUpRightIcon className='size-3.5' />
            </Link>
          </Button>
        </div>
      </div>

      <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
        <MetadataItem label='Requests' value={formatNumber(totalCount)} variant='card' />
        <MetadataItem label='Errors' value={formatNumber(errorCount)} variant='card' />
        <MetadataItem label='Avg' value={formatDuration(latency?.avgDurationMs)} variant='card' />
        <MetadataItem label='p95' value={formatDuration(p95DurationMs)} variant='card' />
        <MetadataItem
          label='Slow Requests'
          value={
            latency
              ? `${formatNumber(latency.slowRequestCount)} (${formatPercent(
                latency.slowRequestRatePercent
              )})`
              : '—'
          }
          variant='card'
        />
      </div>

      <div className='mt-3 grid gap-3 sm:grid-cols-2'>
        <MetadataItem label='Top Path' value={topPath} variant='minimal' mono />
        <MetadataItem
          label='Slow Threshold'
          value={formatDuration(slowThresholdMs)}
          variant='minimal'
        />
      </div>
    </Card>
  );
}

function AlertsGrid(): JSX.Element {
  const {
    summary: { alerts },
  } = useObservabilitySummaryContext();

  return (
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          variant='subtle'
          padding='md'
          className='border-border/60 bg-card/40'
        >
          <div className='flex items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='text-sm font-semibold text-white'>{alert.title}</div>
              <div className='text-xs text-gray-400'>{alert.summary}</div>
            </div>
            <StatusBadge status={alert.status} />
          </div>

          <div className='mt-4 grid gap-2 text-xs text-gray-300'>
            <MetadataItem
              label='Current'
              value={
                alert.unit === '%'
                  ? formatPercent(alert.value)
                  : alert.unit === 'count'
                    ? formatNumber(alert.value)
                    : alert.value === null
                      ? '—'
                      : `${formatNumber(alert.value)} ${alert.unit}`
              }
              variant='minimal'
            />
            <MetadataItem
              label='Warning'
              value={
                alert.warningThreshold === null
                  ? '—'
                  : alert.unit === '%'
                    ? formatPercent(alert.warningThreshold)
                    : formatNumber(alert.warningThreshold)
              }
              variant='minimal'
            />
            <MetadataItem
              label='Critical'
              value={
                alert.criticalThreshold === null
                  ? '—'
                  : alert.unit === '%'
                    ? formatPercent(alert.criticalThreshold)
                    : formatNumber(alert.criticalThreshold)
              }
              variant='minimal'
            />
          </div>
          {alert.investigation ? (
            <Button asChild variant='ghost' size='sm' className='mt-4 w-full justify-between'>
              <Link href={alert.investigation.href}>
                {alert.investigation.label}
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function AnalyticsCountList({
  title,
  items,
  emptyTitle,
}: {
  title: string;
  items: KangurAnalyticsCount[];
  emptyTitle: string;
}): JSX.Element {
  const sectionTitle = title;
  const emptyStateTitle = emptyTitle;

  return (
    <FormSection title={sectionTitle} variant='subtle'>
      {items.length === 0 ? (
        <EmptyState title={emptyStateTitle} variant='compact' />
      ) : (
        <div className='space-y-2'>
          {items.map((item) => (
            <Card
              key={item.name}
              variant='subtle'
              padding='sm'
              className='flex items-center justify-between gap-3 border-border/60 bg-card/40'
            >
              <span className='min-w-0 truncate text-sm text-white'>{item.name}</span>
              <StatusBadge status='info' label={formatNumber(item.count)} />
            </Card>
          ))}
        </div>
      )}
    </FormSection>
  );
}

function ImportantClientEventsSection(): JSX.Element {
  const {
    summary: {
      analytics: { importantEvents },
    },
  } = useObservabilitySummaryContext();

  return (
    <AnalyticsCountList
      title='Important Client Events'
      items={importantEvents}
      emptyTitle='No important Kangur client events'
    />
  );
}

function TopEventNamesSection(): JSX.Element {
  const {
    summary: {
      analytics: { topEventNames },
    },
  } = useObservabilitySummaryContext();

  return (
    <AnalyticsCountList
      title='Top Event Names'
      items={topEventNames}
      emptyTitle='No Kangur event names recorded'
    />
  );
}

function TopPathsSection(): JSX.Element {
  const {
    summary: {
      analytics: { topPaths },
    },
  } = useObservabilitySummaryContext();

  return (
    <FormSection title='Top Paths' variant='subtle'>
      {topPaths.length === 0 ? (
        <EmptyState title='No top paths yet' variant='compact' />
      ) : (
        <div className='space-y-2'>
          {topPaths.map((item) => (
            <Card
              key={item.path}
              variant='subtle'
              padding='sm'
              className='flex items-center justify-between gap-3 border-border/60 bg-card/40'
            >
              <span className='min-w-0 truncate text-sm text-white'>{item.path}</span>
              <StatusBadge status='info' label={formatNumber(item.count)} />
            </Card>
          ))}
        </div>
      )}
    </FormSection>
  );
}

function RecentAnalyticsEvents(): JSX.Element {
  const {
    summary: {
      analytics: { recent: events },
    },
  } = useObservabilitySummaryContext();

  return (
    <div id='recent-analytics-events'>
      <FormSection title='Recent Analytics Events' variant='subtle'>
        {events.length === 0 ? (
          <EmptyState
            title='No recent analytics events'
            description='Client telemetry has not recorded a recent Kangur event in this window.'
            variant='compact'
          />
        ) : (
          <div className='space-y-2'>
            {events.map((event) => (
              <Card
                key={event.id}
                variant='subtle'
                padding='sm'
                className='border-border/60 bg-card/40'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <div className='truncate text-sm font-semibold text-white'>
                      {event.name ?? event.type}
                    </div>
                    <div className='mt-1 truncate text-xs text-gray-400'>{event.path || '—'}</div>
                  </div>
                  <StatusBadge status={event.type === 'pageview' ? 'info' : 'active'} />
                </div>
                <div className='mt-3 grid gap-2 sm:grid-cols-3'>
                  <MetadataItem label='At' value={formatDateTime(event.ts)} variant='minimal' />
                  <MetadataItem label='Visitor' value={event.visitorId || '—'} variant='minimal' mono />
                  <MetadataItem label='Session' value={event.sessionId || '—'} variant='minimal' mono />
                </div>
              </Card>
            ))}
          </div>
        )}
      </FormSection>
    </div>
  );
}

function RecentServerLogs(): JSX.Element {
  const {
    summary: {
      serverLogs: { recent: logs },
    },
  } = useObservabilitySummaryContext();

  return (
    <FormSection title='Recent Server Logs' variant='subtle'>
      {logs.length === 0 ? (
        <EmptyState
          title='No recent server logs'
          description='No Kangur server-side log entries were captured in this window.'
          variant='compact'
        />
      ) : (
        <div className='space-y-2'>
          {logs.map((log) => (
            <Card
              key={log.id}
              variant='subtle'
              padding='sm'
              className='border-border/60 bg-card/40'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='truncate text-sm font-semibold text-white'>{log.message}</div>
                  <div className='mt-1 truncate text-xs text-gray-400'>
                    {[log.source, log.path].filter(Boolean).join(' • ') || 'Kangur server event'}
                  </div>
                </div>
                <StatusBadge status={log.level} />
              </div>
              <div className='mt-3 grid gap-2 sm:grid-cols-3'>
                <MetadataItem label='At' value={formatDateTime(log.createdAt)} variant='minimal' />
                <MetadataItem label='Request' value={log.requestId || '—'} variant='minimal' mono />
                <MetadataItem label='Trace' value={log.traceId || '—'} variant='minimal' mono />
              </div>
            </Card>
          ))}
        </div>
      )}
    </FormSection>
  );
}

function AiTutorBridgeMetrics(): JSX.Element {
  const { summary } = useObservabilitySummaryContext();
  const aiTutor = summary.analytics.aiTutor;
  const directAnswerCount = aiTutor.pageContentAnswerCount + aiTutor.nativeGuideAnswerCount;
  const directAnswerRate = formatPercent(aiTutor.directAnswerRatePercent);
  const brainFallbackRate = formatPercent(aiTutor.brainFallbackRatePercent);
  const bridgeCompletionRate = formatPercent(aiTutor.bridgeCompletionRatePercent);
  const graphCoverageRate = formatPercent(aiTutor.knowledgeGraphCoverageRatePercent);
  const vectorAssistRate = formatPercent(aiTutor.knowledgeGraphVectorAssistRatePercent);
  const recallMix = [
    `Metadata ${formatNumber(aiTutor.knowledgeGraphMetadataOnlyRecallCount)}`,
    `Hybrid ${formatNumber(aiTutor.knowledgeGraphHybridRecallCount)}`,
    `Vector-only ${formatNumber(aiTutor.knowledgeGraphVectorOnlyRecallCount)}`,
  ].join(' / ');

  return (
    <div id='ai-tutor-bridge'>
      <FormSection title='AI Tutor Bridge Snapshot' variant='subtle'>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          <MetricCard
            title='Tutor Replies'
            value={formatNumber(aiTutor.messageSucceededCount)}
            hint='Successful learner-facing AI Tutor replies in the selected window.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Page-Content Answers'
            value={formatNumber(aiTutor.pageContentAnswerCount)}
            hint='Replies resolved directly from Mongo-backed section page content.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Native Guide Answers'
            value={formatNumber(aiTutor.nativeGuideAnswerCount)}
            hint='Replies resolved from linked native guides without Brain fallback.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Brain Fallback Replies'
            value={formatNumber(aiTutor.brainAnswerCount)}
            hint='Replies that still required Brain generation after deterministic sources were checked.'
            icon={<ShieldAlertIcon className='size-3.5' />}
          />
          <MetricCard
            title='Direct Answer Rate'
            value={directAnswerRate}
            hint={`Page-content and native-guide replies as a share of ${formatNumber(aiTutor.messageSucceededCount)} Tutor replies.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Brain Fallback Rate'
            value={brainFallbackRate}
            hint={`Brain fallbacks as a share of ${formatNumber(aiTutor.messageSucceededCount)} Tutor replies. Direct answers: ${formatNumber(directAnswerCount)}.`}
            icon={<ShieldAlertIcon className='size-3.5' />}
          />
          <MetricCard
            title='Bridge Suggestions'
            value={formatNumber(aiTutor.bridgeSuggestionCount)}
            hint='Replies that suggested a lesson-to-game or game-to-lesson bridge.'
            icon={<Repeat2Icon className='size-3.5' />}
          />
          <MetricCard
            title='Lekcja -> Grajmy'
            value={formatNumber(aiTutor.lessonToGameBridgeSuggestionCount)}
            hint='Bridge suggestions moving the learner from lesson review into practice.'
            icon={<ArrowUpRightIcon className='size-3.5' />}
          />
          <MetricCard
            title='Grajmy -> Lekcja'
            value={formatNumber(aiTutor.gameToLessonBridgeSuggestionCount)}
            hint='Bridge suggestions moving the learner from practice back into a lesson.'
            icon={<ArrowUpRightIcon className='size-3.5 rotate-180' />}
          />
          <MetricCard
            title='Bridge CTA Clicks'
            value={formatNumber(aiTutor.bridgeQuickActionClickCount)}
            hint='Bridge quick actions accepted directly from the tutor widget.'
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Bridge Completions'
            value={formatNumber(aiTutor.bridgeFollowUpCompletionCount)}
            hint={`Opened: ${formatNumber(aiTutor.bridgeFollowUpClickCount)} bridge follow-ups. Completed: ${formatNumber(aiTutor.bridgeFollowUpCompletionCount)}.`}
            icon={<Repeat2Icon className='size-3.5' />}
          />
          <MetricCard
            title='Bridge Completion Rate'
            value={bridgeCompletionRate}
            hint={`Completed follow-ups as a share of ${formatNumber(aiTutor.bridgeSuggestionCount)} bridge suggestions.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Neo4j-backed Replies'
            value={formatNumber(aiTutor.knowledgeGraphAppliedCount)}
            hint='Replies that returned knowledge-graph retrieval diagnostics from the server.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Graph Coverage'
            value={graphCoverageRate}
            hint={`Graph-backed share across ${formatNumber(aiTutor.messageSucceededCount)} Tutor replies.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Semantic Graph Replies'
            value={formatNumber(aiTutor.knowledgeGraphSemanticCount)}
            hint={`Website-help graph replies: ${formatNumber(aiTutor.knowledgeGraphWebsiteHelpCount)}.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Recall Mix'
            value={recallMix}
            hint={`Vector recall attempts: ${formatNumber(aiTutor.knowledgeGraphVectorRecallAttemptedCount)}.`}
            icon={<RefreshCwIcon className='size-3.5' />}
          />
          <MetricCard
            title='Vector Assist Rate'
            value={vectorAssistRate}
            hint={`Hybrid and vector-only recall as a share of ${formatNumber(aiTutor.knowledgeGraphSemanticCount)} semantic graph replies.`}
            icon={<RefreshCwIcon className='size-3.5' />}
          />
        </div>
      </FormSection>
    </div>
  );
}

function KnowledgeGraphStatusSection({
  knowledgeGraphStatus,
  freshnessAlert,
  isRefreshing,
  isSyncing,
  syncFeedback,
  error,
  onRefresh,
  onSync,
}: {
  knowledgeGraphStatus: KangurKnowledgeGraphStatusSnapshot;
  freshnessAlert?: KangurObservabilityAlert | undefined;
  isRefreshing: boolean;
  isSyncing: boolean;
  syncFeedback:
    | {
        tone: 'success' | 'error';
        message: string;
      }
    | null;
  error: Error | null;
  onRefresh: () => void;
  onSync: () => void;
}): JSX.Element {
  return (
    <div id='knowledge-graph-status'>
      <FormSection title='Knowledge Graph Status' variant='subtle'>
        {error ? (
          <Alert variant='warning' className='mb-4'>
            {error.message}
          </Alert>
        ) : null}
        {knowledgeGraphStatus.mode === 'disabled' ? (
          <EmptyState
            title='Neo4j graph status disabled'
            description={knowledgeGraphStatus.message}
            variant='compact'
            action={
              <Button variant='outline' size='sm' onClick={onRefresh} disabled={isRefreshing}>
                Refresh graph status
              </Button>
            }
          />
        ) : knowledgeGraphStatus.mode === 'error' ? (
          <div className='space-y-3'>
            <Alert variant='warning'>
              Failed to load live graph status for `{knowledgeGraphStatus.graphKey}`.{' '}
              {knowledgeGraphStatus.message}
            </Alert>
            <div>
              <Button variant='outline' size='sm' onClick={onRefresh} disabled={isRefreshing}>
                Refresh graph status
              </Button>
            </div>
          </div>
        ) : (
          <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-3'>
                  <div className='text-sm font-semibold text-white'>Neo4j semantic retrieval graph</div>
                  <StatusBadge status={resolveKnowledgeGraphBadgeStatus(knowledgeGraphStatus)} />
                </div>
                <p className='max-w-3xl text-xs leading-relaxed text-gray-400'>
                  {describeKnowledgeGraphStatus(knowledgeGraphStatus)}
                </p>
              </div>
              <div className='flex flex-col gap-3'>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='self-start'
                    onClick={onSync}
                    disabled={isSyncing || isRefreshing}
                  >
                    {isSyncing ? 'Syncing graph...' : 'Sync graph now'}
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='self-start'
                    onClick={onRefresh}
                    disabled={isRefreshing || isSyncing}
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh graph status'}
                  </Button>
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                <MetadataItem label='Graph Key' value={knowledgeGraphStatus.graphKey} variant='card' mono />
                <MetadataItem label='Synced' value={formatDateTime(knowledgeGraphStatus.syncedAt)} variant='card' />
                <MetadataItem label='Locale' value={knowledgeGraphStatus.locale ?? '—'} variant='card' />
                <MetadataItem label='Readiness' value={formatKnowledgeGraphReadiness(knowledgeGraphStatus.semanticReadiness)} variant='card' />
                </div>
              </div>
            </div>

            {freshnessAlert ? (
              <Alert
                variant={resolveObservabilityAlertVariant(freshnessAlert.status)}
                title='Freshness against canonical tutor content'
                className='mt-4'
              >
                <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                  <div className='space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <StatusBadge status={freshnessAlert.status} />
                      <span className='text-xs font-semibold uppercase tracking-wider text-gray-200'>
                        {formatKnowledgeGraphFreshnessValue(freshnessAlert)}
                      </span>
                    </div>
                    <p className='text-xs leading-relaxed'>{freshnessAlert.summary}</p>
                  </div>
                  {freshnessAlert.investigation ? (
                    <Button asChild variant='ghost' size='sm' className='self-start'>
                      <Link href={freshnessAlert.investigation.href}>
                        {freshnessAlert.investigation.label}
                        <ArrowUpRightIcon className='size-3.5' />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </Alert>
            ) : null}

            {syncFeedback ? (
              <Alert
                variant={syncFeedback.tone}
                title={syncFeedback.tone === 'success' ? 'Graph sync completed' : 'Graph sync failed'}
                className='mt-4'
              >
                {syncFeedback.message}
              </Alert>
            ) : null}

            <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <MetadataItem
                label='Freshness'
                value={formatKnowledgeGraphFreshnessValue(freshnessAlert)}
                variant='card'
              />
              <MetadataItem
                label='Semantic Coverage'
                value={formatPercent(knowledgeGraphStatus.semanticCoverageRatePercent)}
                variant='card'
              />
              <MetadataItem
                label='Embedding Coverage'
                value={formatPercent(knowledgeGraphStatus.embeddingCoverageRatePercent)}
                variant='card'
              />
              <MetadataItem
                label='Vector Index'
                value={
                  knowledgeGraphStatus.vectorIndexPresent
                    ? [knowledgeGraphStatus.vectorIndexState, knowledgeGraphStatus.vectorIndexType]
                        .filter(Boolean)
                        .join(' • ') || 'Present'
                    : 'Missing'
                }
                variant='card'
              />
              <MetadataItem
                label='Embedding Model'
                value={knowledgeGraphStatus.embeddingModels.join(', ') || '—'}
                variant='card'
              />
              <MetadataItem
                label='Live Graph'
                value={`${formatNumber(knowledgeGraphStatus.liveNodeCount)} nodes / ${formatNumber(knowledgeGraphStatus.liveEdgeCount)} edges`}
                variant='card'
              />
              <MetadataItem
                label='Synced Snapshot'
                value={`${formatNumber(knowledgeGraphStatus.syncedNodeCount)} nodes / ${formatNumber(knowledgeGraphStatus.syncedEdgeCount)} edges`}
                variant='card'
              />
              <MetadataItem
                label='Canonical Integrity'
                value={
                  knowledgeGraphStatus.invalidCanonicalNodeCount === 0
                    ? 'All canonical nodes valid'
                    : `${formatNumber(knowledgeGraphStatus.invalidCanonicalNodeCount)} invalid`
                }
                variant='card'
              />
              <MetadataItem
                label='Embedding Dimensions'
                value={formatNumber(knowledgeGraphStatus.vectorIndexDimensions ?? knowledgeGraphStatus.embeddingDimensions)}
                variant='card'
              />
            </div>
          </Card>
        )}
      </FormSection>
    </div>
  );
}

function PerformanceBaselineCard(): JSX.Element {
  const {
    summary: { performanceBaseline: baseline },
  } = useObservabilitySummaryContext();

  return (
    <div id='performance-baseline'>
      <FormSection title='Performance Baseline' variant='subtle'>
        {!baseline ? (
          <EmptyState
            title='No baseline available'
            description='The latest Kangur performance artifact has not been generated yet.'
            variant='compact'
          />
        ) : (
          <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <div className='text-sm font-semibold text-white'>Latest baseline artifact</div>
                <div className='mt-1 text-xs text-gray-400'>
                  Generated {formatDateTime(baseline.generatedAt)}
                </div>
              </div>
              <StatusBadge
                status={
                  baseline.unitStatus === 'pass' && baseline.e2eStatus === 'pass'
                    ? 'ok'
                    : baseline.infraFailures && baseline.infraFailures > 0
                      ? 'warning'
                      : baseline.failedRuns && baseline.failedRuns > 0
                        ? 'critical'
                        : 'warning'
                }
              />
            </div>

            <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <MetadataItem label='Unit' value={baseline.unitStatus ?? '—'} variant='card' />
              <MetadataItem label='Unit Time' value={formatDuration(baseline.unitDurationMs)} variant='card' />
              <MetadataItem label='E2E' value={baseline.e2eStatus ?? '—'} variant='card' />
              <MetadataItem label='E2E Time' value={formatDuration(baseline.e2eDurationMs)} variant='card' />
              <MetadataItem label='Infra Failures' value={formatNumber(baseline.infraFailures)} variant='card' />
              <MetadataItem label='Failed Runs' value={formatNumber(baseline.failedRuns)} variant='card' />
              <MetadataItem
                label='Bundle Bytes'
                value={formatNumber(baseline.bundleRiskTotalBytes)}
                variant='card'
              />
              <MetadataItem
                label='Bundle Lines'
                value={formatNumber(baseline.bundleRiskTotalLines)}
                variant='card'
              />
            </div>
          </Card>
        )}
      </FormSection>
    </div>
  );
}

function SummaryContent({
  knowledgeGraphStatus,
  knowledgeGraphStatusIsRefreshing,
  knowledgeGraphIsSyncing,
  knowledgeGraphSyncFeedback,
  knowledgeGraphStatusError,
  refreshKnowledgeGraphStatus,
  syncKnowledgeGraph,
}: {
  knowledgeGraphStatus: KangurKnowledgeGraphStatusSnapshot;
  knowledgeGraphStatusIsRefreshing: boolean;
  knowledgeGraphIsSyncing: boolean;
  knowledgeGraphSyncFeedback:
    | {
        tone: 'success' | 'error';
        message: string;
      }
    | null;
  knowledgeGraphStatusError: Error | null;
  refreshKnowledgeGraphStatus: () => void;
  syncKnowledgeGraph: () => void;
}): JSX.Element {
  const { range, summary } = useObservabilitySummaryContext();
  const alertById = new Map(summary.alerts.map((alert) => [alert.id, alert]));
  const allKangurLogsHref = buildSystemLogsHref({
    query: 'kangur.',
    from: summary.window.from,
    to: summary.window.to,
  });
  const ttsFallbackLogsHref = buildSystemLogsHref({
    source: 'kangur.tts.fallback',
    from: summary.window.from,
    to: summary.window.to,
  });
  const ttsGenerationFailureLogsHref = buildSystemLogsHref({
    source: 'kangur.tts.generationFailed',
    from: summary.window.from,
    to: summary.window.to,
  });

  return (
    <div className='space-y-6'>
      <FormSection title='Operational Snapshot' variant='subtle'>
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='space-y-3'>
              <div className='flex flex-wrap items-center gap-3'>
                <StatusBadge status={summary.overallStatus} />
                <span className='text-sm text-gray-300'>
                  Window {formatDateTime(summary.window.from)} to {formatDateTime(summary.window.to)}
                </span>
              </div>
              <p className='max-w-3xl text-sm leading-relaxed text-gray-400'>
                Consolidated Kangur-specific health for auth, progress sync, score persistence,
                assignments, learner provisioning, TTS behavior, and the latest performance
                baseline.
              </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <MetadataItem label='Generated' value={formatDateTime(summary.generatedAt)} variant='card' />
              <MetadataItem label='Range' value={range} variant='card' />
              <MetadataItem
                label='Analytics Events'
                value={formatNumber(summary.analytics.totals.events)}
                variant='card'
              />
              <MetadataItem
                label='Server Logs'
                value={formatNumber(summary.serverLogs.metrics?.total ?? 0)}
                variant='card'
              />
            </div>
          </div>
        </Card>
      </FormSection>

      <FormSection title='Key Metrics' variant='subtle'>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
          <MetricCard
            title='Server Error Rate'
            value={formatPercent(summary.keyMetrics.serverErrorRatePercent)}
            hint='Share of Kangur server log entries captured as errors in the selected window.'
            icon={<ShieldAlertIcon className='size-3.5' />}
            alert={alertById.get('kangur-server-error-rate')}
          />
          <MetricCard
            title='Learner Sign-in Failure'
            value={formatPercent(summary.keyMetrics.learnerSignInFailureRatePercent)}
            hint={`Across ${formatNumber(summary.keyMetrics.learnerSignInAttempts)} learner sign-in attempts.`}
            icon={<LogInIcon className='size-3.5' />}
            alert={alertById.get('kangur-learner-signin-failure-rate')}
          />
          <MetricCard
            title='Progress Sync Failures'
            value={formatNumber(summary.keyMetrics.progressSyncFailures)}
            hint='Client progress sync failures observed through Kangur runtime telemetry.'
            icon={<RefreshCwIcon className='size-3.5' />}
            alert={alertById.get('kangur-progress-sync-failures')}
          />
          <MetricCard
            title='TTS Generation Failures'
            value={formatNumber(summary.keyMetrics.ttsGenerationFailures)}
            hint='Server narrator generation failures before browser fallback or client narrator recovery.'
            icon={<AudioLinesIcon className='size-3.5' />}
            alert={alertById.get('kangur-tts-generation-failures')}
          />
          <MetricCard
            title='TTS Fallback Rate'
            value={formatPercent(summary.keyMetrics.ttsFallbackRatePercent)}
            hint={`Across ${formatNumber(summary.keyMetrics.ttsRequests)} Kangur TTS requests.`}
            icon={<AudioLinesIcon className='size-3.5' />}
            alert={alertById.get('kangur-tts-fallback-rate')}
          />
        </div>
      </FormSection>

      <AiTutorBridgeMetrics />
      <KnowledgeGraphStatusSection
        knowledgeGraphStatus={knowledgeGraphStatus}
        freshnessAlert={alertById.get('kangur-knowledge-graph-freshness')}
        isRefreshing={knowledgeGraphStatusIsRefreshing}
        isSyncing={knowledgeGraphIsSyncing}
        syncFeedback={knowledgeGraphSyncFeedback}
        error={knowledgeGraphStatusError}
        onRefresh={refreshKnowledgeGraphStatus}
        onSync={syncKnowledgeGraph}
      />

      <FormSection title='Alerts' variant='subtle'>
        <div data-doc-id='admin_observability_alerts'>
          <AlertsGrid />
        </div>
      </FormSection>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'>
        <FormSection title='Route Health' variant='subtle'>
          <div className='grid gap-4 md:grid-cols-2'>
            {ROUTE_ENTRIES.map((entry) => (
              <RouteMetricCard
                key={entry.key}
                label={entry.label}
                description={entry.description}
                route={summary.routes[entry.key]}
              />
            ))}
          </div>
        </FormSection>

        <PerformanceBaselineCard />
      </div>

      <div className='grid gap-6 xl:grid-cols-3'>
        <ImportantClientEventsSection />
        <TopEventNamesSection />
        <TopPathsSection />
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        <RecentAnalyticsEvents />
        <RecentServerLogs />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]'>
        <FormSection title='Degraded Dependencies' variant='subtle'>
          {!summary.errors || Object.keys(summary.errors).length === 0 ? (
            <EmptyState
              title='No degraded dependencies'
              description='All summary contributors responded without a partial-failure marker.'
              variant='compact'
            />
          ) : (
            <div className='space-y-2'>
              {Object.entries(summary.errors).map(([key, message]) => (
                <Card
                  key={key}
                  variant='warning'
                  padding='sm'
                  className='border-amber-500/30 bg-amber-500/10'
                >
                  <div className='text-sm font-semibold text-white'>{key}</div>
                  <div className='mt-1 text-xs text-amber-100/80'>{message}</div>
                </Card>
              ))}
            </div>
          )}
        </FormSection>

        <FormSection title='Quick Links' variant='subtle'>
          <div className='space-y-3' data-doc-id='admin_observability_quick_links'>
            <Button asChild variant='outline' className='w-full justify-between'>
              <Link href={allKangurLogsHref}>
                All Kangur Logs
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between'>
              <Link href={ttsGenerationFailureLogsHref}>
                TTS Generation Failure Logs
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between'>
              <Link href={ttsFallbackLogsHref}>
                TTS Fallback Logs
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between'>
              <Link href='/admin/analytics'>
                Global Analytics
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between'>
              <a
                href='/api/kangur/knowledge-graph/status'
                target='_blank'
                rel='noopener noreferrer'
              >
                Knowledge Graph Status JSON
                <ArrowUpRightIcon className='size-3.5' />
              </a>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between'>
              <a
                href={`/api/kangur/observability/summary?range=${range}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                Raw Summary JSON
                <ArrowUpRightIcon className='size-3.5' />
              </a>
            </Button>
          </div>
        </FormSection>
      </div>
    </div>
  );
}

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
  const headerLogsHref = buildSystemLogsHref({
    query: 'kangur.',
    from: summary?.window.from,
    to: summary?.window.to,
  });
  const summaryKnowledgeGraphStatus = summary?.knowledgeGraphStatus;
  const summaryKnowledgeGraphLocale =
    summaryKnowledgeGraphStatus?.mode === 'status' ? summaryKnowledgeGraphStatus.locale : null;
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
        message: `Synced ${formatNumber(parsed.data.sync.nodeCount)} nodes and ${formatNumber(parsed.data.sync.edgeCount)} edges${parsed.data.sync.withEmbeddings ? ' with embeddings preserved.' : '.'}`,
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
            <SummaryContent
              knowledgeGraphStatus={knowledgeGraphStatus}
              knowledgeGraphStatusIsRefreshing={knowledgeGraphStatusQuery.isFetching}
              knowledgeGraphIsSyncing={isKnowledgeGraphSyncing}
              knowledgeGraphSyncFeedback={knowledgeGraphSyncFeedback}
              knowledgeGraphStatusError={knowledgeGraphStatusQuery.error}
              refreshKnowledgeGraphStatus={refreshKnowledgeGraphStatus}
              syncKnowledgeGraph={(): void => {
                void syncKnowledgeGraph();
              }}
            />
          </ObservabilitySummaryContext.Provider>
        )}
      </div>
    </KangurAdminContentShell>
  );
}
