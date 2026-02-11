'use client';

import React from 'react';

import { LabeledSlider } from './LabeledSlider';
import { StudioCard } from './StudioCard';
import { useMaskingState, useMaskingActions } from '../context/MaskingContext';
import { useSlotsState } from '../context/SlotsContext';
import { useUiState } from '../context/UiContext';

export function MaskControlsPanel(): React.JSX.Element {
  const { maskPreviewEnabled } = useUiState();
  const { workingSlot } = useSlotsState();
  const { maskFeather, maskThresholdSensitivity, maskEdgeSensitivity } = useMaskingState();
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
    </>
  );
}
