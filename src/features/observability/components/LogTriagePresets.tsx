'use client';

import { AlertTriangle, Monitor, Server, Shield } from 'lucide-react';
import React from 'react';

import {
  useSystemLogsActions,
  useSystemLogsState,
} from '@/features/observability/context/SystemLogsContext';
import {
  SYSTEM_LOG_FILTER_DEFAULTS,
  SYSTEM_LOG_TRIAGE_PRESETS,
  isSystemLogPresetActive,
  resolveSystemLogPresetFilters,
  type LogTriagePreset,
  type SystemLogFilterFormValues,
} from '@/shared/lib/observability/log-triage-presets';
import { Button, FormSection, StatusBadge } from '@/shared/ui';
import { cn } from '@/shared/utils';

const triagePresetIcons: Record<
  LogTriagePreset['id'],
  React.ComponentType<{ className?: string }>
> = {
  'recent-errors-24h': AlertTriangle,
  'http-500-last7d': Server,
  'client-errors-last7d': Monitor,
  'auth-anomalies-last3d': Shield,
  'system-alerts-last24h': AlertTriangle,
  'kangur-source-last7d': Monitor,
  'kangur-auth-last3d': Shield,
  'kangur-progress-last3d': Monitor,
  'kangur-tts-last3d': AlertTriangle,
};

export function LogTriagePresets(): React.JSX.Element {
  const {
    level,
    query,
    source,
    service,
    method,
    statusCode,
    requestId,
    traceId,
    correlationId,
    userId,
    fingerprint,
    category,
    fromDate,
    toDate,
  } = useSystemLogsState();
  const { handleFilterChange, handleResetFilters: onClearPreset } = useSystemLogsActions();

  const values: SystemLogFilterFormValues = {
    level,
    query,
    source,
    service,
    method,
    statusCode,
    requestId,
    traceId,
    correlationId,
    userId,
    fingerprint,
    category,
    fromDate,
    toDate,
  };

  const applyFilterValues = (nextValues: SystemLogFilterFormValues): void => {
    (Object.entries(nextValues) as Array<[keyof SystemLogFilterFormValues, string]>).forEach(
      ([key, value]) => {
        handleFilterChange(key as string, value);
      }
    );
  };

  const onApplyPreset = (preset: LogTriagePreset): void => {
    const resolvedPresetValues = resolveSystemLogPresetFilters(preset);
    const nextValues: SystemLogFilterFormValues = {
      ...SYSTEM_LOG_FILTER_DEFAULTS,
      ...resolvedPresetValues,
    };
    applyFilterValues(nextValues);
  };

  const now = new Date();
  const resolvedPresets = SYSTEM_LOG_TRIAGE_PRESETS.map((preset: LogTriagePreset) => ({
    preset,
    filters: resolveSystemLogPresetFilters(preset, now),
  }));

  const activePresetId =
    resolvedPresets.find(({ filters }: { filters: Partial<SystemLogFilterFormValues> }) =>
      isSystemLogPresetActive(values, filters)
    )?.preset.id ?? null;

  return (
    <FormSection
      title='Saved Triage Presets'
      description='One-click filters for common incident investigation paths.'
      variant='subtle-compact'
      actions={
        activePresetId ? (
          <Button variant='ghost' size='sm' onClick={onClearPreset} className='h-8 text-xs'>
            Clear preset
          </Button>
        ) : null
      }
      className='p-3'
    >
      <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-4'>
        {resolvedPresets.map(({ preset }: { preset: LogTriagePreset }) => {
          const isActive = preset.id === activePresetId;
          const Icon = triagePresetIcons[preset.id] ?? AlertTriangle;
          return (
            <Button
              key={preset.id}
              type='button'
              variant='outline'
              onClick={(): void => onApplyPreset(preset)}
              className={cn(
                'h-auto w-full justify-start px-3 py-2 text-left',
                isActive && 'border-emerald-400/60 bg-emerald-500/10 hover:bg-emerald-500/20'
              )}
            >
              <span className='flex items-start gap-2'>
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0 text-gray-400',
                    isActive && 'text-emerald-200'
                  )}
                />
                <span className='block'>
                  <span className='block text-xs font-semibold text-gray-100'>{preset.label}</span>
                  <span className='block text-[11px] text-gray-400'>{preset.description}</span>
                  {isActive ? (
                    <div className='mt-1'>
                      <StatusBadge
                        status='Active'
                        variant='success'
                        size='sm'
                        className='font-bold h-4'
                      />
                    </div>
                  ) : null}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </FormSection>
  );
}
