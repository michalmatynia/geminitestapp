import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchFilemakerMailJson } from '../mail-ui-helpers';

describe('fetchFilemakerMailJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws API-provided error messages for failed JSON responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Admin access is required.' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchFilemakerMailJson('/api/filemaker/mail/accounts')).rejects.toThrow(
      'Admin access is required.'
    );
  });

  it('falls back to status text when the failed response has no JSON error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('nope', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchFilemakerMailJson('/api/filemaker/mail/accounts')).rejects.toThrow(
      'Request failed (500)'
    );
  });
});
