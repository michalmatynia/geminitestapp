import { describe, expect, it } from 'vitest';

import {
  deleteMetadataIdHandler,
  getMetadataIdHandler,
  putMetadataIdHandler,
} from './handler';

describe('v2 metadata by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getMetadataIdHandler).toBe('function');
    expect(typeof putMetadataIdHandler).toBe('function');
    expect(typeof deleteMetadataIdHandler).toBe('function');
  });
});
