'use client';

import { Checkbox, SimpleSettingsList, Card } from '@/shared/ui';

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
  {
    key: 'chatbot',
    label: 'Chatbot',
    description: 'Authoritative AI routing for Chatbot message execution.',
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
      <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/30'>
        <div className='text-xs text-gray-300'>
          Configure global defaults first, then enable per-feature overrides where needed.
        </div>
      </Card>

      <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
        <div className='text-xs uppercase text-gray-500 font-semibold mb-2'>Global defaults</div>
        <AssignmentEditor
          assignment={settings.defaults}
          onChange={handleDefaultChange}
        />
      </Card>

      <SimpleSettingsList
        items={ROUTING_FEATURES.map((feature: FeatureConfig) => {
          const overrideEnabled = overridesEnabled[feature.key];
          const assignment = overrideEnabled
            ? settings.assignments[feature.key] ?? effectiveAssignments[feature.key]
            : effectiveAssignments[feature.key];
          
          return {
            id: feature.key,
            title: feature.label,
            description: feature.description,
            original: { feature, overrideEnabled, assignment }
          };
        })}
        columns={2}
        renderActions={(item) => (
          <label className='flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer'>
            <Checkbox
              checked={item.original.overrideEnabled}
              onCheckedChange={(checked: boolean | 'indeterminate') => toggleOverride(item.original.feature.key, Boolean(checked))}
            />
            Override
          </label>
        )}
        renderCustomContent={(item) => (
          <div className='space-y-2'>
            <AssignmentEditor
              assignment={item.original.assignment}
              onChange={(next: AiBrainAssignment) => handleOverrideChange(item.original.feature.key, next)}
              readOnly={!item.original.overrideEnabled}
            />
            {!item.original.overrideEnabled && (
              <div className='text-[11px] text-gray-500'>Using global defaults.</div>
            )}
          </div>
        )}
      />
    </div>
  );
}
