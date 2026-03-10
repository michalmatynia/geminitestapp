import { describe, expect, it } from 'vitest';

import { deleteImageStudioProjectHandler, patchImageStudioProjectHandler } from './handler';

describe('image-studio project-by-id handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof deleteImageStudioProjectHandler).toBe('function');
    expect(typeof patchImageStudioProjectHandler).toBe('function');
  });
});
