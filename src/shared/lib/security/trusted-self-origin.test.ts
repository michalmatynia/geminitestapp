import { describe, expect, it } from 'vitest';

import { isLoopbackHostname, resolveTrustedSelfOriginHost } from './trusted-self-origin';

describe('isLoopbackHostname', () => {
  it('normalizes bracketed IPv6 loopback hostnames', () => {
    expect(isLoopbackHostname('[::1]')).toBe(true);
  });
});

describe('resolveTrustedSelfOriginHost', () => {
  it('returns the candidate host when localhost and IPv6 loopback aliases share the same port', () => {
    expect(
      resolveTrustedSelfOriginHost({
        requestUrl: 'http://localhost:3000/api/kangur/social-image-addons/batch',
        candidateUrl: 'http://[::1]:3000/kangur/game',
      })
    ).toBe('[::1]:3000');
  });

  it('rejects loopback aliases when the port differs', () => {
    expect(
      resolveTrustedSelfOriginHost({
        requestUrl: 'http://localhost:3000/api/kangur/social-image-addons/batch',
        candidateUrl: 'http://[::1]:3001/kangur/game',
      })
    ).toBeNull();
  });
});
