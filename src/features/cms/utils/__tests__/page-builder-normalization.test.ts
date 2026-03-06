import { describe, expect, it } from 'vitest';

import {
  isCmsSectionHidden,
  normalizePageZone,
} from '@/features/cms/utils/page-builder-normalization';

describe('page-builder-normalization', () => {
  it('normalizes invalid zones to template', () => {
    expect(normalizePageZone('footer')).toBe('footer');
    expect(normalizePageZone(' Template ')).toBe('template');
    expect(normalizePageZone('sidebar')).toBe('template');
  });

  it('treats only strict true as hidden after canonical cutover', () => {
    expect(isCmsSectionHidden(true)).toBe(true);
    expect(isCmsSectionHidden(false)).toBe(false);
    expect(isCmsSectionHidden('true')).toBe(false);
    expect(isCmsSectionHidden(1)).toBe(false);
    expect(isCmsSectionHidden('yes')).toBe(false);
  });
});
