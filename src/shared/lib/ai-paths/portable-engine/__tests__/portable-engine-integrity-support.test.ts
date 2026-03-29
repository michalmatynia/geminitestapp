import { describe, expect, it } from 'vitest';

import { resolveEnvelopeSignatureSecrets } from '../portable-engine-integrity-support';

describe('resolveEnvelopeSignatureSecrets', () => {
  it('collects resolver, keyed, primary, and fallback secrets in order with deduping', () => {
    expect(
      resolveEnvelopeSignatureSecrets(
        {
          envelopeSignatureKeyResolver: () => [' resolver-secret ', 'shared'],
          envelopeSignatureSecretsByKeyId: { key_1: ' keyed-secret ' },
          envelopeSignatureSecret: ' shared ',
          envelopeSignatureFallbackSecrets: ['fallback-a', 'fallback-a', 'fallback-b'],
        },
        {
          phase: 'async',
          mode: 'warn',
          algorithm: 'hmac_sha256',
          keyId: 'key_1',
        }
      )
    ).toEqual(['resolver-secret', 'shared', 'keyed-secret', 'fallback-a', 'fallback-b']);
  });

  it('accepts a single resolver secret string', () => {
    expect(
      resolveEnvelopeSignatureSecrets(
        {
          envelopeSignatureKeyResolver: () => ' resolver-secret ',
        },
        {
          phase: 'sync',
          mode: 'strict',
          algorithm: 'stable_hash_v1',
          keyId: null,
        }
      )
    ).toEqual(['resolver-secret']);
  });
});
