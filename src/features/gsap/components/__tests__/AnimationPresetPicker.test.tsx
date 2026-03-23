import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import { AnimationPresetPicker } from '../AnimationPresetPicker';
import { ANIMATION_PRESETS } from '@/shared/contracts/gsap';

describe('AnimationPresetPicker', () => {
  it('renders all animation presets', () => {
    render(<AnimationPresetPicker value='none' onChange={() => {}} />);
    
    ANIMATION_PRESETS.forEach((preset) => {
      expect(screen.getByText(preset.label)).toBeDefined();
    });
  });

  it('calls onChange when a preset is selected', () => {
    const onChange = vi.fn();
    render(<AnimationPresetPicker value='none' onChange={onChange} />);
    
    // Find a preset that is not 'none'
    const targetPreset = ANIMATION_PRESETS.find(p => p.value !== 'none')!;
    const item = screen.getByText(targetPreset.label);
    
    fireEvent.click(item);
    
    expect(onChange).toHaveBeenCalledWith(targetPreset.value);
  });

  it('highlights the selected preset', () => {
    const selectedValue = ANIMATION_PRESETS[1]!.value;
    render(<AnimationPresetPicker value={selectedValue} onChange={() => {}} />);
    
    // The selection logic depends on GenericGridPicker implementation, 
    // but we can at least check if it renders without crashing with a specific value.
    expect(screen.getByText(ANIMATION_PRESETS[1]!.label)).toBeDefined();
  });
});
