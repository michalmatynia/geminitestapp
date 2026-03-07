import { describe, expect, it } from 'vitest';

import {
  readSystemLogUrlState,
  writeSystemLogUrlState,
} from './system-log-filter-url-state';

describe('system log filter url state', () => {
  it('round-trips minDurationMs through managed url params', () => {
    const search = writeSystemLogUrlState('', {
      level: 'warn',
      query: 'kangur',
      source: 'kangur.progress.PATCH',
      service: '',
      method: 'PATCH',
      statusCode: '',
      minDurationMs: '750',
      requestId: '',
      traceId: '',
      correlationId: '',
      userId: '',
      fingerprint: '',
      category: '',
      fromDate: '2026-03-04',
      toDate: '2026-03-07',
      page: 2,
    });

    expect(search).toContain('minDurationMs=750');

    const parsed = readSystemLogUrlState(search);
    expect(parsed.minDurationMs).toBe('750');
    expect(parsed.method).toBe('PATCH');
    expect(parsed.page).toBe(2);
  });
});
