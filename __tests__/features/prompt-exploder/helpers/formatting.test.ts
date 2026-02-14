import { describe, expect, it } from 'vitest';

import {
  promptExploderClampNumber,
  promptExploderFormatTimestamp,
  promptExploderBenchmarkSuiteLabel,
  promptExploderSafeJsonStringify,
  promptExploderIsFiniteNumber,
  promptExploderInferParamTypeLabel,
} from '@/features/prompt-exploder/helpers/formatting';

import type { PromptExploderParamEntry } from '@/features/prompt-exploder/params-editor';

describe('promptExploderClampNumber', () => {
  it('clamps below min', () => {
    expect(promptExploderClampNumber(-5, 0, 100)).toBe(0);
  });

  it('clamps above max', () => {
    expect(promptExploderClampNumber(200, 0, 100)).toBe(100);
  });

  it('returns value within range', () => {
    expect(promptExploderClampNumber(50, 0, 100)).toBe(50);
  });

  it('handles min === max', () => {
    expect(promptExploderClampNumber(10, 5, 5)).toBe(5);
  });
});

describe('promptExploderFormatTimestamp', () => {
  it('formats valid ISO string', () => {
    const result = promptExploderFormatTimestamp('2024-01-15T12:00:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('2024-01-15T12:00:00Z');
  });

  it('returns original value for invalid date', () => {
    expect(promptExploderFormatTimestamp('not-a-date')).toBe('not-a-date');
  });

  it('returns original for empty string', () => {
    expect(promptExploderFormatTimestamp('')).toBe('');
  });
});

describe('promptExploderBenchmarkSuiteLabel', () => {
  it('returns extended for extended', () => {
    expect(promptExploderBenchmarkSuiteLabel('extended')).toBe('extended');
  });

  it('returns custom for custom', () => {
    expect(promptExploderBenchmarkSuiteLabel('custom')).toBe('custom');
  });

  it('returns default for default', () => {
    expect(promptExploderBenchmarkSuiteLabel('default')).toBe('default');
  });
});

describe('promptExploderSafeJsonStringify', () => {
  it('stringifies objects', () => {
    expect(promptExploderSafeJsonStringify({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('stringifies primitives', () => {
    expect(promptExploderSafeJsonStringify(42)).toBe('42');
    expect(promptExploderSafeJsonStringify('hello')).toBe('"hello"');
  });

  it('handles circular references gracefully', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    const result = promptExploderSafeJsonStringify(obj);
    expect(typeof result).toBe('string');
  });
});

describe('promptExploderIsFiniteNumber', () => {
  it('returns true for finite numbers', () => {
    expect(promptExploderIsFiniteNumber(42)).toBe(true);
    expect(promptExploderIsFiniteNumber(0)).toBe(true);
    expect(promptExploderIsFiniteNumber(-3.14)).toBe(true);
  });

  it('returns false for non-finite numbers', () => {
    expect(promptExploderIsFiniteNumber(Infinity)).toBe(false);
    expect(promptExploderIsFiniteNumber(NaN)).toBe(false);
  });

  it('returns false for non-numbers', () => {
    expect(promptExploderIsFiniteNumber('42')).toBe(false);
    expect(promptExploderIsFiniteNumber(null)).toBe(false);
    expect(promptExploderIsFiniteNumber(undefined)).toBe(false);
  });
});

describe('promptExploderInferParamTypeLabel', () => {
  const makeEntry = (value: unknown, kind?: string): PromptExploderParamEntry =>
    ({
      path: 'test',
      value,
      spec: kind ? { kind } : null,
      selector: 'auto',
      resolvedSelector: 'text',
      selectorOptions: [],
      recommendation: 'default',
      comment: '',
      description: '',
    }) as unknown as PromptExploderParamEntry;

  it('uses spec kind when available', () => {
    expect(promptExploderInferParamTypeLabel(makeEntry('x', 'slider'))).toBe('slider');
  });

  it('detects arrays', () => {
    expect(promptExploderInferParamTypeLabel(makeEntry([1, 2]))).toBe('array');
  });

  it('detects null', () => {
    expect(promptExploderInferParamTypeLabel(makeEntry(null))).toBe('null');
  });

  it('detects typeof for primitives', () => {
    expect(promptExploderInferParamTypeLabel(makeEntry('hello'))).toBe('string');
    expect(promptExploderInferParamTypeLabel(makeEntry(42))).toBe('number');
    expect(promptExploderInferParamTypeLabel(makeEntry(true))).toBe('boolean');
  });
});
