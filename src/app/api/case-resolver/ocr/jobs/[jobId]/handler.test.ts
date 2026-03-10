import { describe, expect, it } from 'vitest';

import { GET_handler, POST_handler } from './handler';

describe('case-resolver ocr job by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof POST_handler).toBe('function');
  });
});
