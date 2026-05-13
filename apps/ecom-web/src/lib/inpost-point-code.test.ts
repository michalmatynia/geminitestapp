import { describe, expect, it } from 'vitest';

import { normalizeInpostPointCode } from './inpost-point-code';

describe('normalizeInpostPointCode', () => {
  it('normalizes common Paczkomat code input', () => {
    expect(normalizeInpostPointCode(' waw01a ')).toBe('WAW01A');
    expect(normalizeInpostPointCode('krk 02-b')).toBe('KRK02-B');
  });

  it('rejects empty, too-short, and unsafe values', () => {
    expect(normalizeInpostPointCode('')).toBeNull();
    expect(normalizeInpostPointCode('WA')).toBeNull();
    expect(normalizeInpostPointCode('WAW 01<script>')).toBeNull();
  });
});
