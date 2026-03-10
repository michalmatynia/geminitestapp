import { describe, expect, it } from 'vitest';

import { POST_validator_template_handler } from './handler';

describe('validator-patterns templates handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof POST_validator_template_handler).toBe('function');
  });
});
