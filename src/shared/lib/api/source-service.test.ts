import { describe, expect, it } from 'vitest';

import { resolveServiceFromSource } from './source-service';

describe('resolveServiceFromSource', () => {
  it('drops trailing HTTP method segments and keeps the first two base segments', () => {
    expect(resolveServiceFromSource('api.products.POST', 'fallback')).toBe('api.products');
    expect(resolveServiceFromSource('jobs.worker.heartbeat.GET', 'fallback')).toBe('jobs.worker');
  });

  it('returns the first segment when only one base segment exists', () => {
    expect(resolveServiceFromSource('api', 'fallback')).toBe('api');
  });

  it('returns the fallback when the source is empty', () => {
    expect(resolveServiceFromSource('   ', 'api.unknown')).toBe('api.unknown');
    expect(resolveServiceFromSource(undefined, 'api.error')).toBe('api.error');
  });
});
