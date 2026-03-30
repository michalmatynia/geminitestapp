import type { KangurMobileTone as Tone } from '../shared/KangurMobileUi';

const VIOLET_SESSION_TONE: Tone = {
  backgroundColor: '#f5f3ff',
  borderColor: '#ddd6fe',
  textColor: '#6d28d9',
};

const INDIGO_SESSION_TONE: Tone = {
  backgroundColor: '#eef2ff',
  borderColor: '#c7d2fe',
  textColor: '#4338ca',
};

const SESSION_ACCENT_TONES: Record<string, Tone> = {
  addition: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    textColor: '#b45309',
  },
  division: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1d4ed8',
  },
  multiplication: VIOLET_SESSION_TONE,
  subtraction: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    textColor: '#be123c',
  },
  logical_thinking: VIOLET_SESSION_TONE,
  logical_patterns: INDIGO_SESSION_TONE,
  logical_classification: {
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
    textColor: '#0f766e',
  },
  logical_reasoning: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    textColor: '#c2410c',
  },
  logical_analogies: {
    backgroundColor: '#fdf2f8',
    borderColor: '#fbcfe8',
    textColor: '#be185d',
  },
};

export const DEFAULT_SESSION_ACCENT_TONE = INDIGO_SESSION_TONE;

export const getSessionAccentTone = (operation: string): Tone =>
  SESSION_ACCENT_TONES[operation] ?? DEFAULT_SESSION_ACCENT_TONE;
