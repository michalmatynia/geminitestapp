'use client';

import {
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
} from '@/shared/contracts/ai-insights';
import { Input, Textarea, CollapsibleSection } from '@/shared/ui/primitives.public';
import { FormSection, FormField, ToggleRow, StatusToggle } from '@/shared/ui/forms-and-actions.public';
import { SimpleSettingsList } from '@/shared/ui/templates.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

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
  const brain = useBrain();

  return (
    <div className='space-y-4'>
      <ReportSchedulesSection brain={brain} />
      <ReportPromptsSection brain={brain} />
      <DefaultPromptsSection />
      <FeatureOverridesSection brain={brain} />
    </div>
  );
}

function ReportSchedulesSection({ brain }: { brain: ReturnType<typeof useBrain> }): React.JSX.Element {
  return (
    <FormSection title='Schedules' className='p-4'>
      <div className={`${UI_GRID_RELAXED_CLASSNAME} mt-3 md:grid-cols-3`}>
        <div className='space-y-3'>
          <ToggleRow
            variant='switch'
            label='Analytics insights schedule'
            description='How often analytics reports run.'
            checked={brain.analyticsScheduleEnabled}
            onCheckedChange={brain.setAnalyticsScheduleEnabled}
            className='border-none p-0 bg-transparent hover:bg-transparent'
          />
          <FormField label='Minutes'>
            <Input
              type='number'
              min={5}
              value={brain.analyticsScheduleMinutes}
              onChange={(e) => brain.setAnalyticsScheduleMinutes(Number(e.target.value))}
              aria-label='Minutes'
              title='Minutes'
            />
          </FormField>
        </div>

        <div className='space-y-3'>
          <ToggleRow
            variant='switch'
            label='Runtime analytics schedule'
            description='How often runtime AI reports run.'
            checked={brain.runtimeAnalyticsScheduleEnabled}
            onCheckedChange={brain.setRuntimeAnalyticsScheduleEnabled}
            className='border-none p-0 bg-transparent hover:bg-transparent'
          />
          <FormField label='Minutes'>
            <Input
              type='number'
              min={5}
              value={brain.runtimeAnalyticsScheduleMinutes}
              onChange={(e) => brain.setRuntimeAnalyticsScheduleMinutes(Number(e.target.value))}
              aria-label='Minutes'
              title='Minutes'
            />
          </FormField>
        </div>

        <div className='space-y-3'>
          <ToggleRow
            variant='switch'
            label='System log insights schedule'
            description='How often log reports run.'
            checked={brain.logsScheduleEnabled}
            onCheckedChange={brain.setLogsScheduleEnabled}
            className='border-none p-0 bg-transparent hover:bg-transparent'
          />
          <FormField label='Minutes'>
            <Input
              type='number'
              min={5}
              value={brain.logsScheduleMinutes}
              onChange={(e) => brain.setLogsScheduleMinutes(Number(e.target.value))}
              aria-label='Minutes'
              title='Minutes'
            />
          </FormField>
          <ToggleRow
            variant='switch'
            label='Auto-run on new errors'
            checked={brain.logsAutoOnError}
            onCheckedChange={brain.setLogsAutoOnError}
            className='border-none p-0 bg-transparent hover:bg-transparent'
          />
        </div>
      </div>
    </FormSection>
  );
}

function ReportPromptsSection({ brain }: { brain: ReturnType<typeof useBrain> }): React.JSX.Element {
  return (
    <FormSection
      title='Prompt steering'
      description='Edit the system prompt used by report generation models. JSON output requirements are enforced automatically.'
      className='p-4'
    >
      <div className={`${UI_GRID_RELAXED_CLASSNAME} mt-3 md:grid-cols-3`}>
        <FormField label='Analytics prompt'>
          <Textarea
            className='min-h-[160px] text-xs'
            value={brain.analyticsPromptSystem}
            onChange={(e) => brain.setAnalyticsPromptSystem(e.target.value)}
            aria-label='Analytics prompt'
            title='Analytics prompt'
          />
        </FormField>
        <FormField label='Runtime analytics prompt'>
          <Textarea
            className='min-h-[160px] text-xs'
            value={brain.runtimeAnalyticsPromptSystem}
            onChange={(e) => brain.setRuntimeAnalyticsPromptSystem(e.target.value)}
            aria-label='Runtime analytics prompt'
            title='Runtime analytics prompt'
          />
        </FormField>
        <FormField label='Logs prompt'>
          <Textarea
            className='min-h-[160px] text-xs'
            value={brain.logsPromptSystem}
            onChange={(e) => brain.setLogsPromptSystem(e.target.value)}
            aria-label='Logs prompt'
            title='Logs prompt'
          />
        </FormField>
      </div>
    </FormSection>
  );
}

function DefaultPromptsSection(): React.JSX.Element {
  return (
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
  );
}

function FeatureOverridesSection({ brain }: { brain: ReturnType<typeof useBrain> }): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='text-sm font-semibold text-white'>Feature Overrides</div>
      <SimpleSettingsList
        items={REPORT_FEATURES.map((feature: FeatureConfig) => {
          const overrideEnabled = brain.overridesEnabled[feature.key];
          const assignment = overrideEnabled
            ? (brain.settings.assignments[feature.key] ?? brain.effectiveAssignments[feature.key])
            : brain.effectiveAssignments[feature.key];

          return {
            id: feature.key,
            title: feature.label,
            description: feature.description,
            original: { feature, overrideEnabled, assignment, featureEnabled: assignment.enabled },
          };
        })}
        columns={2}
        renderActions={(item) => (
          <div className='flex flex-wrap items-center gap-3 text-[11px] text-gray-400'>
            <div className='inline-flex items-center gap-2'>
              <span>Feature</span>
              <StatusToggle
                enabled={item.original.featureEnabled}
                disabled={brain.saving}
                size='sm'
                enabledLabel='ON'
                disabledLabel='OFF'
                onToggle={(nextEnabled: boolean): void =>
                  brain.setFeatureEnabled(item.original.feature.key, nextEnabled)
                }
              />
            </div>
            <div className='inline-flex items-center gap-2'>
              <span>Fallback override</span>
              <StatusToggle
                enabled={item.original.overrideEnabled}
                disabled={brain.saving}
                size='sm'
                enabledLabel='CUSTOM'
                disabledLabel='DEFAULT'
                enabledVariant='blue'
                disabledVariant='gray'
                onToggle={(nextEnabled: boolean): void =>
                  brain.toggleOverride(item.original.feature.key, nextEnabled)
                }
              />
            </div>
          </div>
        )}
        renderCustomContent={(item) => (
          <div className='space-y-2'>
            <AssignmentEditor
              assignment={item.original.assignment}
              onChange={(next: AiBrainAssignment) =>
                brain.handleOverrideChange(item.original.feature.key, next)
              }
              readOnly={!item.original.overrideEnabled}
              allowedProviders={['model']}
              showSystemPrompt={false}
            />
            {!item.original.featureEnabled && (
              <div className='text-[11px] text-amber-300'>
                Feature is off. Report prompts and assignments are preserved, but this report
                feature will stay inactive until you turn it back on.
              </div>
            )}
            {!item.original.overrideEnabled && (
              <div className='text-[11px] text-gray-500'>Using global defaults.</div>
            )}
          </div>
        )}
      />
    </div>
  );
}
