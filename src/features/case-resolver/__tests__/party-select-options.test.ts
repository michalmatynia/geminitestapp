import { describe, expect, it } from 'vitest';

import { buildMissingSelectedPartyOption } from '@/features/case-resolver/components/case-resolver-party-select';

describe('case resolver party select options', () => {
  it('builds a temporary selected option for a missing person reference', () => {
    const option = buildMissingSelectedPartyOption({
      kind: 'person',
      id: 'person-123',
    });

    expect(option).toEqual({
      value: 'person:person-123',
      label: 'Person: person-123',
      description: 'Loaded from current document. Refreshing Filemaker records...',
    });
  });

  it('returns null when selected reference is missing', () => {
    expect(buildMissingSelectedPartyOption(null)).toBeNull();
  });

  it('returns null when selected reference id is blank', () => {
    const option = buildMissingSelectedPartyOption({
      kind: 'organization',
      id: '   ',
    });
    expect(option).toBeNull();
  });
});
