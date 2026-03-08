import { describe, expect, it } from 'vitest';
import {
  getContentType,
  parsePort,
  resolveExportFilePath,
  sanitizeRequestPath,
} from './serve-kangur-mobile-export.ts';

describe('sanitizeRequestPath', () => {
  it('normalizes the root route', () => {
    expect(sanitizeRequestPath('/')).toBe('');
  });

  it('drops parent traversal segments', () => {
    expect(sanitizeRequestPath('/foo/../profile')).toBe('profile');
  });
});

describe('resolveExportFilePath', () => {
  it('maps clean routes to html exports', () => {
    const resolved = resolveExportFilePath('/profile');
    expect(resolved).not.toBeNull();
    expect(resolved?.filePath.endsWith('/apps/mobile/dist/profile.html')).toBe(
      true,
    );
    expect(resolved?.statusCode).toBe(200);
  });

  it('falls back to the exported not-found page', () => {
    const resolved = resolveExportFilePath('/does-not-exist');
    expect(resolved).not.toBeNull();
    expect(
      resolved?.filePath.endsWith('/apps/mobile/dist/+not-found.html'),
    ).toBe(true);
    expect(resolved?.statusCode).toBe(404);
  });
});

describe('getContentType', () => {
  it('returns the expected html mime type', () => {
    expect(getContentType('/tmp/profile.html')).toBe('text/html; charset=utf-8');
  });
});

describe('parsePort', () => {
  it('uses the default port when unset', () => {
    expect(parsePort(undefined)).toBe(8081);
  });

  it('parses valid numeric ports', () => {
    expect(parsePort('9090')).toBe(9090);
  });

  it('rejects invalid values', () => {
    expect(() => parsePort('abc')).toThrow(/Invalid port/);
  });
});
