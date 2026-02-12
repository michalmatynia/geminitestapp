'use client';

import {
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from '@/features/ai/insights/settings';
import { Checkbox, Input, Switch, Textarea, FormSection, FormField } from '@/shared/ui';

import { useBrain } from '../context/BrainContext';
import { type AiBrainFeature, type AiBrainAssignment } from '../settings';
import { AssignmentEditor } from './AssignmentEditor';

type FeatureConfig = {
  key: AiBrainFeature;
  label: string;
  description: string;
};

const REPORT_FEATURES: FeatureConfig[] = [
  {
    key: 'analytics',
    label: 'Analytics Reports',
    description: 'AI analytics summaries and warnings across the dashboard.',
  },
  {
    key: 'runtime_analytics',
    label: 'Runtime Analytics Reports',
    description: 'AI summaries for queue health, runtime performance, and node reliability.',
  },
  {
    key: 'system_logs',
    label: 'System Logs Reports',
    description: 'AI summaries and insights in the System Logs dashboard.',
  },
  {
    key: 'error_logs',
    label: 'Error Log Interpretation',
    description: 'AI interpretation and diagnostics for individual error entries.',
  },
];

export function ReportsTab(): React.JSX.Element {
  const {
    settings,
    overridesEnabled,
    effectiveAssignments,
    handleOverrideChange,
    toggleOverride,
    analyticsScheduleEnabled,
    setAnalyticsScheduleEnabled,
    analyticsScheduleMinutes,
    setAnalyticsScheduleMinutes,
    runtimeAnalyticsScheduleEnabled,
    setRuntimeAnalyticsScheduleEnabled,
    runtimeAnalyticsScheduleMinutes,
    setRuntimeAnalyticsScheduleMinutes,
    logsScheduleEnabled,
    setLogsScheduleEnabled,
    logsScheduleMinutes,
    setLogsScheduleMinutes,
    logsAutoOnError,
    setLogsAutoOnError,
    analyticsPromptSystem,
    setAnalyticsPromptSystem,
    runtimeAnalyticsPromptSystem,
    setRuntimeAnalyticsPromptSystem,
    logsPromptSystem,
    setLogsPromptSystem,
  } = useBrain();

  return (
    <div className='space-y-4'>
      <FormSection title='Schedules' className='p-4'>
        <div className='mt-3 grid gap-4 md:grid-cols-3'>
          <FormSection variant='subtle-compact' className='p-3 space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-xs text-gray-200'>Analytics insights schedule</div>
                <div className='text-[11px] text-gray-500'>How often analytics reports run.</div>
              </div>
              <Switch checked={analyticsScheduleEnabled} onCheckedChange={setAnalyticsScheduleEnabled} />
            </div>
            <FormField label='Minutes'>
              <Input
                type='number'
                min={5}
                value={analyticsScheduleMinutes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnalyticsScheduleMinutes(Number(e.target.value))}
              />
            </FormField>
          </FormSection>

          <FormSection variant='subtle-compact' className='p-3 space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-xs text-gray-200'>Runtime analytics schedule</div>
                <div className='text-[11px] text-gray-500'>How often runtime AI reports run.</div>
              </div>
              <Switch checked={runtimeAnalyticsScheduleEnabled} onCheckedChange={setRuntimeAnalyticsScheduleEnabled} />
            </div>
            <FormField label='Minutes'>
              <Input
                type='number'
                min={5}
                value={runtimeAnalyticsScheduleMinutes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRuntimeAnalyticsScheduleMinutes(Number(e.target.value))}
              />
            </FormField>
          </FormSection>

          <FormSection variant='subtle-compact' className='p-3 space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-xs text-gray-200'>System log insights schedule</div>
                <div className='text-[11px] text-gray-500'>How often log reports run.</div>
              </div>
              <Switch checked={logsScheduleEnabled} onCheckedChange={setLogsScheduleEnabled} />
            </div>
            <FormField label='Minutes'>
              <Input
                type='number'
                min={5}
                value={logsScheduleMinutes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLogsScheduleMinutes(Number(e.target.value))}
              />
            </FormField>
            <label className='flex items-center justify-between gap-2 text-xs text-gray-300'>
              Auto-run on new errors
              <Switch checked={logsAutoOnError} onCheckedChange={setLogsAutoOnError} />
            </label>
          </FormSection>
        </div>
      </FormSection>

      <FormSection
        title='Prompt steering'
        description='Edit the system prompt used by report generation models. JSON output requirements are enforced automatically.'
        className='p-4'
      >
        <div className='mt-3 grid gap-4 md:grid-cols-3'>
          <FormField label='Analytics prompt'>
            <Textarea
              className='min-h-[160px] text-xs'
              value={analyticsPromptSystem}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnalyticsPromptSystem(e.target.value)}
            />
          </FormField>
          <FormField label='Runtime analytics prompt'>
            <Textarea
              className='min-h-[160px] text-xs'
              value={runtimeAnalyticsPromptSystem}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRuntimeAnalyticsPromptSystem(e.target.value)}
            />
          </FormField>
          <FormField label='Logs prompt'>
            <Textarea
              className='min-h-[160px] text-xs'
              value={logsPromptSystem}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLogsPromptSystem(e.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title='Default prompts' variant='subtle' className='p-4'>
        <details className='mt-2'>
          <summary className='cursor-pointer text-xs text-gray-400'>Show defaults</summary>
          <div className='mt-3 grid gap-3 md:grid-cols-3'>
            <pre className='whitespace-pre-wrap rounded-md border border-border/60 bg-gray-950/50 p-3 text-[11px] text-gray-300'>
              {DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT}
            </pre>
            <pre className='whitespace-pre-wrap rounded-md border border-border/60 bg-gray-950/50 p-3 text-[11px] text-gray-300'>
              {DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT}
            </pre>
            <pre className='whitespace-pre-wrap rounded-md border border-border/60 bg-gray-950/50 p-3 text-[11px] text-gray-300'>
              {DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT}
            </pre>
          </div>
        </details>
      </FormSection>

      <div className='grid gap-4 md:grid-cols-2'>
        {REPORT_FEATURES.map((feature: FeatureConfig) => {
          const overrideEnabled = overridesEnabled[feature.key];
          const assignment = overrideEnabled
            ? settings.assignments[feature.key] ?? effectiveAssignments[feature.key]
            : effectiveAssignments[feature.key];

          return (
            <FormSection
              key={feature.key}
              title={feature.label}
              description={feature.description}
              className='p-4'
              actions={
                <label className='flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer'>
                  <Checkbox
                    checked={overrideEnabled}
                    onCheckedChange={(checked: boolean) => toggleOverride(feature.key, Boolean(checked))}
                  />
                  Override
                </label>
              }
            >
              <div className='mt-3'>
                <AssignmentEditor
                  assignment={assignment}
                  onChange={(next: AiBrainAssignment) => handleOverrideChange(feature.key, next)}
                  readOnly={!overrideEnabled}
                />
              </div>

              {!overrideEnabled ? (
                <div className='mt-2 text-[11px] text-gray-500'>Using global defaults.</div>
              ) : null}
            </FormSection>
          );
        })}
      </div>
    </div>
  );
}
