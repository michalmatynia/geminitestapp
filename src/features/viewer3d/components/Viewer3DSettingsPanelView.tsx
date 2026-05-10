'use client';

import React from 'react';

import { Checkbox } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

import { SettingsRangeField } from './Viewer3DSettingsPanel.controls';
import type { Viewer3DSettingsSectionProps } from './Viewer3DSettingsPanel.types';

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
      <AutoRotateSection {...props} />
      <ControlsSection />
    </>
  );
}
