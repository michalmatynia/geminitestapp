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
import { type JSX, type ReactNode, useCallback } from 'react';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { useKangurObservabilitySummary } from '@/features/kangur/observability/hooks';
import type {
  KangurAnalyticsCount,
  KangurObservabilityAlert,
  KangurObservabilityRange,
  KangurObservabilitySummary,
  KangurPerformanceBaseline,
  KangurRecentAnalyticsEvent,
  KangurRouteHealth,
  KangurRouteMetrics,
  SystemLogRecordDto as SystemLogRecord,
} from '@/shared/contracts';
import { kangurObservabilityRangeSchema } from '@/shared/contracts';
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
        {alert ? <StatusBadge status={alert.status} /> : null}
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

function AlertsGrid({ alerts }: { alerts: KangurObservabilityAlert[] }): JSX.Element {
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
  return (
    <FormSection title={title} variant='subtle'>
      {items.length === 0 ? (
        <EmptyState title={emptyTitle} variant='compact' />
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

function RecentAnalyticsEvents({
  events,
}: {
  events: KangurRecentAnalyticsEvent[];
}): JSX.Element {
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

function RecentServerLogs({ logs }: { logs: SystemLogRecord[] }): JSX.Element {
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

function AiTutorBridgeMetrics({
  summary,
}: {
  summary: KangurObservabilitySummary;
}): JSX.Element {
  const aiTutor = summary.analytics.aiTutor;

  return (
    <FormSection title='AI Tutor Bridge Snapshot' variant='subtle'>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        <MetricCard
          title='Tutor Replies'
          value={formatNumber(aiTutor.messageSucceededCount)}
          hint='Successful learner-facing AI Tutor replies in the selected window.'
          icon={<BotIcon className='size-3.5' />}
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
      </div>
    </FormSection>
  );
}

function PerformanceBaselineCard({
  baseline,
}: {
  baseline: KangurPerformanceBaseline | null;
}): JSX.Element {
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
  range,
  summary,
}: {
  range: KangurObservabilityRange;
  summary: KangurObservabilitySummary;
}): JSX.Element {
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

      <AiTutorBridgeMetrics summary={summary} />

      <FormSection title='Alerts' variant='subtle'>
        <div data-doc-id='admin_observability_alerts'>
          <AlertsGrid alerts={summary.alerts} />
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

        <PerformanceBaselineCard baseline={summary.performanceBaseline} />
      </div>

      <div className='grid gap-6 xl:grid-cols-3'>
        <AnalyticsCountList
          title='Important Client Events'
          items={summary.analytics.importantEvents}
          emptyTitle='No important Kangur client events'
        />
        <AnalyticsCountList
          title='Top Event Names'
          items={summary.analytics.topEventNames}
          emptyTitle='No Kangur event names recorded'
        />
        <FormSection title='Top Paths' variant='subtle'>
          {summary.analytics.topPaths.length === 0 ? (
            <EmptyState title='No top paths yet' variant='compact' />
          ) : (
            <div className='space-y-2'>
              {summary.analytics.topPaths.map((item) => (
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
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        <RecentAnalyticsEvents events={summary.analytics.recent} />
        <RecentServerLogs logs={summary.serverLogs.recent} />
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
                href={`/api/kangur/observability/summary?range=${range}`}
                target='_blank'
                rel='noreferrer'
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
  const headerLogsHref = buildSystemLogsHref({
    query: 'kangur.',
    from: summary?.window.from,
    to: summary?.window.to,
  });
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
        },
        isRefreshing: summaryQuery.isFetching,
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
        ) : !summary ? (
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
          <SummaryContent range={range} summary={summary} />
        )}
      </div>
    </KangurAdminContentShell>
  );
}
