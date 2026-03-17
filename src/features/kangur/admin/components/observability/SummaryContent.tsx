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
import { type JSX } from 'react';

import { Button, Card, CompactEmptyState, FormSection, MetadataItem, StatusBadge } from '@/features/kangur/shared/ui';
import {
  KANGUR_GRID_RELAXED_CLASSNAME,
  KANGUR_GRID_ROOMY_CLASSNAME,
  KANGUR_STACK_RELAXED_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type { KangurRouteMetrics } from '@/shared/contracts';

import {
  buildSystemLogsHref,
  useObservabilitySummaryContext,
} from '../../AdminKangurObservabilityPage';
import { useKnowledgeGraphObservability } from './KnowledgeGraphObservabilityContext';
import { formatDateTime, formatNumber, formatPercent } from './utils';
import { MetricCard } from './MetricCards';
import { AiTutorBridgeMetrics } from './AiTutorBridgeMetrics';
import { KnowledgeGraphStatusSection } from './KnowledgeGraphStatusSection';
import { KnowledgeGraphQueryPreviewSection } from './KnowledgeGraphQueryPreviewSection';
import { AlertsGrid, RouteMetricCard } from './MetricCards';
import { RecentAnalyticsEvents, RecentServerLogs } from './LogSections';

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

export function SummaryContent(): JSX.Element {
  const { range, summary } = useObservabilitySummaryContext();
  const alertById = new Map(summary.alerts.map((alert) => [alert.id, alert]));
  const { clearKnowledgeGraphPreviewContext } = useKnowledgeGraphObservability();

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
  const emptyLobbyCounts = {
    viewed: 0,
    refreshClicked: 0,
    filterChanged: 0,
    sortChanged: 0,
    joinClicked: 0,
    createClicked: 0,
    loginClicked: 0,
  };
  const lobbyAnalytics = summary.analytics.duelsLobby;
  const lobbyTotals = lobbyAnalytics?.totals ?? emptyLobbyCounts;
  const lobbyGuest = lobbyAnalytics?.byUser.guest ?? emptyLobbyCounts;
  const lobbyAuthenticated = lobbyAnalytics?.byUser.authenticated ?? emptyLobbyCounts;
  const lobbyFilters = lobbyAnalytics?.byFilterMode ?? {
    all: 0,
    challenge: 0,
    quick_match: 0,
  };
  const lobbySorts = lobbyAnalytics?.bySort ?? {
    recent: 0,
    time_fast: 0,
    time_slow: 0,
    questions_low: 0,
    questions_high: 0,
  };
  const lobbyLoginBySource = lobbyAnalytics?.loginBySource ?? {};
  const formatRateWithCount = (numerator: number, denominator: number): string => {
    const rate = denominator > 0 ? (numerator / denominator) * 100 : null;
    return `${formatPercent(rate)} (${formatNumber(numerator)}/${formatNumber(denominator)})`;
  };
  const lobbyMetrics = [
    {
      label: 'Lobby Views',
      value: formatNumber(lobbyTotals.viewed),
    },
    {
      label: 'Refresh Clicks',
      value: formatNumber(lobbyTotals.refreshClicked),
    },
    {
      label: 'Filter Changes',
      value: formatNumber(lobbyTotals.filterChanged),
    },
    {
      label: 'Sort Changes',
      value: formatNumber(lobbyTotals.sortChanged),
    },
    {
      label: 'Join Clicks',
      value: formatNumber(lobbyTotals.joinClicked),
    },
    {
      label: 'Create Clicks',
      value: formatNumber(lobbyTotals.createClicked),
    },
    {
      label: 'Login CTA Clicks',
      value: formatNumber(lobbyTotals.loginClicked),
    },
  ];
  const loginSourceLabels: Array<{ key: string; label: string }> = [
    { key: 'banner', label: 'Banner' },
    { key: 'join', label: 'Join Button' },
    { key: 'invite_join', label: 'Invite Join' },
    { key: 'empty_state_create', label: 'Empty-State Create' },
  ];
  const loginSourceKeys = new Set(loginSourceLabels.map((entry) => entry.key));
  const unknownLoginCount = Object.entries(lobbyLoginBySource).reduce((total, [key, count]) => {
    if (loginSourceKeys.has(key)) {
      return total;
    }
    return total + count;
  }, 0);
  const loginSourceMetrics = [
    ...loginSourceLabels.map((entry) => ({
      label: entry.label,
      value: formatNumber(lobbyLoginBySource[entry.key] ?? 0),
    })),
    ...(unknownLoginCount > 0
      ? [{ label: 'Other', value: formatNumber(unknownLoginCount) }]
      : []),
  ];

  return (
    <div className='space-y-8'>
      <FormSection title='Operational Snapshot' variant='subtle'>
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40'>
          <div className={`${KANGUR_STACK_RELAXED_CLASSNAME} lg:flex-row lg:items-start lg:justify-between`}>
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
              <MetadataItem
                label='Generated'
                value={formatDateTime(summary.generatedAt)}
                variant='card'
              />
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
        <div
          className={`${KANGUR_GRID_RELAXED_CLASSNAME} md:grid-cols-2 xl:grid-cols-5`}
        >
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

      <FormSection title='Lobby Analytics' variant='subtle'>
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40'>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            {lobbyMetrics.map((metric) => (
              <MetadataItem
                key={metric.label}
                label={metric.label}
                value={metric.value}
                variant='card'
              />
            ))}
          </div>
          <div className={`${KANGUR_GRID_RELAXED_CLASSNAME} mt-4 lg:grid-cols-2`}>
            <Card variant='subtle' padding='md' className='border-border/60 bg-card/30'>
              <div className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                Guest Activity
              </div>
              <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                <MetadataItem label='Views' value={formatNumber(lobbyGuest.viewed)} variant='minimal' />
                <MetadataItem
                  label='Refresh'
                  value={formatNumber(lobbyGuest.refreshClicked)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Filters'
                  value={formatNumber(lobbyGuest.filterChanged)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Sorts'
                  value={formatNumber(lobbyGuest.sortChanged)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Join Clicks'
                  value={formatNumber(lobbyGuest.joinClicked)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Create Clicks'
                  value={formatNumber(lobbyGuest.createClicked)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Login CTA'
                  value={formatNumber(lobbyGuest.loginClicked)}
                  variant='minimal'
                />
              </div>
            </Card>
            <Card variant='subtle' padding='md' className='border-border/60 bg-card/30'>
              <div className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                Logged-in Activity
              </div>
              <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                <MetadataItem
                  label='Views'
                  value={formatNumber(lobbyAuthenticated.viewed)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Refresh'
                  value={formatNumber(lobbyAuthenticated.refreshClicked)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Filters'
                  value={formatNumber(lobbyAuthenticated.filterChanged)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Sorts'
                  value={formatNumber(lobbyAuthenticated.sortChanged)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Join Clicks'
                  value={formatNumber(lobbyAuthenticated.joinClicked)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Create Clicks'
                  value={formatNumber(lobbyAuthenticated.createClicked)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Login CTA'
                  value={formatNumber(lobbyAuthenticated.loginClicked)}
                  variant='minimal'
                />
              </div>
            </Card>
          </div>
          <div className={`${KANGUR_GRID_RELAXED_CLASSNAME} mt-4 lg:grid-cols-4`}>
            <Card variant='subtle' padding='md' className='border-border/60 bg-card/30'>
              <div className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                Filter Distribution
              </div>
              <div className='mt-3 space-y-2'>
                <MetadataItem
                  label='All'
                  value={formatNumber(lobbyFilters.all)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Challenges'
                  value={formatNumber(lobbyFilters.challenge)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Quick Match'
                  value={formatNumber(lobbyFilters.quick_match)}
                  variant='minimal'
                />
              </div>
            </Card>
            <Card variant='subtle' padding='md' className='border-border/60 bg-card/30'>
              <div className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                Sort Distribution
              </div>
              <div className='mt-3 space-y-2'>
                <MetadataItem
                  label='Recent'
                  value={formatNumber(lobbySorts.recent)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Fast Time'
                  value={formatNumber(lobbySorts.time_fast)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Slow Time'
                  value={formatNumber(lobbySorts.time_slow)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Few Questions'
                  value={formatNumber(lobbySorts.questions_low)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Many Questions'
                  value={formatNumber(lobbySorts.questions_high)}
                  variant='minimal'
                />
              </div>
            </Card>
            <Card variant='subtle' padding='md' className='border-border/60 bg-card/30'>
              <div className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                Login CTA Sources
              </div>
              <div className='mt-3 space-y-2'>
                {loginSourceMetrics.map((metric) => (
                  <MetadataItem
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    variant='minimal'
                  />
                ))}
              </div>
            </Card>
            <Card variant='subtle' padding='md' className='border-border/60 bg-card/30'>
              <div className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                Conversion Rates
              </div>
              <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                <MetadataItem
                  label='Guest Login Rate'
                  value={formatRateWithCount(lobbyGuest.loginClicked, lobbyGuest.viewed)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Guest Join Rate'
                  value={formatRateWithCount(lobbyGuest.joinClicked, lobbyGuest.viewed)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Auth Join Rate'
                  value={formatRateWithCount(
                    lobbyAuthenticated.joinClicked,
                    lobbyAuthenticated.viewed
                  )}
                  variant='minimal'
                />
                <MetadataItem
                  label='Auth Create Rate'
                  value={formatRateWithCount(
                    lobbyAuthenticated.createClicked,
                    lobbyAuthenticated.viewed
                  )}
                  variant='minimal'
                />
                <MetadataItem
                  label='Overall Join Rate'
                  value={formatRateWithCount(lobbyTotals.joinClicked, lobbyTotals.viewed)}
                  variant='minimal'
                />
                <MetadataItem
                  label='Overall Create Rate'
                  value={formatRateWithCount(lobbyTotals.createClicked, lobbyTotals.viewed)}
                  variant='minimal'
                />
              </div>
            </Card>
          </div>
          <p className='mt-3 text-xs leading-relaxed text-gray-400'>
            Lobby analytics are tracked only on explicit user actions (no polling events).
          </p>
        </Card>
      </FormSection>

      <AiTutorBridgeMetrics />
      <KnowledgeGraphStatusSection />
      <KnowledgeGraphQueryPreviewSection />

      <FormSection title='Alerts' variant='subtle'>
        <div data-doc-id='admin_observability_alerts'>
          <AlertsGrid />
        </div>
      </FormSection>

      <div
        className={`${KANGUR_GRID_ROOMY_CLASSNAME} xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]`}
      >
        <FormSection title='Route Health' variant='subtle'>
          <div className={`${KANGUR_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
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

        {/* performance baseline card needs extraction too or we leave it for now */}
        {/* <PerformanceBaselineCard /> */}
      </div>

      <div className={`${KANGUR_GRID_ROOMY_CLASSNAME} xl:grid-cols-2`}>
        <RecentAnalyticsEvents />
        <RecentServerLogs />
      </div>

      <div
        className={`${KANGUR_GRID_ROOMY_CLASSNAME} xl:grid-cols-[minmax(0,1fr)_320px]`}
      >
        <FormSection title='Degraded Dependencies' variant='subtle'>
          {!summary.errors || Object.keys(summary.errors).length === 0 ? (
            <CompactEmptyState
              title='No degraded dependencies'
              description='All summary contributors responded without a partial-failure marker.'
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
            <Button
              variant='outline'
              className='w-full justify-between'
              onClick={clearKnowledgeGraphPreviewContext}
            >
              Clear Graph Preview Context
            </Button>
            <Button asChild variant='outline' className='w-full justify-between gap-2'>
              <Link href={allKangurLogsHref}>
                All Kangur Logs
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between gap-2'>
              <Link href={ttsGenerationFailureLogsHref}>
                TTS Generation Failure Logs
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between gap-2'>
              <Link href={ttsFallbackLogsHref}>
                TTS Fallback Logs
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between gap-2'>
              <Link href='/admin/analytics'>
                Global Analytics
                <ArrowUpRightIcon className='size-3.5' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between gap-2'>
              <a
                href='/api/kangur/knowledge-graph/status'
                target='_blank'
                rel='noopener noreferrer'
              >
                Knowledge Graph Status JSON
                <ArrowUpRightIcon className='size-3.5' />
              </a>
            </Button>
            <Button asChild variant='outline' className='w-full justify-between gap-2'>
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

      {/* Keeping icons here for now to avoid multiple small files */}
      <div className='hidden'>
        <BotIcon />
        <Repeat2Icon />
        <GaugeIcon />
      </div>
    </div>
  );
}
