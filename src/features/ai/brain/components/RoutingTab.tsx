'use client';

import { SectionPanel } from '@/shared/ui';

import { useBrain } from '../context/BrainContext';
import { type AiBrainFeature, type AiBrainAssignment } from '../settings';
import { AssignmentEditor } from './AssignmentEditor';

type FeatureConfig = {
  key: AiBrainFeature;
  label: string;
  description: string;
};

const ROUTING_FEATURES: FeatureConfig[] = [
  {
    key: 'cms_builder',
    label: 'CMS Builder',
    description: 'Theme/style generation and design assistants inside the CMS Builder.',
  },
  {
    key: 'prompt_engine',
    label: 'Prompt Engine',
    description: 'Validation learning and prompt tooling shared across the app.',
  },
  {
    key: 'ai_paths',
    label: 'AI Paths',
    description: 'Default model routing for AI Path model nodes and graph actions.',
  },
];

export function RoutingTab(): React.JSX.Element {
  const {
    settings,
    overridesEnabled,
    effectiveAssignments,
    handleDefaultChange,
    handleOverrideChange,
    toggleOverride,
  } = useBrain();

  return (
    <div className='space-y-4'>
      <SectionPanel variant='subtle'>
        <div className='text-xs text-gray-300'>
          Configure global defaults first, then enable per-feature overrides where needed.
        </div>
      </SectionPanel>

      <SectionPanel>
        <div className='text-xs uppercase text-gray-500'>Global defaults</div>
        <div className='mt-2'>
          <AssignmentEditor
            assignment={settings.defaults}
            onChange={handleDefaultChange}
          />
        </div>
      </SectionPanel>

      <div className='grid gap-4 md:grid-cols-2'>
        {ROUTING_FEATURES.map((feature: FeatureConfig) => {
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
