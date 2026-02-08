'use client';

import {
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from '@/features/ai/insights/settings';
import { Input, Label, SectionPanel, Switch, Textarea } from '@/shared/ui';

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
      <SectionPanel>
        <div className='text-sm font-semibold text-white'>Schedules</div>
        <div className='mt-3 grid gap-4 md:grid-cols-3'>
          <SectionPanel variant='subtle-compact' className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-xs text-gray-200'>Analytics insights schedule</div>
                <div className='text-[11px] text-gray-500'>How often analytics reports run.</div>
              </div>
              <Switch checked={analyticsScheduleEnabled} onCheckedChange={setAnalyticsScheduleEnabled} />
            </div>
            <Input
              type='number'
              min={5}
              value={analyticsScheduleMinutes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnalyticsScheduleMinutes(Number(e.target.value))}
            />
          </SectionPanel>

          <SectionPanel variant='subtle-compact' className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-xs text-gray-200'>Runtime analytics schedule</div>
                <div className='text-[11px] text-gray-500'>How often runtime AI reports run.</div>
              </div>
              <Switch checked={runtimeAnalyticsScheduleEnabled} onCheckedChange={setRuntimeAnalyticsScheduleEnabled} />
            </div>
            <Input
              type='number'
              min={5}
              value={runtimeAnalyticsScheduleMinutes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRuntimeAnalyticsScheduleMinutes(Number(e.target.value))}
            />
          </SectionPanel>

          <SectionPanel variant='subtle-compact' className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-xs text-gray-200'>System log insights schedule</div>
                <div className='text-[11px] text-gray-500'>How often log reports run.</div>
              </div>
              <Switch checked={logsScheduleEnabled} onCheckedChange={setLogsScheduleEnabled} />
            </div>
            <Input
              type='number'
              min={5}
              value={logsScheduleMinutes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLogsScheduleMinutes(Number(e.target.value))}
            />
            <label className='flex items-center justify-between gap-2 text-xs text-gray-300'>
              Auto-run on new errors
              <Switch checked={logsAutoOnError} onCheckedChange={setLogsAutoOnError} />
            </label>
          </SectionPanel>
        </div>
      </SectionPanel>

      <SectionPanel>
        <div className='text-sm font-semibold text-white'>Prompt steering</div>
        <div className='mt-1 text-xs text-gray-400'>
          Edit the system prompt used by report generation models. JSON output requirements are enforced automatically.
        </div>
        <div className='mt-3 grid gap-4 md:grid-cols-3'>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-300'>Analytics prompt</Label>
            <Textarea
              className='min-h-[160px] text-xs'
              value={analyticsPromptSystem}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnalyticsPromptSystem(e.target.value)}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-300'>Runtime analytics prompt</Label>
            <Textarea
              className='min-h-[160px] text-xs'
              value={runtimeAnalyticsPromptSystem}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRuntimeAnalyticsPromptSystem(e.target.value)}
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-300'>Logs prompt</Label>
            <Textarea
              className='min-h-[160px] text-xs'
              value={logsPromptSystem}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLogsPromptSystem(e.target.value)}
            />
          </div>
        </div>
      </SectionPanel>

      <SectionPanel variant='subtle'>
        <div className='text-sm font-semibold text-white'>Default prompts</div>
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
      </SectionPanel>

      <div className='grid gap-4 md:grid-cols-2'>
        {REPORT_FEATURES.map((feature: FeatureConfig) => {
          const overrideEnabled = overridesEnabled[feature.key];
          const assignment = overrideEnabled
            ? settings.assignments[feature.key] ?? effectiveAssignments[feature.key]
            : effectiveAssignments[feature.key];

          return (
            <SectionPanel key={feature.key}>
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <div className='text-sm font-semibold text-gray-100'>{feature.label}</div>
                  <div className='text-xs text-gray-400'>{feature.description}</div>
                </div>
                <label className='flex items-center gap-2 text-[11px] text-gray-400'>
                  <input
                    type='checkbox'
                    className='h-3 w-3 rounded border-gray-600'
                    checked={overrideEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleOverride(feature.key, e.target.checked)}
                  />
                  Override
                </label>
              </div>

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
            </SectionPanel>
          );
        })}
      </div>
    </div>
  );
}
