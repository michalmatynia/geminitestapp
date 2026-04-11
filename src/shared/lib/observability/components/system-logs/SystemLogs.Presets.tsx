'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useSystemLogsState, useSystemLogsActions } from '@/shared/lib/observability/context/SystemLogsContext';
import {
  SYSTEM_LOG_FILTER_DEFAULTS,
  SYSTEM_LOG_TRIAGE_PRESETS,
  isSystemLogPresetActive,
  resolveSystemLogPresetFilters,
  type LogTriagePresetDefinition,
  type SystemLogFilterFormValues,
} from '@/shared/lib/observability/log-triage-presets';
import { Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { cn } from '@/shared/utils/ui-utils';
import { TRIAGE_PRESET_ICONS } from './SystemLogs.constants';

export function LogTriagePresets(): React.JSX.Element {
  const {
    level,
    query,
    source,
    service,
    method,
    statusCode,
    minDurationMs,
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
    minDurationMs,
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

  const onApplyPreset = (preset: LogTriagePresetDefinition): void => {
    const resolvedPresetValues = resolveSystemLogPresetFilters(preset);
    const nextValues: SystemLogFilterFormValues = {
      ...SYSTEM_LOG_FILTER_DEFAULTS,
      ...resolvedPresetValues,
    };
    applyFilterValues(nextValues);
  };

  const now = new Date();
  const resolvedPresets = SYSTEM_LOG_TRIAGE_PRESETS.map((preset: LogTriagePresetDefinition) => ({
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
        {resolvedPresets.map(({ preset }: { preset: LogTriagePresetDefinition }) => {
          const isActive = preset.id === activePresetId;
          const Icon = TRIAGE_PRESET_ICONS[preset.id] ?? AlertTriangle;
          return (
            <Button
              key={preset.id}
              type='button'
              variant='outline'
              onClick={(): void => onApplyPreset(preset)}
              className={cn(
                'min-h-[5.75rem] h-auto w-full items-start justify-start whitespace-normal px-3 py-3 text-left',
                isActive && 'border-emerald-400/60 bg-emerald-500/10 hover:bg-emerald-500/20'
              )}
              aria-label={'Icon'}
              title={'Icon'}
            >
              <span className='flex min-w-0 items-start gap-2'>
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0 text-gray-400',
                    isActive && 'text-emerald-200'
                  )}
                />
                <span className='block min-w-0 flex-1 whitespace-normal'>
                  <span className='block whitespace-normal break-words text-xs font-semibold leading-snug text-gray-100'>
                    {preset.label}
                  </span>
                  <span className='mt-0.5 block whitespace-normal break-words text-[11px] leading-snug text-gray-400'>
                    {preset.description}
                  </span>
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
