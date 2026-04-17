import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('playwright live scripter ws route', () => {
  it('returns a WebSocket upgrade required response for plain HTTP GET', async () => {
    const response = GET();

    expect(response.status).toBe(426);
    await expect(response.json()).resolves.toEqual({
      error: 'WebSocket upgrade required.',
    });
  });
});
