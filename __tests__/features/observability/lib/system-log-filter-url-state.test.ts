import { describe, expect, it } from 'vitest';

import { SYSTEM_LOG_FILTER_DEFAULTS } from '@/features/observability/lib/log-triage-presets';
import {
  readSystemLogUrlState,
  writeSystemLogUrlState,
} from '@/features/observability/lib/system-log-filter-url-state';

describe('system-log-filter-url-state', () => {
  it('parses URL query into filter state with safe defaults', () => {
    const state = readSystemLogUrlState(
      'level=error&query=db&source=api&statusCode=500&requestId=req-1&userId=user-9&fingerprint=fp-1&category=DATABASE&from=2026-02-10T00:00:00.000Z&to=2026-02-11T23:59:59.999Z&page=3'
    );

    expect(state.level).toBe('error');
    expect(state.query).toBe('db');
    expect(state.source).toBe('api');
    expect(state.statusCode).toBe('500');
    expect(state.requestId).toBe('req-1');
    expect(state.userId).toBe('user-9');
    expect(state.fingerprint).toBe('fp-1');
    expect(state.category).toBe('DATABASE');
    expect(state.fromDate).toBe('2026-02-10');
    expect(state.toDate).toBe('2026-02-11');
    expect(state.page).toBe(3);
  });

  it('writes query by replacing managed params while preserving unknown ones', () => {
    const query = writeSystemLogUrlState('tab=overview&level=warn&page=9', {
      ...SYSTEM_LOG_FILTER_DEFAULTS,
      page: 1,
    });

    const params = new URLSearchParams(query);
    expect(params.get('tab')).toBe('overview');
    expect(params.get('level')).toBeNull();
    expect(params.get('page')).toBeNull();
  });

  it('writes normalized values and includes datetime/page params when provided', () => {
    const query = writeSystemLogUrlState('', {
      ...SYSTEM_LOG_FILTER_DEFAULTS,
      level: 'error',
      query: '  timeout  ',
      statusCode: '500abc',
      fromDate: '2026-02-10',
      toDate: '2026-02-12',
      page: 2,
    });

    const params = new URLSearchParams(query);
    expect(params.get('level')).toBe('error');
    expect(params.get('query')).toBe('timeout');
    expect(params.get('statusCode')).toBe('500');
    expect(params.get('page')).toBe('2');
    expect(params.get('from')).not.toBeNull();
    expect(params.get('to')).not.toBeNull();
  });
});
