import { describe, expect, it } from 'vitest';

import {
  DELETE_templates_item_handler,
  GET_templates_handler,
  POST_templates_handler,
  PUT_templates_item_handler,
} from './handler';

describe('v2 templates handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof GET_templates_handler).toBe('function');
    expect(typeof POST_templates_handler).toBe('function');
    expect(typeof PUT_templates_item_handler).toBe('function');
    expect(typeof DELETE_templates_item_handler).toBe('function');
  });
});
