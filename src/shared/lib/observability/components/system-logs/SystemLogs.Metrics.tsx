'use client';

import React from 'react';
import { useSystemLogsState } from '@/features/observability/context/SystemLogsContext';
import { Alert, Button, Card } from '@/shared/ui/primitives.public';
import { FormSection, Hint } from '@/shared/ui/forms-and-actions.public';
import { LoadingState, MetadataItem, UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';
import { formatTimestamp } from '@/features/observability/utils/formatTimestamp';

export function LogMetrics(): React.JSX.Element {
  const { metricsQuery, metrics, levels } = useSystemLogsState();
  const topSources = metrics?.topSources ?? [];
  const topServices = metrics?.topServices ?? [];
  const topPaths = metrics?.topPaths ?? [];

  return (
    <FormSection
      title='Log Volume Metrics'
      description='Aggregated events based on current active filters.'
      actions={
        <div className='text-[10px] uppercase font-bold text-gray-600'>
          {metrics?.generatedAt ? `Generated ${formatTimestamp(metrics.generatedAt)}` : ''}
        </div>
      }
      className='p-6'
    >
      {metricsQuery.isLoading ? (
        <LoadingState message='Calculating metrics...' className='py-8' size='sm' />
      ) : metrics ? (
        <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-3 mt-4`}>
          <Card variant='glass' padding='md'>
            <Hint uppercase className='mb-2 font-semibold' variant='muted'>
              Retention Period
            </Hint>
            <div className='space-y-1'>
              <MetadataItem
                label='Total Logs'
                value={metrics.total}
                mono
                valueClassName='text-white'
                variant='subtle'
              />
              <MetadataItem
                label='Last 24h'
                value={metrics.last24Hours}
                mono
                valueClassName='text-white'
                variant='subtle'
              />
              <MetadataItem
                label='Last 7d'
                value={metrics.last7Days}
                mono
                valueClassName='text-white'
                variant='subtle'
              />
            </div>
          </Card>
          <Card variant='glass' padding='md'>
            <Hint uppercase className='mb-2 font-semibold' variant='muted'>
              Level Distribution
            </Hint>
            <div className='space-y-1'>
              <MetadataItem
                label='Errors'
                value={levels.error}
                mono
                labelClassName='text-rose-400'
                valueClassName='text-rose-300'
                variant='subtle'
              />
              <MetadataItem
                label='Warnings'
                value={levels.warn}
                mono
                labelClassName='text-amber-400'
                valueClassName='text-amber-300'
                variant='subtle'
              />
              <MetadataItem
                label='Info'
                value={levels.info}
                mono
                labelClassName='text-sky-400'
                valueClassName='text-sky-300'
                variant='subtle'
              />
            </div>
          </Card>
          <Card variant='glass' padding='md'>
            <Hint uppercase className='mb-2 font-semibold' variant='muted'>
              Traffic Origins
            </Hint>
            <div className='space-y-3'>
              <div>
                <Hint uppercase variant='muted' className='mb-1 text-[10px]'>
                  Top Sources
                </Hint>
                <div className='max-h-[80px] overflow-y-auto pr-2 space-y-1'>
                  {topSources.map((item: { source: string; count: number }) => (
                    <MetadataItem
                      key={item.source}
                      label={
                        <StatusBadge
                          status={item.source}
                          variant='neutral'
                          size='sm'
                          className='font-mono h-4'
                        />
                      }
                      value={item.count}
                      className='bg-white/5 px-2 py-1 rounded'
                      variant='subtle'
                    />
                  ))}
                  {topSources.length === 0 && (
                    <div className='text-[11px] text-gray-600'>No source data for this filter.</div>
                  )}
                </div>
              </div>
              <div>
                <Hint uppercase variant='muted' className='mb-1 text-[10px]'>
                  Top Services
                </Hint>
                <div className='max-h-[80px] overflow-y-auto pr-2 space-y-1'>
                  {topServices.map((item: { service: string; count: number }) => (
                    <MetadataItem
                      key={item.service}
                      label={
                        <StatusBadge
                          status={item.service}
                          variant='neutral'
                          size='sm'
                          className='font-mono h-4'
                        />
                      }
                      value={item.count}
                      className='bg-white/5 px-2 py-1 rounded'
                      variant='subtle'
                    />
                  ))}
                  {topServices.length === 0 && (
                    <div className='text-[11px] text-gray-600'>
                      No service data for this filter.
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Hint uppercase variant='muted' className='mb-1 text-[10px]'>
                  Top Paths
                </Hint>
                <div className='max-h-[80px] overflow-y-auto pr-2 space-y-1'>
                  {topPaths.map((item: { path: string; count: number }) => (
                    <MetadataItem
                      key={item.path}
                      label={
                        <StatusBadge
                          status={item.path}
                          variant='neutral'
                          size='sm'
                          className='font-mono h-4'
                        />
                      }
                      value={item.count}
                      className='bg-white/5 px-2 py-1 rounded'
                      variant='subtle'
                    />
                  ))}
                  {topPaths.length === 0 && (
                    <div className='text-[11px] text-gray-600'>No path data for this filter.</div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className='py-8 text-center text-xs text-gray-600'>
          No metrics available for this filter set.
        </div>
      )}
    </FormSection>
  );
}

export function AiLogInterpreter(): React.JSX.Element {
  const { runInsightMutation, insightsQuery } = useSystemLogsState();

  return (
    <FormSection
      title='AI Insights Engine'
      description='Deep-scan error patterns and identify root causes automatically.'
      actions={
        <Button
          variant='outline'
          size='xs'
          className='h-8'
          onClick={() => runInsightMutation.mutate()}
          disabled={runInsightMutation.isPending}
        >
          {runInsightMutation.isPending ? 'Running interpretation...' : 'Generate New Insight'}
        </Button>
      }
      className='p-6'
    >
      <div className='mt-4 space-y-3'>
        {insightsQuery.isLoading ? (
          <LoadingState message='Consulting AI models...' className='py-4' size='sm' />
        ) : insightsQuery.data?.insights?.length ? (
          insightsQuery.data.insights.map((insight: AiInsightRecord) => (
            <Card key={insight.id} variant='glass' padding='md' className='bg-gray-950/40'>
              <div className='flex items-center justify-between mb-3'>
                <span className='text-[10px] font-mono text-gray-500 uppercase'>
                  {formatTimestamp(insight.createdAt ?? '')}
                </span>
                <StatusBadge status={insight.status} />
              </div>
              <p className='text-sm text-gray-200 leading-relaxed'>{insight.summary}</p>
              {(insight.warnings?.length ?? 0) > 0 && (
                <Alert variant='warning' className='mt-3 p-2 text-[11px] space-y-1'>
                  <span className='font-bold uppercase text-[9px] block mb-1'>
                    Advisory Warnings
                  </span>
                  {insight.warnings?.map((w, i) => (
                    <p key={i}>• {w}</p>
                  ))}
                </Alert>
              )}
            </Card>
          ))
        ) : (
          <div className='py-8 text-center text-xs text-gray-600 uppercase tracking-widest bg-black/20 rounded border border-white/5'>
            No intelligence reports available
          </div>
        )}
      </div>
    </FormSection>
  );
}
