import { describe, expect, it, vi } from 'vitest';

const { logClientErrorMock } = vi.hoisted(() => ({
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

import {
  buildDiffLines,
  extractCssFromResponse,
  extractJsonFromResponse,
} from './ai-helpers';

describe('page-builder ai helpers', () => {
  it('extracts css from fenced and unfenced responses', () => {
    expect(extractCssFromResponse('```css\nbody { color: red; }\n```')).toBe(
      'body { color: red; }'
    );
    expect(extractCssFromResponse('```\n.card { padding: 8px; }\n```')).toBe(
      '.card { padding: 8px; }'
    );
    expect(extractCssFromResponse('  body { margin: 0; }  ')).toBe('body { margin: 0; }');
    expect(extractCssFromResponse('   ')).toBe('');
  });

  it('extracts json objects and logs invalid payloads', () => {
    expect(extractJsonFromResponse('```json\n{"ok":true,"count":2}\n```')).toEqual({
      ok: true,
      count: 2,
    });
    expect(extractJsonFromResponse('notes before {"theme":"dark"} notes after')).toEqual({
      theme: 'dark',
    });
    expect(extractJsonFromResponse('[1,2,3]')).toBeNull();
    expect(extractJsonFromResponse('not json')).toBeNull();
    expect(logClientErrorMock).toHaveBeenCalledTimes(1);
  });

  it('builds simple line-based diffs with truncation reporting', () => {
    const diff = buildDiffLines('a\nb\nc', 'a\nx\nc\nd', 3);
    expect(diff.lines).toEqual([
      { type: 'same', text: 'a' },
      { type: 'remove', text: 'b' },
      { type: 'add', text: 'x' },
    ]);
    expect(diff.truncated).toBe(true);
  });
});
