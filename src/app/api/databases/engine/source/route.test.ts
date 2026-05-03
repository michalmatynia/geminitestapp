import { describe, expect, it } from 'vitest';

import * as routeModule from './route-handler';

describe('databases engine source route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof routeModule.GET).toBe('function');
    expect(routeModule).not.toHaveProperty('POST');
  });
});
