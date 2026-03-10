import { describe, expect, it } from 'vitest';

import {
  DELETE_metadata_id_handler,
  GET_metadata_id_handler,
  PUT_metadata_id_handler,
} from './handler';

describe('v2 metadata by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof GET_metadata_id_handler).toBe('function');
    expect(typeof PUT_metadata_id_handler).toBe('function');
    expect(typeof DELETE_metadata_id_handler).toBe('function');
  });
});
