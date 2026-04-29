import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  DEFAULT_FILEMAKER_PERSON_SORT,
  resolvePersonListOptions,
} from './filemaker-persons-list-options';

describe('resolvePersonListOptions', () => {
  it('keeps unsorted person API calls alphabetical by default', () => {
    expect(resolvePersonListOptions({}).sort).toBe(DEFAULT_FILEMAKER_PERSON_SORT);
    expect(resolvePersonListOptions({}).sort).toBe('name_asc');
  });

  it('accepts supported person sort options', () => {
    expect(resolvePersonListOptions({ sort: 'name_asc' }).sort).toBe('name_asc');
    expect(resolvePersonListOptions({ sort: 'createdAt_asc' }).sort).toBe('createdAt_asc');
    expect(resolvePersonListOptions({ sort: 'updatedAt_desc' }).sort).toBe('updatedAt_desc');
    expect(resolvePersonListOptions({ sort: 'organizationLinkCount_desc' }).sort).toBe(
      'organizationLinkCount_desc'
    );
  });

  it('falls back to alphabetical sorting for unsupported person sort options', () => {
    expect(resolvePersonListOptions({ sort: 'updatedAt_latest' }).sort).toBe(
      DEFAULT_FILEMAKER_PERSON_SORT
    );
  });
});
