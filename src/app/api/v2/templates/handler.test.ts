import { describe, expect, it } from 'vitest';

import {
  deleteTemplatesItemHandler,
  getTemplatesHandler,
  postTemplatesHandler,
  putTemplatesItemHandler,
} from './handler';

describe('v2 templates handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getTemplatesHandler).toBe('function');
    expect(typeof postTemplatesHandler).toBe('function');
    expect(typeof putTemplatesItemHandler).toBe('function');
    expect(typeof deleteTemplatesItemHandler).toBe('function');
  });
});
