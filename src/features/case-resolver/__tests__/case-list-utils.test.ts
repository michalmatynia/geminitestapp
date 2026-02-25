import { describe, expect, it } from 'vitest';

import { buildCaseResolverCaseHref } from '@/features/case-resolver/components/list/case-list-utils';

describe('case list utilities', () => {
  it('builds case resolver href with encoded fileId', () => {
    expect(buildCaseResolverCaseHref('case-123')).toBe('/admin/case-resolver?fileId=case-123');
    expect(buildCaseResolverCaseHref('case/with space')).toBe(
      '/admin/case-resolver?fileId=case%2Fwith%20space',
    );
  });

  it('never returns template interpolation literal in href', () => {
    expect(buildCaseResolverCaseHref('case-123')).not.toContain('${encodeURIComponent(');
  });
});
