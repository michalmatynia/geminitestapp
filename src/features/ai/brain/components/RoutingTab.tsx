'use client';

import React from 'react';

import { Card } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { StatusToggle } from '@/shared/ui/forms-and-actions.public';

import { useBrain } from '../context/BrainContext';
import { type AiBrainAssignment, type AiBrainFeature } from '../settings';
import { ROUTING_GROUPS, type BrainRoutingCapabilityGroup } from './brain-routing-master-tree';
import { BrainRoutingProvider } from './BrainRoutingContext';
import { BrainRoutingEditModal } from './BrainRoutingEditModal';
import { BrainRoutingTree } from './BrainRoutingTree';
import { AdvancedFallbackSettings } from './RoutingFallbackSettings';

type FeatureAssignments = Record<AiBrainFeature, AiBrainAssignment>;
type FeatureOverrides = Record<AiBrainFeature, boolean>;
type FeatureEnabledHandler = (key: AiBrainFeature, enabled: boolean) => void;

type FeatureRoutingSummaryChipProps = {
  feature: BrainRoutingCapabilityGroup;
  assignment: AiBrainAssignment;
  isOverridden: boolean;
  saving: boolean;
  setFeatureEnabled: FeatureEnabledHandler;
};

type FeatureRoutingSummaryProps = {
  effectiveAssignments: FeatureAssignments;
  overridesEnabled: FeatureOverrides;
  saving: boolean;
  setFeatureEnabled: FeatureEnabledHandler;
};

function FeatureRoutingSummaryChip({
  feature,
  assignment,
  isOverridden,
  saving,
  setFeatureEnabled,
}: FeatureRoutingSummaryChipProps): React.JSX.Element {
  const modelId = assignment.modelId.trim();
  const label = modelId === '' ? 'inherits default' : modelId;
  const enabledLabel = assignment.enabled ? 'enabled' : 'disabled';

  return (
    <div className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11px]'>
      <span className='font-medium text-gray-100'>{feature.label}</span>
      <span className='text-gray-300'>·</span>
      <span className='text-gray-200'>{label}</span>
      <span className='text-gray-300'>·</span>
      <span className='text-gray-200'>{enabledLabel}</span>
      <StatusBadge
        status={isOverridden ? 'ok' : 'none'}
        size='sm'
        className='ml-1'
        label={isOverridden ? 'override' : 'default'}
      />
      <StatusToggle
        enabled={assignment.enabled}
        disabled={saving}
        size='sm'
        enabledLabel='ON'
        disabledLabel='OFF'
        onToggle={(nextEnabled) => setFeatureEnabled(feature.key, nextEnabled)}
        className='ml-1 shrink-0'
      />
    </div>
  );
}

function FeatureRoutingSummary({
  effectiveAssignments,
  overridesEnabled,
  saving,
  setFeatureEnabled,
}: FeatureRoutingSummaryProps): React.JSX.Element {
  return (
    <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/40'>
      <div className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400'>
        Feature routing summary
      </div>
      <div className='flex flex-wrap gap-2'>
        {ROUTING_GROUPS.map((feature) => (
          <FeatureRoutingSummaryChip
            key={feature.key}
            feature={feature}
            assignment={effectiveAssignments[feature.key]}
            isOverridden={overridesEnabled[feature.key]}
            saving={saving}
            setFeatureEnabled={setFeatureEnabled}
          />
        ))}
      </div>
    </Card>
  );
}

function RoutingNoticeCard(): React.JSX.Element {
  return (
    <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/30'>
      <div className='text-xs text-gray-300'>
        Feature switches are authoritative. Use the routing list for master on/off control, then
        fine-tune route-level overrides inside enabled features. Feature/global fallback controls
        remain available in Advanced settings.
      </div>
    </Card>
  );
}

function RoutingListCard(): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/35'>
      <BrainRoutingProvider>
        <div className='space-y-2'>
          <div className='text-xs font-semibold uppercase text-gray-500'>Routing list</div>
          <div className='text-[11px] text-gray-400'>
            Toggle features on/off inline, then use route switches or edit for full assignment
            settings.
          </div>
        </div>
        <div className='mt-3'>
          <BrainRoutingTree />
        </div>
        <BrainRoutingEditModal />
      </BrainRoutingProvider>
    </Card>
  );
}

export function RoutingTab(): React.JSX.Element {
  const {
    settings,
    overridesEnabled,
    effectiveAssignments,
    handleDefaultChange,
    handleOverrideChange,
    saving,
    setFeatureEnabled,
    toggleOverride,
  } = useBrain();

  return (
    <div className='space-y-4'>
      <FeatureRoutingSummary
        effectiveAssignments={effectiveAssignments}
        overridesEnabled={overridesEnabled}
        saving={saving}
        setFeatureEnabled={setFeatureEnabled}
      />
      <RoutingNoticeCard />
      <RoutingListCard />
      <AdvancedFallbackSettings
        settings={settings}
        overridesEnabled={overridesEnabled}
        effectiveAssignments={effectiveAssignments}
        handleDefaultChange={handleDefaultChange}
        handleOverrideChange={handleOverrideChange}
        saving={saving}
        setFeatureEnabled={setFeatureEnabled}
        toggleOverride={toggleOverride}
      />
    </div>
  );
}
