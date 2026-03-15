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
import { type JSX } from 'react';

import { Button, Card, CompactEmptyState, FormSection, MetadataItem, StatusBadge } from '@/shared/ui';
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

  return (
    <div className='space-y-8'>
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
      <KnowledgeGraphStatusSection />
      <KnowledgeGraphQueryPreviewSection />

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

        {/* performance baseline card needs extraction too or we leave it for now */}
        {/* <PerformanceBaselineCard /> */}
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        <RecentAnalyticsEvents />
        <RecentServerLogs />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]'>
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
