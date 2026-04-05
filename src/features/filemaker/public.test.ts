import { describe, expect, it } from 'vitest';

import * as filemakerPublic from './public';

describe('filemaker public barrel', () => {
  it('exports the filemaker admin mail pages', () => {
    expect(filemakerPublic.AdminFilemakerMailPage).toBeDefined();
    expect(filemakerPublic.AdminFilemakerMailComposePage).toBeDefined();
    expect(filemakerPublic.AdminFilemakerMailThreadPage).toBeDefined();
  });

  it('exports representative public settings and types', () => {
    expect(filemakerPublic.listFilemakerPartyOptions).toBeTypeOf('function');
    expect(filemakerPublic.resolveFilemakerPartyLabel).toBeTypeOf('function');
  });
});
