import { describe, expect, it } from 'vitest';

import {
  deleteProductsEntityHandler,
  getProductsEntitiesHandler,
  getProductsEntityHandler,
  postProductsEntitiesHandler,
  putProductsEntityHandler,
} from './handler';

describe('product entities handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getProductsEntitiesHandler).toBe('function');
    expect(typeof postProductsEntitiesHandler).toBe('function');
    expect(typeof getProductsEntityHandler).toBe('function');
    expect(typeof putProductsEntityHandler).toBe('function');
    expect(typeof deleteProductsEntityHandler).toBe('function');
  });
});
