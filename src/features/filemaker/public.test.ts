import { describe, expect, it } from 'vitest';

import * as filemakerPublic from './public';

describe('filemaker public barrel', () => {
  it('exports the filemaker admin mail pages', () => {
    expect(filemakerPublic.AdminFilemakerMailPage).toBeDefined();
    expect(filemakerPublic.AdminFilemakerMailComposePage).toBeDefined();
    expect(filemakerPublic.AdminFilemakerMailThreadPage).toBeDefined();
  });
});
