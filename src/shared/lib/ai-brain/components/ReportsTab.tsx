'use client';

import {
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from '@/shared/contracts/ai-insights';
import {
  Checkbox,
  Input,
  Textarea,
  FormSection,
  FormField,
  SimpleSettingsList,
  ToggleRow,
  CollapsibleSection,
  Label,
} from '@/shared/ui';

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
          <div className='space-y-3'>
            <ToggleRow
              variant='switch'
              label='Analytics insights schedule'
              description='How often analytics reports run.'
              checked={analyticsScheduleEnabled}
              onCheckedChange={setAnalyticsScheduleEnabled}
              className='border-none p-0 bg-transparent hover:bg-transparent'
            />
            <FormField label='Minutes'>
              <Input
                type='number'
                min={5}
                value={analyticsScheduleMinutes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAnalyticsScheduleMinutes(Number(e.target.value))
                }
               aria-label="Minutes" title="Minutes"/>
            </FormField>
          </div>

          <div className='space-y-3'>
            <ToggleRow
              variant='switch'
              label='Runtime analytics schedule'
              description='How often runtime AI reports run.'
              checked={runtimeAnalyticsScheduleEnabled}
              onCheckedChange={setRuntimeAnalyticsScheduleEnabled}
              className='border-none p-0 bg-transparent hover:bg-transparent'
            />
            <FormField label='Minutes'>
              <Input
                type='number'
                min={5}
                value={runtimeAnalyticsScheduleMinutes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRuntimeAnalyticsScheduleMinutes(Number(e.target.value))
                }
               aria-label="Minutes" title="Minutes"/>
            </FormField>
          </div>

          <div className='space-y-3'>
            <ToggleRow
              variant='switch'
              label='System log insights schedule'
              description='How often log reports run.'
              checked={logsScheduleEnabled}
              onCheckedChange={setLogsScheduleEnabled}
              className='border-none p-0 bg-transparent hover:bg-transparent'
            />
            <FormField label='Minutes'>
              <Input
                type='number'
                min={5}
                value={logsScheduleMinutes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLogsScheduleMinutes(Number(e.target.value))
                }
               aria-label="Minutes" title="Minutes"/>
            </FormField>
            <ToggleRow
              variant='switch'
              label='Auto-run on new errors'
              checked={logsAutoOnError}
              onCheckedChange={setLogsAutoOnError}
              className='border-none p-0 bg-transparent hover:bg-transparent'
            />
          </div>
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
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setAnalyticsPromptSystem(e.target.value)
              }
             aria-label="Analytics prompt" title="Analytics prompt"/>
          </FormField>
          <FormField label='Runtime analytics prompt'>
            <Textarea
              className='min-h-[160px] text-xs'
              value={runtimeAnalyticsPromptSystem}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setRuntimeAnalyticsPromptSystem(e.target.value)
              }
             aria-label="Runtime analytics prompt" title="Runtime analytics prompt"/>
          </FormField>
          <FormField label='Logs prompt'>
            <Textarea
              className='min-h-[160px] text-xs'
              value={logsPromptSystem}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setLogsPromptSystem(e.target.value)
              }
             aria-label="Logs prompt" title="Logs prompt"/>
          </FormField>
        </div>
      </FormSection>

      <FormSection title='Default prompts' variant='subtle' className='p-4'>
        <CollapsibleSection
          title={<span className='text-xs text-gray-400'>Show default prompt templates</span>}
          className='mt-2'
          variant='subtle'
        >
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
        </CollapsibleSection>
      </FormSection>

      <div className='space-y-4'>
        <div className='text-sm font-semibold text-white'>Feature Overrides</div>
        <SimpleSettingsList
          items={REPORT_FEATURES.map((feature: FeatureConfig) => {
            const overrideEnabled = overridesEnabled[feature.key];
            const assignment = overrideEnabled
              ? (settings.assignments[feature.key] ?? effectiveAssignments[feature.key])
              : effectiveAssignments[feature.key];

            return {
              id: feature.key,
              title: feature.label,
              description: feature.description,
              original: { feature, overrideEnabled, assignment },
            };
          })}
          columns={2}
          renderActions={(item) => {
            const checkboxId = `reports-feature-override-${item.id}`;
            return (
              <div className='flex items-center gap-2 text-[11px] text-gray-400'>
                <Checkbox
                  id={checkboxId}
                  checked={item.original.overrideEnabled}
                  onCheckedChange={(checked: boolean) =>
                    toggleOverride(item.original.feature.key, Boolean(checked))
                  }
                />
                <Label htmlFor={checkboxId} className='cursor-pointer text-[11px] text-gray-400'>
                  Override
                </Label>
              </div>
            );
          }}
          renderCustomContent={(item) => (
            <div className='space-y-2'>
              <AssignmentEditor
                assignment={item.original.assignment}
                onChange={(next: AiBrainAssignment) =>
                  handleOverrideChange(item.original.feature.key, next)
                }
                readOnly={!item.original.overrideEnabled}
                allowedProviders={['model']}
                showSystemPrompt={false}
              />
              {!item.original.overrideEnabled && (
                <div className='text-[11px] text-gray-500'>Using global defaults.</div>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}
