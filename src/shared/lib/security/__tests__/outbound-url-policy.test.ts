import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  evaluateOutboundUrlPolicy,
  fetchWithOutboundUrlPolicy,
  OutboundUrlPolicyError,
} from '@/shared/lib/security/outbound-url-policy';

const ORIGINAL_ALLOWED = process.env['AI_PATHS_OUTBOUND_ALLOWED_HOSTS'];
const ORIGINAL_DENIED = process.env['AI_PATHS_OUTBOUND_DENY_HOSTS'];

afterEach(() => {
  if (ORIGINAL_ALLOWED === undefined) {
    delete process.env['AI_PATHS_OUTBOUND_ALLOWED_HOSTS'];
  } else {
    process.env['AI_PATHS_OUTBOUND_ALLOWED_HOSTS'] = ORIGINAL_ALLOWED;
  }
  if (ORIGINAL_DENIED === undefined) {
    delete process.env['AI_PATHS_OUTBOUND_DENY_HOSTS'];
  } else {
    process.env['AI_PATHS_OUTBOUND_DENY_HOSTS'] = ORIGINAL_DENIED;
  }
});

describe('shared outbound URL policy', () => {
  it('blocks private metadata endpoint URLs', () => {
    const result = evaluateOutboundUrlPolicy('http://169.254.169.254/latest/meta-data/');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('metadata_ip_blocked');
  });

  it('blocks private IPv6 hosts, including IPv4-mapped private ranges', () => {
    expect(evaluateOutboundUrlPolicy('http://[fc00::1]/path')).toMatchObject({
      allowed: false,
      reason: 'private_ip_blocked',
    });
    expect(evaluateOutboundUrlPolicy('http://[::ffff:192.168.1.10]/path')).toMatchObject({
      allowed: false,
      reason: 'private_ip_blocked',
    });
  });

  it('follows allowed redirects', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: '/next' },
        })
      )
      .mockResolvedValueOnce(
        new Response('ok', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        })
      );

    const response = await fetchWithOutboundUrlPolicy('https://example.test/start', {
      fetchImpl: fetchMock,
      maxRedirects: 3,
      method: 'GET',
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('blocks redirect chains to disallowed hosts before second network call', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data/' },
      })
    );

    await expect(
      fetchWithOutboundUrlPolicy('https://example.test/start', {
        fetchImpl: fetchMock,
        maxRedirects: 3,
        method: 'GET',
      })
    ).rejects.toBeInstanceOf(OutboundUrlPolicyError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
