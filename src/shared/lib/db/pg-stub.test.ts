import { describe, expect, it } from 'vitest';

import pg, { Client, Pool } from './pg-stub';

describe('pg-stub', () => {
  it('throws for both removed postgres client exports', () => {
    expect(() => new Client()).toThrow(
      'PostgreSQL support has been removed. The application is MongoDB-only.'
    );
    expect(() => new Pool()).toThrow(
      'PostgreSQL support has been removed. The application is MongoDB-only.'
    );
  });

  it('exposes the removed client constructors on the default export', () => {
    expect(pg.Client).toBe(Client);
    expect(pg.Pool).toBe(Pool);
  });
});
