import { describe, expect, it } from 'vitest';

import {
  DELETE_products_entity_handler,
  GET_products_entities_handler,
  GET_products_entity_handler,
  POST_products_entities_handler,
  PUT_products_entity_handler,
} from './handler';

describe('product entities handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof GET_products_entities_handler).toBe('function');
    expect(typeof POST_products_entities_handler).toBe('function');
    expect(typeof GET_products_entity_handler).toBe('function');
    expect(typeof PUT_products_entity_handler).toBe('function');
    expect(typeof DELETE_products_entity_handler).toBe('function');
  });
});
