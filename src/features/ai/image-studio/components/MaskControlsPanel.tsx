'use client';

import React from 'react';

import { useMaskingState, useMaskingActions } from '../context/MaskingContext';
import { useSlotsState } from '../context/SlotsContext';
import { LabeledSlider } from './LabeledSlider';
import { ShapeListPanel } from './ShapeListPanel';
import { StudioCard } from './StudioCard';

interface MaskControlsPanelProps {
  maskPreviewEnabled: boolean;
}

export function MaskControlsPanel({ maskPreviewEnabled }: MaskControlsPanelProps): React.JSX.Element {
  const { workingSlot } = useSlotsState();
  const { maskShapes, maskFeather, maskThresholdSensitivity, maskEdgeSensitivity } = useMaskingState();
  const { setMaskFeather, setMaskThresholdSensitivity, setMaskEdgeSensitivity } = useMaskingActions();

  return (
    <>
      <StudioCard className='sm:grid-cols-2'>
        <LabeledSlider
          label='Mask Feather'
          value={maskFeather}
          onChange={setMaskFeather}
          disabled={!maskPreviewEnabled}
        />
      </StudioCard>

      <StudioCard className='sm:grid-cols-2'>
        <LabeledSlider
          label='Threshold Sensitivity'
          value={maskThresholdSensitivity}
          onChange={setMaskThresholdSensitivity}
          fallbackValue={55}
          disabled={!workingSlot}
        />
        <LabeledSlider
          label='Edge Sensitivity'
          value={maskEdgeSensitivity}
          onChange={setMaskEdgeSensitivity}
          fallbackValue={55}
          disabled={!workingSlot}
        />
      </StudioCard>

      {maskShapes.length > 0 && (
        <StudioCard label='Shapes' count={maskShapes.length}>
          <ShapeListPanel />
        </StudioCard>
      )}
    </>
  );
}
