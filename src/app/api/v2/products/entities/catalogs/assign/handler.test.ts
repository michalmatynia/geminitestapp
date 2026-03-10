import { describe, expect, it } from 'vitest';

import { postProductsCatalogAssignHandler } from './handler';

describe('product entities catalogs assign handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof postProductsCatalogAssignHandler).toBe('function');
  });
});
