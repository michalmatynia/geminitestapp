import { describe, expect, it } from 'vitest';

import {
  AUDIO_OSCILLATOR_INPUT_PORTS,
  SIMULATION_INPUT_PORTS,
} from '@/shared/lib/ai-paths/core/constants';
import { palette } from '@/shared/lib/ai-paths/core/definitions';

describe('ai paths definitions module', () => {
  it('imports successfully with audio and simulation port exports restored', () => {
    expect(AUDIO_OSCILLATOR_INPUT_PORTS).toContain('trigger');
    expect(SIMULATION_INPUT_PORTS).toEqual(['trigger']);
    expect(palette.some((node) => node.type === 'audio_oscillator')).toBe(true);
    expect(palette.some((node) => node.type === 'simulation')).toBe(true);
  });
});
