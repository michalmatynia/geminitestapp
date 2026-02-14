import { describe, expect, it } from 'vitest';

import {
  PROMPT_EXPLODER_RGB_LITERAL_RE,
  clampRgb,
  extractRgbLiteral,
  rgbToHex,
  hexToRgb,
  replaceRgbLiteral,
} from '@/features/prompt-exploder/helpers/rgb';

describe('clampRgb', () => {
  it('clamps below 0', () => {
    expect(clampRgb(-10)).toBe(0);
  });

  it('clamps above 255', () => {
    expect(clampRgb(300)).toBe(255);
  });

  it('rounds to nearest integer', () => {
    expect(clampRgb(127.6)).toBe(128);
    expect(clampRgb(127.4)).toBe(127);
  });

  it('passes through valid values', () => {
    expect(clampRgb(128)).toBe(128);
  });
});

describe('PROMPT_EXPLODER_RGB_LITERAL_RE', () => {
  it('matches RGB literals', () => {
    expect(PROMPT_EXPLODER_RGB_LITERAL_RE.test('RGB(255,0,128)')).toBe(true);
  });

  it('matches case-insensitive', () => {
    expect(PROMPT_EXPLODER_RGB_LITERAL_RE.test('rgb(255, 0, 128)')).toBe(true);
  });

  it('does not match invalid formats', () => {
    expect(PROMPT_EXPLODER_RGB_LITERAL_RE.test('RGBA(255,0,128,1)')).toBe(false);
  });
});

describe('extractRgbLiteral', () => {
  it('extracts RGB values from text', () => {
    expect(extractRgbLiteral('color is RGB(255, 128, 0) here')).toEqual([255, 128, 0]);
  });

  it('returns null for out-of-range values that do not match regex', () => {
    // Regex only matches 1-3 digit numbers, so 300 matches but -5 does not
    expect(extractRgbLiteral('RGB(300, -5, 128)')).toBeNull();
  });

  it('clamps values within regex range', () => {
    // 999 matches (\d{1,3}) and gets clamped to 255
    expect(extractRgbLiteral('RGB(999, 0, 128)')).toEqual([255, 0, 128]);
  });

  it('returns null for no match', () => {
    expect(extractRgbLiteral('no color here')).toBeNull();
  });
});

describe('rgbToHex', () => {
  it('converts RGB to hex', () => {
    expect(rgbToHex([255, 0, 128])).toBe('#ff0080');
  });

  it('pads single-digit hex values', () => {
    expect(rgbToHex([0, 0, 0])).toBe('#000000');
  });

  it('converts white', () => {
    expect(rgbToHex([255, 255, 255])).toBe('#ffffff');
  });
});

describe('hexToRgb', () => {
  it('converts hex to RGB', () => {
    expect(hexToRgb('#ff0080')).toEqual([255, 0, 128]);
  });

  it('handles without hash', () => {
    expect(hexToRgb('ff0080')).toEqual([255, 0, 128]);
  });

  it('is case-insensitive', () => {
    expect(hexToRgb('#FF0080')).toEqual([255, 0, 128]);
  });

  it('returns null for invalid hex', () => {
    expect(hexToRgb('#xyz')).toBeNull();
    expect(hexToRgb('')).toBeNull();
    expect(hexToRgb('#12345')).toBeNull();
  });
});

describe('replaceRgbLiteral', () => {
  it('replaces RGB literal in text', () => {
    expect(replaceRgbLiteral('color RGB(0, 0, 0) end', [255, 128, 64])).toBe(
      'color RGB(255,128,64) end'
    );
  });

  it('returns original text when no match', () => {
    expect(replaceRgbLiteral('no color', [255, 0, 0])).toBe('no color');
  });
});
