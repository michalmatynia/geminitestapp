import { afterEach, describe, expect, it } from 'vitest';

import { evaluateOutboundUrlPolicy } from '@/shared/lib/security/outbound-url-policy';

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

describe('evaluateOutboundUrlPolicy', () => {
  it('allows public https endpoints', () => {
    const result = evaluateOutboundUrlPolicy('https://api.openai.com/v1/responses');
    expect(result.allowed).toBe(true);
  });

  it('blocks localhost', () => {
    const result = evaluateOutboundUrlPolicy('http://localhost:3000/api/test');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('local_hostname_blocked');
  });

  it('blocks private metadata IPs', () => {
    const result = evaluateOutboundUrlPolicy('http://169.254.169.254/latest/meta-data/');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('metadata_ip_blocked');
  });

  it('blocks private RFC1918 IP ranges', () => {
    const result = evaluateOutboundUrlPolicy('http://10.10.0.2/health');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('private_ip_blocked');
  });

  it('blocks unsupported schemes', () => {
    const result = evaluateOutboundUrlPolicy('file:///etc/passwd');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('unsupported_scheme');
  });

  it('allows explicitly allowlisted hosts', () => {
    process.env['AI_PATHS_OUTBOUND_ALLOWED_HOSTS'] = 'localhost';
    const result = evaluateOutboundUrlPolicy('http://localhost:11434/api/tags');
    expect(result.allowed).toBe(true);
  });
});
