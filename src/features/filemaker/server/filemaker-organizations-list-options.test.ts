import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  DEFAULT_FILEMAKER_ORGANIZATION_SORT,
  resolveOrganizationListOptions,
} from './filemaker-organizations-list-options';

describe('resolveOrganizationListOptions', () => {
  it('defaults organization sorting to newest updates first', () => {
    expect(resolveOrganizationListOptions({}).sort).toBe(DEFAULT_FILEMAKER_ORGANIZATION_SORT);
  });

  it('accepts supported organization sort options', () => {
    expect(resolveOrganizationListOptions({ sort: 'name_asc' }).sort).toBe('name_asc');
    expect(resolveOrganizationListOptions({ sort: 'createdAt_asc' }).sort).toBe('createdAt_asc');
    expect(resolveOrganizationListOptions({ sort: 'updatedAt_desc' }).sort).toBe(
      'updatedAt_desc'
    );
    expect(resolveOrganizationListOptions({ sort: 'eventCount_desc' }).sort).toBe(
      'eventCount_desc'
    );
    expect(resolveOrganizationListOptions({ sort: 'jobListingCount_asc' }).sort).toBe(
      'jobListingCount_asc'
    );
  });

  it('falls back to newest updates first for unsupported organization sort options', () => {
    expect(resolveOrganizationListOptions({ sort: 'updatedAt_latest' }).sort).toBe(
      DEFAULT_FILEMAKER_ORGANIZATION_SORT
    );
  });
});
