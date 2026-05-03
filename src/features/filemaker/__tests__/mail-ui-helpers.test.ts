import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchFilemakerMailJson } from '../mail-ui-helpers';

describe('fetchFilemakerMailJson', () => {
  afterEach(() => {
    document.cookie = 'csrf-token=; Path=/; Max-Age=0';
    vi.unstubAllGlobals();
  });

  it('adds JSON and CSRF headers to mailbox API requests', async () => {
    document.cookie = 'csrf-token=mail-csrf-token; Path=/';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accounts: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchFilemakerMailJson('/api/filemaker/mail/accounts', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const init = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('x-csrf-token')).toBe('mail-csrf-token');
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
