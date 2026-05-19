'use client';

import { Box, Grid3X3, ImageIcon, Layers, Spline, type LucideIcon } from 'lucide-react';
import React from 'react';

import type { Asset3dRenderMode } from '@/shared/contracts/viewer3d';
import { Button, Checkbox } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

import { SettingsRangeField } from './Viewer3DSettingsPanel.controls';
import type { Viewer3DSettingsSectionProps } from './Viewer3DSettingsPanel.types';

const renderModeOptions: Array<{
  value: Asset3dRenderMode;
  label: string;
  icon: LucideIcon;
}> = [
  { value: 'textured', label: 'Textured', icon: ImageIcon },
  { value: 'solid', label: 'Solid', icon: Box },
  { value: 'wireframe', label: 'Wireframe', icon: Grid3X3 },
  { value: 'edges', label: 'Edges', icon: Spline },
  { value: 'flat', label: 'Flat', icon: Layers },
];

function RenderModeSection({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormSection title='Display mode' variant='subtle' className='p-3 space-y-3'>
      <div className='grid grid-cols-1 gap-2'>
        {renderModeOptions.map((option) => {
          const isActive = state.renderMode === option.value;
          const Icon = option.icon;

          return (
            <Button
              key={option.value}
              type='button'
              variant={isActive ? 'solid' : 'ghost'}
              size='sm'
              className={cn(
                'h-9 justify-start gap-2 px-3 text-xs',
                isActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              )}
              onClick={() => actions.setRenderMode(option.value)}
              title={`Show ${option.label.toLowerCase()} model`}
            >
              <Icon className='size-3.5' aria-hidden='true' />
              {option.label}
            </Button>
          );
        })}
      </div>
    </FormSection>
  );
}

function AutoRotateSection({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormSection title='Auto-rotate' variant='subtle' className='p-3 space-y-3' actions={<Checkbox checked={state.autoRotate} onCheckedChange={(value) => actions.setAutoRotate(Boolean(value))} />}>
      {state.autoRotate && (
        <div className='mt-2'>
          <SettingsRangeField label='Speed' value={state.autoRotateSpeed} valueLabel={state.autoRotateSpeed.toFixed(1)} min='0.5' max='10' step='0.5' onChange={actions.setAutoRotateSpeed} />
        </div>
      )}
    </FormSection>
  );
}

function ControlsSection(): React.JSX.Element {
  return (
    <FormSection title='Controls' variant='subtle-compact' className='p-3 text-xs text-gray-400 space-y-1'>
      <div className='mt-2 space-y-1'>
        <p>Left click + drag to rotate</p>
        <p>Right click + drag to pan</p>
        <p>Scroll to zoom</p>
      </div>
    </FormSection>
  );
}

export function Viewer3DViewTab(props: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <>
      <RenderModeSection {...props} />
      <AutoRotateSection {...props} />
      <ControlsSection />
    </>
  );
}
