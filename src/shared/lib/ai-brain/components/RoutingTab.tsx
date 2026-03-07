'use client';

import React from 'react';

import { Card, Checkbox, CollapsibleSection, Label, StatusBadge } from '@/shared/ui';

import { useBrain } from '../context/BrainContext';
import { type AiBrainAssignment } from '../settings';
import { AssignmentEditor } from './AssignmentEditor';
import { BrainRoutingProvider } from './BrainRoutingContext';
import { BrainRoutingEditModal } from './BrainRoutingEditModal';
import { BrainRoutingTree } from './BrainRoutingTree';
import { ROUTING_GROUPS } from './brain-routing-master-tree';

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
      <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/40'>
        <div className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400'>
          Feature routing summary
        </div>
        <div className='flex flex-wrap gap-2'>
          {ROUTING_GROUPS.map((feature) => {
            const assignment = effectiveAssignments[feature.key];
            const isOverridden = overridesEnabled[feature.key];
            const hasModel = Boolean(assignment?.modelId?.trim());
            const label = hasModel ? assignment.modelId.trim() : 'inherits default';

            return (
              <div
                key={feature.key}
                className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11px]'
              >
                <span className='font-medium text-gray-100'>{feature.label}</span>
                <span className='text-gray-300'>·</span>
                <span className='text-gray-200'>{label}</span>
                <StatusBadge
                  status={isOverridden ? 'ok' : 'none'}
                  size='sm'
                  className='ml-1'
                  label={isOverridden ? 'override' : 'default'}
                />
              </div>
            );
          })}
        </div>
      </Card>

      <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/30'>
        <div className='text-xs text-gray-300'>
          Capability routing is authoritative. Use the routing list for quick enable/disable and
          route-level editing. Feature/global fallback controls are available in Advanced settings.
        </div>
      </Card>

      <Card variant='subtle' padding='md' className='border-border/60 bg-card/35'>
        <BrainRoutingProvider>
          <div className='space-y-2'>
            <div className='text-xs font-semibold uppercase text-gray-500'>Routing list</div>
            <div className='text-[11px] text-gray-400'>
              Toggle route state inline or click edit for full assignment settings.
            </div>
          </div>
          <div className='mt-3'>
            <BrainRoutingTree />
          </div>
          <BrainRoutingEditModal />
        </BrainRoutingProvider>
      </Card>

      <CollapsibleSection
        title='Advanced fallback settings'
        description='Global defaults and feature fallback overrides used when no capability override is present.'
        variant='subtle'
      >
        <div className='space-y-4'>
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
              allowedProviders={['model']}
            />
          </Card>

          <div className='grid gap-3 xl:grid-cols-2'>
            {ROUTING_GROUPS.map((feature) => {
              const featureOverrideEnabled = overridesEnabled[feature.key];
              const featureAssignment = featureOverrideEnabled
                ? (settings.assignments[feature.key] ?? effectiveAssignments[feature.key])
                : effectiveAssignments[feature.key];
              const checkboxId = `routing-feature-override-${feature.key}`;

              return (
                <Card
                  key={feature.key}
                  variant='subtle-compact'
                  padding='md'
                  className='border-border/60 bg-background/35'
                >
                  <div className='space-y-3'>
                    <div className='space-y-1'>
                      <div className='text-sm font-medium text-white'>{feature.label}</div>
                      <div className='text-[11px] text-gray-400'>{feature.description}</div>
                    </div>

                    <div className='flex items-center gap-2 text-[11px] text-gray-400'>
                      <Checkbox
                        id={checkboxId}
                        checked={featureOverrideEnabled}
                        onCheckedChange={(checked: boolean | 'indeterminate') =>
                          toggleOverride(feature.key, Boolean(checked))
                        }
                      />
                      <Label
                        htmlFor={checkboxId}
                        className='cursor-pointer text-[11px] text-gray-400'
                      >
                        Override feature fallback
                      </Label>
                    </div>

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
                      <div className='text-[11px] text-gray-500'>
                        Using global defaults as this feature fallback.
                      </div>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
