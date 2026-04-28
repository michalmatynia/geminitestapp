'use client';

import React from 'react';

import { StatusToggle } from '@/shared/ui/forms-and-actions.public';
import { Card, CollapsibleSection } from '@/shared/ui/primitives.public';

import {
  type AiBrainAssignment,
  type AiBrainFeature,
  type AiBrainProvider,
  type AiBrainSettings,
} from '../settings';
import { AssignmentEditor } from './AssignmentEditor';
import { ROUTING_GROUPS, type BrainRoutingCapabilityGroup } from './brain-routing-master-tree';

const MODEL_ONLY_PROVIDERS: AiBrainProvider[] = ['model'];
const AGENT_FALLBACK_PROVIDERS: AiBrainProvider[] = ['model', 'agent'];

type FeatureAssignments = Record<AiBrainFeature, AiBrainAssignment>;
type FeatureOverrides = Record<AiBrainFeature, boolean>;
type FeatureEnabledHandler = (key: AiBrainFeature, enabled: boolean) => void;
type ToggleOverrideHandler = (key: AiBrainFeature, enabled: boolean) => void;
type OverrideChangeHandler = (key: AiBrainFeature, next: AiBrainAssignment) => void;

type FeatureRoutingCardProps = {
  feature: BrainRoutingCapabilityGroup;
  assignment: AiBrainAssignment;
  isOverridden: boolean;
  saving: boolean;
  setFeatureEnabled: FeatureEnabledHandler;
  toggleOverride: ToggleOverrideHandler;
  handleOverrideChange: OverrideChangeHandler;
};

export type AdvancedFallbackSettingsProps = {
  settings: AiBrainSettings;
  overridesEnabled: FeatureOverrides;
  effectiveAssignments: FeatureAssignments;
  handleDefaultChange: (next: AiBrainAssignment) => void;
  handleOverrideChange: OverrideChangeHandler;
  saving: boolean;
  setFeatureEnabled: FeatureEnabledHandler;
  toggleOverride: ToggleOverrideHandler;
};

function getAllowedProviders(feature: BrainRoutingCapabilityGroup): AiBrainProvider[] {
  return feature.allowsAgentFallback === true ? AGENT_FALLBACK_PROVIDERS : MODEL_ONLY_PROVIDERS;
}

function getFallbackAssignment(
  settings: AiBrainSettings,
  effectiveAssignments: FeatureAssignments,
  featureKey: AiBrainFeature,
  isOverridden: boolean
): AiBrainAssignment {
  return isOverridden
    ? (settings.assignments[featureKey] ?? effectiveAssignments[featureKey])
    : effectiveAssignments[featureKey];
}

function FeatureRoutingControls({
  feature,
  assignment,
  isOverridden,
  saving,
  setFeatureEnabled,
  toggleOverride,
}: Omit<FeatureRoutingCardProps, 'handleOverrideChange'>): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-3 text-[11px] text-gray-400'>
      <div className='inline-flex items-center gap-2'>
        <span>Feature</span>
        <StatusToggle
          enabled={assignment.enabled}
          disabled={saving}
          size='sm'
          enabledLabel='ON'
          disabledLabel='OFF'
          onToggle={(nextEnabled) => setFeatureEnabled(feature.key, nextEnabled)}
        />
      </div>
      <div className='inline-flex items-center gap-2'>
        <span>Fallback override</span>
        <StatusToggle
          enabled={isOverridden}
          disabled={saving}
          size='sm'
          enabledLabel='CUSTOM'
          disabledLabel='DEFAULT'
          enabledVariant='blue'
          disabledVariant='gray'
          onToggle={(nextEnabled) => toggleOverride(feature.key, nextEnabled)}
        />
      </div>
    </div>
  );
}

function FeatureRoutingCard({
  feature,
  assignment,
  isOverridden,
  saving,
  setFeatureEnabled,
  toggleOverride,
  handleOverrideChange,
}: FeatureRoutingCardProps): React.JSX.Element {
  return (
    <Card variant='subtle-compact' padding='md' className='border-border/60 bg-background/35'>
      <div className='space-y-3'>
        <div className='space-y-1'>
          <div className='text-sm font-medium text-white'>{feature.label}</div>
          <div className='text-[11px] text-gray-400'>{feature.description}</div>
        </div>
        <FeatureRoutingControls
          feature={feature}
          assignment={assignment}
          isOverridden={isOverridden}
          saving={saving}
          setFeatureEnabled={setFeatureEnabled}
          toggleOverride={toggleOverride}
        />
        <AssignmentEditor
          assignment={assignment}
          onChange={(next) => handleOverrideChange(feature.key, next)}
          readOnly={!isOverridden}
          allowedProviders={getAllowedProviders(feature)}
        />
        {!isOverridden ? (
          <div className='text-[11px] text-gray-500'>Using global defaults.</div>
        ) : null}
        {!assignment.enabled ? (
          <div className='text-[11px] text-amber-300'>
            Feature is off. Route-level settings are preserved.
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function GlobalDefaultsCard({
  settings,
  handleDefaultChange,
}: Pick<AdvancedFallbackSettingsProps, 'settings' | 'handleDefaultChange'>): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
      <div className='mb-3'>
        <div className='text-xs font-semibold uppercase text-gray-500'>Global defaults</div>
        <div className='mt-1 text-[11px] text-gray-400'>
          Global defaults are the final fallback and remain model-only.
        </div>
      </div>
      <AssignmentEditor
        assignment={settings.defaults}
        onChange={handleDefaultChange}
        allowedProviders={MODEL_ONLY_PROVIDERS}
      />
    </Card>
  );
}

export function AdvancedFallbackSettings({
  settings,
  overridesEnabled,
  effectiveAssignments,
  handleDefaultChange,
  handleOverrideChange,
  saving,
  setFeatureEnabled,
  toggleOverride,
}: AdvancedFallbackSettingsProps): React.JSX.Element {
  return (
    <CollapsibleSection
      title='Advanced fallback settings'
      description='Global defaults and feature fallback overrides used when no capability override is present.'
      variant='subtle'
    >
      <div className='space-y-4'>
        <GlobalDefaultsCard settings={settings} handleDefaultChange={handleDefaultChange} />
        <div className='grid gap-3 xl:grid-cols-2'>
          {ROUTING_GROUPS.map((feature) => {
            const isOverridden = overridesEnabled[feature.key];
            const assignment = getFallbackAssignment(
              settings,
              effectiveAssignments,
              feature.key,
              isOverridden
            );

            return (
              <FeatureRoutingCard
                key={feature.key}
                feature={feature}
                assignment={assignment}
                isOverridden={isOverridden}
                saving={saving}
                setFeatureEnabled={setFeatureEnabled}
                toggleOverride={toggleOverride}
                handleOverrideChange={handleOverrideChange}
              />
            );
          })}
        </div>
      </div>
    </CollapsibleSection>
  );
}
