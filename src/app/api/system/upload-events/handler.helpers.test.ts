import { describe, expect, it } from 'vitest';

import {
  buildFileUploadEventsListInput,
  normalizeUploadEventStatusParam,
  parseUploadEventDateParam,
} from './handler.helpers';

describe('system/upload-events handler helpers', () => {
  it('normalizes supported status values and ignores unsupported ones', () => {
    expect(normalizeUploadEventStatusParam(' Success ')).toBe('success');
    expect(normalizeUploadEventStatusParam('ERROR')).toBe('error');
    expect(normalizeUploadEventStatusParam('pending')).toBeUndefined();
  });

  it('parses date params with start-of-day and end-of-day boundaries', () => {
    const start = parseUploadEventDateParam('2026-01-02');
    const end = parseUploadEventDateParam('2026-01-02', true);

    expect(start?.getFullYear()).toBe(2026);
    expect(start?.getMonth()).toBe(0);
    expect(start?.getDate()).toBe(2);
    expect(start?.getHours()).toBe(0);
    expect(start?.getMinutes()).toBe(0);

    expect(end?.getFullYear()).toBe(2026);
    expect(end?.getMonth()).toBe(0);
    expect(end?.getDate()).toBe(2);
    expect(end?.getHours()).toBe(23);
    expect(end?.getMinutes()).toBe(59);
    expect(end?.getSeconds()).toBe(59);
    expect(end?.getMilliseconds()).toBe(999);
    expect(parseUploadEventDateParam('not-a-date')).toBeNull();
  });

  it('builds upload-event list input with nullable filters', () => {
    const input = buildFileUploadEventsListInput({
      page: 2,
      pageSize: 25,
      status: undefined,
      category: undefined,
      projectId: 'project-1',
      query: undefined,
      from: '2026-01-01',
      to: '2026-01-31',
    });

    expect(input).toEqual({
      page: 2,
      pageSize: 25,
      status: null,
      category: null,
      projectId: 'project-1',
      query: null,
      from: new Date('2026-01-01T00:00:00.000'),
      to: new Date('2026-01-31T23:59:59.999'),
    });
  });
});
