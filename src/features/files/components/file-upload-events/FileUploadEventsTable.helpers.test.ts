import { describe, expect, it } from 'vitest';

import { resolveFileUploadEventsFilterUpdate } from './FileUploadEventsTable.helpers';

describe('FileUploadEventsTable helpers', () => {
  it('normalizes valid and invalid status filter values', () => {
    expect(resolveFileUploadEventsFilterUpdate('status', 'error')).toEqual({
      key: 'status',
      value: 'error',
    });
    expect(resolveFileUploadEventsFilterUpdate('status', 'unknown')).toEqual({
      key: 'status',
      value: 'all',
    });
  });

  it('coerces text filters to strings', () => {
    expect(resolveFileUploadEventsFilterUpdate('category', 'studio')).toEqual({
      key: 'category',
      value: 'studio',
    });
    expect(resolveFileUploadEventsFilterUpdate('projectId', 42)).toEqual({
      key: 'projectId',
      value: '',
    });
  });

  it('returns null for unsupported filters', () => {
    expect(resolveFileUploadEventsFilterUpdate('query', 'value')).toBeNull();
  });
});
