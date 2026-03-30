import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SESSION_ACCENT_TONE,
  getSessionAccentTone,
} from './profile-tones';

describe('getSessionAccentTone', () => {
  it('returns a dedicated tone for mapped operations', () => {
    expect(getSessionAccentTone('addition')).toEqual({
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    });
    expect(getSessionAccentTone('logical_reasoning')).toEqual({
      backgroundColor: '#fff7ed',
      borderColor: '#fdba74',
      textColor: '#c2410c',
    });
  });

  it('falls back to the default accent tone for unknown operations', () => {
    expect(getSessionAccentTone('unknown-operation')).toEqual(DEFAULT_SESSION_ACCENT_TONE);
  });
});
