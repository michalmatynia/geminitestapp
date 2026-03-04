'use client';

import React from 'react';

import { useSystemLogsContext } from '@/features/observability/context/SystemLogsContext';
import { Card, FormSection, Hint, LoadingState, MetadataItem, StatusBadge } from '@/shared/ui';
import { formatTimestamp } from '../utils/formatTimestamp';

export function LogMetrics(): React.JSX.Element {
  const { metricsQuery, metrics, levels } = useSystemLogsContext();
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
        <div className='grid gap-4 md:grid-cols-3 mt-4'>
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
