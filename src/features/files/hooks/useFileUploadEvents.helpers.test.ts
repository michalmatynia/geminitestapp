import { describe, expect, it } from 'vitest';

import { buildQueryParams } from './useFileUploadEvents.helpers';

describe('buildQueryParams', () => {
  it('includes supported non-empty filters', () => {
    expect(
      buildQueryParams({
        page: 2,
        pageSize: 50,
        status: 'error',
        category: 'images',
        projectId: 'project-1',
        query: 'cover',
        from: '2026-04-01',
        to: '2026-04-03',
      })
    ).toBe(
      'page=2&pageSize=50&status=error&category=images&projectId=project-1&query=cover&from=2026-04-01&to=2026-04-03'
    );
  });

  it('omits empty values and the all status sentinel', () => {
    expect(
      buildQueryParams({
        page: 0,
        pageSize: undefined,
        status: 'all',
        category: '',
        projectId: '',
        query: '',
        from: null,
        to: undefined,
      })
    ).toBe('');
  });
});
