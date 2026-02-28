'use client';

import { Checkbox, Card } from '@/shared/ui';

import { useBrain } from '../context/BrainContext';
import {
  BRAIN_CAPABILITY_KEYS,
  getBrainCapabilityDefinition,
  type AiBrainAssignment,
  type AiBrainCapabilityKey,
  type AiBrainFeature,
} from '../settings';
import { AssignmentEditor } from './AssignmentEditor';

type FeatureConfig = {
  key: AiBrainFeature;
  label: string;
  description: string;
};

type CapabilityGroup = FeatureConfig & {
  capabilities: AiBrainCapabilityKey[];
  allowsAgentFallback: boolean;
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
  {
    key: 'products',
    label: 'Products',
    description: 'Product description, translation, and validation AI execution.',
  },
  {
    key: 'image_studio',
    label: 'Image Studio',
    description: 'Image Studio generation, extraction, and analysis runtimes.',
  },
  {
    key: 'case_resolver',
    label: 'Case Resolver',
    description: 'OCR and document extraction routed through Brain.',
  },
  {
    key: 'agent_runtime',
    label: 'Agent Runtime',
    description: 'Planner, memory, and tool-routing model defaults for agent execution.',
  },
  {
    key: 'agent_teaching',
    label: 'Agent Teaching',
    description: 'Teaching chat and embedding model routing.',
  },
];

const ROUTING_GROUPS: CapabilityGroup[] = ROUTING_FEATURES.map((feature): CapabilityGroup => {
  const capabilities = BRAIN_CAPABILITY_KEYS.filter(
    (capability) => getBrainCapabilityDefinition(capability).feature === feature.key
  );
  return {
    ...feature,
    capabilities,
    allowsAgentFallback: capabilities.some(
      (capability) => getBrainCapabilityDefinition(capability).policy === 'agent-or-model'
    ),
  };
}).filter((feature) => feature.capabilities.length > 0);

const formatModelFamily = (value: string): string => value.replace(/_/g, ' ');

const providerOptionsForCapability = (
  capability: AiBrainCapabilityKey
): Array<'model' | 'agent'> =>
  getBrainCapabilityDefinition(capability).policy === 'agent-or-model'
    ? ['model', 'agent']
    : ['model'];

export function RoutingTab(): React.JSX.Element {
  const {
    settings,
    overridesEnabled,
    effectiveAssignments,
    effectiveCapabilityAssignments,
    handleDefaultChange,
    handleOverrideChange,
    handleCapabilityChange,
    toggleOverride,
    toggleCapabilityOverride,
  } = useBrain();

  return (
    <div className='space-y-4'>
      <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/30'>
        <div className='text-xs text-gray-300'>
          Capability routing is authoritative. Feature overrides below are compatibility fallbacks
          only and apply only when a capability override is not set.
        </div>
      </Card>

      <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
        <div className='mb-3'>
          <div className='text-xs font-semibold uppercase text-gray-500'>Global defaults</div>
          <div className='mt-1 text-[11px] text-gray-400'>
            Global defaults are the final fallback and remain model-only to keep runtime policy
            deterministic.
          </div>
        </div>
        <AssignmentEditor
          assignment={settings.defaults}
          onChange={handleDefaultChange}
          allowedProviders={['model']}
        />
      </Card>

      <div className='space-y-4'>
        {ROUTING_GROUPS.map((feature) => {
          const featureOverrideEnabled = overridesEnabled[feature.key];
          const featureAssignment = featureOverrideEnabled
            ? (settings.assignments[feature.key] ?? effectiveAssignments[feature.key])
            : effectiveAssignments[feature.key];

          return (
            <Card
              key={feature.key}
              variant='subtle'
              padding='md'
              className='border-border/60 bg-card/35'
            >
              <div className='space-y-4'>
                <div className='space-y-1'>
                  <div className='text-sm font-semibold text-white'>{feature.label}</div>
                  <div className='text-xs text-gray-400'>{feature.description}</div>
                </div>

                <div className='rounded-lg border border-border/60 bg-background/40 p-3'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <div className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                        Feature fallback (compatibility only)
                      </div>
                      <div className='mt-1 text-[11px] text-gray-400'>
                        Used only when a capability below does not have its own override.
                      </div>
                    </div>
                    <label className='flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer'>
                      <Checkbox
                        checked={featureOverrideEnabled}
                        onCheckedChange={(checked: boolean | 'indeterminate') =>
                          toggleOverride(feature.key, Boolean(checked))
                        }
                      />
                      Override fallback
                    </label>
                  </div>

                  <div className='mt-3'>
                    <AssignmentEditor
                      assignment={featureAssignment}
                      onChange={(next: AiBrainAssignment) =>
                        handleOverrideChange(feature.key, next)
                      }
                      readOnly={!featureOverrideEnabled}
                      allowedProviders={
                        feature.allowsAgentFallback ? ['model', 'agent'] : ['model']
                      }
                    />
                    {!featureOverrideEnabled ? (
                      <div className='mt-2 text-[11px] text-gray-500'>
                        Using global defaults as the compatibility fallback.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className='grid gap-3 xl:grid-cols-2'>
                  {feature.capabilities.map((capability) => {
                    const definition = getBrainCapabilityDefinition(capability);
                    const capabilityOverrideEnabled = Boolean(settings.capabilities[capability]);
                    const assignment = capabilityOverrideEnabled
                      ? (settings.capabilities[capability] ??
                        effectiveCapabilityAssignments[capability])
                      : effectiveCapabilityAssignments[capability];
                    const inheritanceSource = settings.capabilities[capability]
                      ? 'Capability override'
                      : settings.assignments[feature.key]
                        ? 'Feature fallback'
                        : 'Global defaults';

                    return (
                      <Card
                        key={capability}
                        variant='subtle-compact'
                        padding='md'
                        className='border-border/60 bg-background/35'
                      >
                        <div className='space-y-3'>
                          <div className='flex flex-wrap items-start justify-between gap-3'>
                            <div className='space-y-1'>
                              <div className='text-sm font-medium text-white'>
                                {definition.label}
                              </div>
                              <div className='flex flex-wrap gap-2 text-[11px] text-gray-400'>
                                <span>
                                  Allowed provider:{' '}
                                  {definition.policy === 'agent-or-model'
                                    ? 'Agent or model'
                                    : 'Model only'}
                                </span>
                                <span>Family: {formatModelFamily(definition.modelFamily)}</span>
                                <span>Source: {inheritanceSource}</span>
                              </div>
                            </div>

                            <label className='flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer'>
                              <Checkbox
                                checked={capabilityOverrideEnabled}
                                onCheckedChange={(checked: boolean | 'indeterminate') =>
                                  toggleCapabilityOverride(capability, Boolean(checked))
                                }
                              />
                              Override
                            </label>
                          </div>

                          <AssignmentEditor
                            assignment={assignment}
                            onChange={(next: AiBrainAssignment) =>
                              handleCapabilityChange(capability, next)
                            }
                            readOnly={!capabilityOverrideEnabled}
                            allowedProviders={providerOptionsForCapability(capability)}
                          />
                          {!capabilityOverrideEnabled ? (
                            <div className='text-[11px] text-gray-500'>
                              Effective values come from the compatibility fallback chain.
                            </div>
                          ) : null}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
