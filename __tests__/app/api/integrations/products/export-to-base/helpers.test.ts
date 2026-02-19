import { describe, expect, it } from 'vitest';

import { parseMappedParameterId } from '@/app/api/integrations/products/[id]/export-to-base/helpers';

describe('parseMappedParameterId', () => {
  it('parses basic parameter mappings', () => {
    expect(parseMappedParameterId('parameter:param-material')).toBe('param-material');
  });

  it('parses translated parameter mappings with language suffix', () => {
    expect(parseMappedParameterId('parameter:param-material|en')).toBe('param-material');
    expect(parseMappedParameterId('parameter:param-material|de')).toBe('param-material');
  });

  it('returns empty for non-parameter mappings', () => {
    expect(parseMappedParameterId('name')).toBe('');
    expect(parseMappedParameterId('')).toBe('');
    expect(parseMappedParameterId(undefined)).toBe('');
  });
});
